const { Op } = require('sequelize');
const { Quotation, QuotationItem, Lead, User, Invoice, InvoiceItem } = require('../models');
const { success, created, paginated } = require('../utils/response');
const { generateQuotationNumber, generateInvoiceNumber } = require('../utils/numberGenerator');
const { sendQuotation } = require('../services/emailService');
const { notifyQuotationViewed } = require('../services/notificationService');
const audit = require('../utils/audit');

const calcTotals = (items, discountType, discountValue) => {
  // Subtotal is pre-tax (sum of line base = total - line tax). Tax is added once.
  const taxAmount = items.reduce((s, i) => s + parseFloat(i.tax_amount || 0), 0);
  const subtotal = items.reduce((s, i) => s + (parseFloat(i.total) - parseFloat(i.tax_amount || 0)), 0);
  const discountAmount = discountType === 'percentage'
    ? (subtotal * parseFloat(discountValue || 0)) / 100
    : parseFloat(discountValue || 0);
  const total = subtotal - discountAmount + taxAmount;
  return { subtotal, discountAmount, taxAmount, total };
};

const buildItems = (items) =>
  items.map((item, idx) => {
    const qty = parseFloat(item.quantity || 1);
    const price = parseFloat(item.unit_price || 0);
    const taxRate = parseFloat(item.tax_rate || 0);
    const discount = parseFloat(item.discount_value || 0);
    const base = qty * price - discount;
    const taxAmount = (base * taxRate) / 100;
    return {
      ...item,
      product_id: item.product_id ? parseInt(item.product_id) : null,
      quantity: qty,
      unit_price: price,
      tax_amount: taxAmount,
      total: base + taxAmount,
      sort_order: idx,
    };
  });

exports.getAll = async (req, res, next) => {
  try {
    const { page = 1, limit = 100, search, status } = req.query;
    const where = {};
    if (status) where.status = status;
    if (search) {
      where[Op.or] = [
        { quotation_number: { [Op.iLike]: `%${search}%` } },
        { title: { [Op.iLike]: `%${search}%` } },
      ];
    }
    // Agents only see quotations they created; admins/managers see all.
    if (req.user.role === 'agent') where.created_by = req.user.id;

    const { rows, count } = await Quotation.findAndCountAll({
      where,
      include: [
        { model: Lead, as: 'lead', attributes: ['id', 'title', 'contact_name', 'company_name'] },
        { model: User, as: 'creator', attributes: ['id', 'name'] },
      ],
      order: [['created_at', 'DESC']],
      limit: parseInt(limit),
      offset: (parseInt(page) - 1) * parseInt(limit),
    });
    paginated(res, rows, count, page, limit);
  } catch (err) { next(err); }
};

exports.getByLead = async (req, res, next) => {
  try {
    const quotations = await Quotation.findAll({
      where: { lead_id: req.params.leadId },
      include: [{ model: QuotationItem, as: 'items' }],
      order: [['created_at', 'DESC']],
    });
    success(res, { data: quotations });
  } catch (err) { next(err); }
};

exports.getOne = async (req, res, next) => {
  try {
    const q = await Quotation.findByPk(req.params.id, {
      include: [
        { model: QuotationItem, as: 'items', order: [['sort_order', 'ASC']] },
        { model: Lead, as: 'lead', attributes: ['id', 'title', 'contact_name', 'contact_email', 'company_name'] },
        { model: User, as: 'creator', attributes: ['id', 'name', 'email'] },
        { model: Invoice, as: 'invoices', include: [{ model: InvoiceItem, as: 'items' }] },
      ],
    });
    if (!q) return res.status(404).json({ success: false, message: 'Quotation not found' });
    success(res, { data: q });
  } catch (err) { next(err); }
};

exports.create = async (req, res, next) => {
  try {
    const { lead_id, title, items = [], discount_type, discount_value, valid_until, notes, terms, currency } = req.body;
    const lead = await Lead.findByPk(lead_id);
    if (!lead) return res.status(404).json({ success: false, message: 'Lead not found' });

    const quotation_number = await generateQuotationNumber();
    const builtItems = buildItems(items);
    const { subtotal, discountAmount, taxAmount, total } = calcTotals(builtItems, discount_type, discount_value);

    const q = await Quotation.create({
      lead_id, created_by: req.user.id, quotation_number, title,
      discount_type, discount_value, discount_amount: discountAmount,
      subtotal, tax_amount: taxAmount, total,
      valid_until, notes, terms, currency: currency || 'INR',
    });

    if (builtItems.length) await QuotationItem.bulkCreate(builtItems.map(i => ({ ...i, quotation_id: q.id })));
    await audit(req, 'CREATE', 'Quotation', q.id, null, q.toJSON());
    const full = await Quotation.findByPk(q.id, { include: [{ model: QuotationItem, as: 'items' }] });
    created(res, { data: full }, 'Quotation created');
  } catch (err) { next(err); }
};

