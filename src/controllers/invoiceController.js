const { Invoice, InvoiceItem, Lead, User, Quotation } = require('../models');
const { success, created } = require('../utils/response');
const { generateInvoiceNumber } = require('../utils/numberGenerator');
const { sendInvoice } = require('../services/emailService');
const { notifyInvoicePaid } = require('../services/notificationService');
const audit = require('../utils/audit');

const calcTotals = (items, discountType, discountValue) => {
  // Subtotal is pre-tax (sum of line base = total - line tax). Tax is added once.
  const taxAmount = items.reduce((s, i) => s + parseFloat(i.tax_amount || 0), 0);
  const subtotal = items.reduce((s, i) => s + (parseFloat(i.total) - parseFloat(i.tax_amount || 0)), 0);
  const discountAmount = discountType === 'percentage'
    ? (subtotal * parseFloat(discountValue || 0)) / 100
    : parseFloat(discountValue || 0);
  const afterDiscount = subtotal - discountAmount;
  const total = afterDiscount + taxAmount;
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
    return { ...item, quantity: qty, unit_price: price, tax_amount: taxAmount, total: base + taxAmount, sort_order: idx };
  });

const INCLUDE = [
  { model: InvoiceItem, as: 'items', order: [['sort_order', 'ASC']] },
  { model: Lead, as: 'lead', attributes: ['id', 'title', 'contact_name', 'contact_email', 'company_name', 'address', 'city', 'state', 'pincode'] },
  { model: User, as: 'creator', attributes: ['id', 'name', 'email'] },
];

exports.getByLead = async (req, res, next) => {
  try {
    const invoices = await Invoice.findAll({
      where: { lead_id: req.params.leadId },
      include: [{ model: InvoiceItem, as: 'items' }],
      order: [['created_at', 'DESC']],
    });
    success(res, { data: invoices });
  } catch (err) { next(err); }
};

exports.getAll = async (req, res, next) => {
  try {
    const { Op } = require('sequelize');
    const { page = 1, limit = 20, status, from, to } = req.query;
    const where = {};
    if (status) where.status = status;
    if (from || to) {
      where.issue_date = {};
      if (from) where.issue_date[Op.gte] = from;
      if (to) where.issue_date[Op.lte] = to;
    }
    const { rows, count } = await Invoice.findAndCountAll({
      where,
      include: [{ model: Lead, as: 'lead', attributes: ['id', 'title', 'contact_name'] }],
      limit: parseInt(limit),
      offset: (parseInt(page) - 1) * parseInt(limit),
      order: [['created_at', 'DESC']],
      distinct: true,
    });
    const { paginated } = require('../utils/response');
    paginated(res, rows, count, page, limit);
  } catch (err) { next(err); }
};

exports.getOne = async (req, res, next) => {
  try {
    const inv = await Invoice.findByPk(req.params.id, { include: INCLUDE });
    if (!inv) return res.status(404).json({ success: false, message: 'Invoice not found' });
    success(res, { data: inv });
  } catch (err) { next(err); }
};

exports.create = async (req, res, next) => {
  try {
    const { lead_id, title, items = [], discount_type, discount_value, due_date, notes, terms, currency } = req.body;
    const lead = await Lead.findByPk(lead_id);
    if (!lead) return res.status(404).json({ success: false, message: 'Lead not found' });

    const invoice_number = await generateInvoiceNumber();
    const builtItems = buildItems(items);
    const { subtotal, discountAmount, taxAmount, total } = calcTotals(builtItems, discount_type, discount_value);

    const inv = await Invoice.create({
      lead_id, created_by: req.user.id, invoice_number, title,
      discount_type, discount_value, discount_amount: discountAmount,
      subtotal, tax_amount: taxAmount, total, balance_due: total,
      issue_date: new Date(), due_date, notes, terms, currency: currency || 'INR',
    });

    if (builtItems.length) await InvoiceItem.bulkCreate(builtItems.map(i => ({ ...i, invoice_id: inv.id })));
    await audit(req, 'CREATE', 'Invoice', inv.id, null, inv.toJSON());
    const full = await Invoice.findByPk(inv.id, { include: INCLUDE });
    created(res, { data: full }, 'Invoice created');
  } catch (err) { next(err); }
};

exports.update = async (req, res, next) => {
  try {
    const inv = await Invoice.findByPk(req.params.id);
    if (!inv) return res.status(404).json({ success: false, message: 'Invoice not found' });
    if (['paid', 'cancelled'].includes(inv.status))
      return res.status(400).json({ success: false, message: 'Cannot edit paid or cancelled invoice' });

    const { items, discount_type, discount_value, ...rest } = req.body;
    if (items) {
      const builtItems = buildItems(items);
      const { subtotal, discountAmount, taxAmount, total } = calcTotals(builtItems, discount_type, discount_value);
      await InvoiceItem.destroy({ where: { invoice_id: inv.id } });
      await InvoiceItem.bulkCreate(builtItems.map(i => ({ ...i, invoice_id: inv.id })));
      await inv.update({ ...rest, discount_type, discount_value, discount_amount: discountAmount, subtotal, tax_amount: taxAmount, total, balance_due: total - parseFloat(inv.paid_amount || 0) });
    } else {
      await inv.update(rest);
    }
    success(res, { data: inv }, 'Invoice updated');
  } catch (err) { next(err); }
};

exports.send = async (req, res, next) => {
  try {
    const inv = await Invoice.findByPk(req.params.id, { include: [{ model: Lead, as: 'lead' }] });
    if (!inv) return res.status(404).json({ success: false, message: 'Invoice not found' });
    await sendInvoice(inv.lead.contact_email, inv.lead.contact_name, inv.invoice_number);
    await inv.update({ status: 'sent', sent_at: new Date() });
    success(res, { data: inv }, 'Invoice sent');
  } catch (err) { next(err); }
};

exports.recordPayment = async (req, res, next) => {
  try {
    const { amount, payment_method, payment_date } = req.body;
    const inv = await Invoice.findByPk(req.params.id);
    if (!inv) return res.status(404).json({ success: false, message: 'Invoice not found' });

    const paid = parseFloat(inv.paid_amount || 0) + parseFloat(amount);
    const balance = parseFloat(inv.total) - paid;
    const status = balance <= 0 ? 'paid' : 'partial';

    await inv.update({ paid_amount: paid, balance_due: Math.max(0, balance), status, payment_method, payment_date });
    if (status === 'paid') await notifyInvoicePaid(inv.created_by, inv.invoice_number, inv.lead_id);
    success(res, { data: inv }, 'Payment recorded');
  } catch (err) { next(err); }
};

exports.cancel = async (req, res, next) => {
  try {
    const inv = await Invoice.findByPk(req.params.id);
    if (!inv) return res.status(404).json({ success: false, message: 'Invoice not found' });
    await inv.update({ status: 'cancelled' });
    success(res, { data: inv }, 'Invoice cancelled');
  } catch (err) { next(err); }
};

exports.delete = async (req, res, next) => {
  try {
    const inv = await Invoice.findByPk(req.params.id);
    if (!inv) return res.status(404).json({ success: false, message: 'Invoice not found' });
    await inv.destroy();
    success(res, {}, 'Invoice deleted');
  } catch (err) { next(err); }
};