exports.update = async (req, res, next) => {
  try {
    const q = await Quotation.findByPk(req.params.id);
    if (!q) return res.status(404).json({ success: false, message: 'Quotation not found' });
    if (q.status === 'accepted') return res.status(400).json({ success: false, message: 'Cannot edit accepted quotation' });

    const { items, discount_type, discount_value, ...rest } = req.body;
    if (items) {
      const builtItems = buildItems(items);
      const { subtotal, discountAmount, taxAmount, total } = calcTotals(builtItems, discount_type, discount_value);
      await QuotationItem.destroy({ where: { quotation_id: q.id } });
      await QuotationItem.bulkCreate(builtItems.map(i => ({ ...i, quotation_id: q.id })));
      await q.update({ ...rest, discount_type, discount_value, discount_amount: discountAmount, subtotal, tax_amount: taxAmount, total });
    } else {
      await q.update(rest);
    }
    success(res, { data: q }, 'Quotation updated');
  } catch (err) { next(err); }
};

exports.send = async (req, res, next) => {
  try {
    const q = await Quotation.findByPk(req.params.id, {
      include: [{ model: Lead, as: 'lead' }],
    });
    if (!q) return res.status(404).json({ success: false, message: 'Quotation not found' });

    // Mark as sent regardless of email delivery so the workflow isn't blocked
    // when SMTP is not configured. Email failures are surfaced as a warning.
    let emailWarning = null;
    if (!q.lead?.contact_email) {
      emailWarning = 'Lead has no email address; quotation marked as sent without emailing.';
    } else {
      try {
        await sendQuotation(q.lead.contact_email, q.lead.contact_name, q.quotation_number);
      } catch (mailErr) {
        emailWarning = `Quotation marked as sent, but email could not be delivered (${mailErr.message}).`;
      }
    }

    await q.update({ status: 'sent', sent_at: new Date() });
    success(res, { data: q, warning: emailWarning }, emailWarning || 'Quotation sent');
  } catch (err) { next(err); }
};

exports.markViewed = async (req, res, next) => {
  try {
    const q = await Quotation.findByPk(req.params.id, { include: [{ model: Lead, as: 'lead' }] });
    if (!q) return res.status(404).json({ success: false, message: 'Quotation not found' });
    await q.update({ status: 'viewed', viewed_at: new Date() });
    await notifyQuotationViewed(q.created_by, q.quotation_number, q.lead_id);
    success(res, { data: q }, 'Marked as viewed');
  } catch (err) { next(err); }
};

exports.convertToInvoice = async (req, res, next) => {
  try {
    const q = await Quotation.findByPk(req.params.id, {
      include: [{ model: QuotationItem, as: 'items' }],
    });
    if (!q) return res.status(404).json({ success: false, message: 'Quotation not found' });

    const invoice_number = await generateInvoiceNumber();
    // Recompute totals from the quotation's line items so the invoice is always correct,
    // even if the stored quotation totals were affected by the old double-tax bug.
    const builtItems = buildItems(q.items.map(i => (i.toJSON ? i.toJSON() : i)));
    const { subtotal, discountAmount, taxAmount, total } = calcTotals(builtItems, q.discount_type, q.discount_value);
    const inv = await Invoice.create({
      lead_id: q.lead_id, quotation_id: q.id, created_by: req.user.id,
      invoice_number, title: q.title,
      subtotal, discount_type: q.discount_type, discount_value: q.discount_value,
      discount_amount: discountAmount, tax_amount: taxAmount, total,
      balance_due: total, currency: q.currency, notes: q.notes, terms: q.terms,
      issue_date: new Date(), due_date: req.body.due_date,
    });

    await InvoiceItem.bulkCreate(q.items.map(i => ({
      invoice_id: inv.id, product_id: i.product_id, name: i.name,
      description: i.description, quantity: i.quantity, unit: i.unit,
      unit_price: i.unit_price, tax_rate: i.tax_rate, tax_amount: i.tax_amount,
      discount_value: i.discount_value, total: i.total, sort_order: i.sort_order,
    })));

    await q.update({ status: 'accepted' });
    created(res, { data: inv }, 'Invoice created from quotation');
  } catch (err) { next(err); }
};

exports.delete = async (req, res, next) => {
  try {
    const q = await Quotation.findByPk(req.params.id);
    if (!q) return res.status(404).json({ success: false, message: 'Quotation not found' });
    await q.destroy();
    success(res, {}, 'Quotation deleted');
  } catch (err) { next(err); }
};
