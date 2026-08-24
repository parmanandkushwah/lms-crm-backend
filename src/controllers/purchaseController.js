const { Op } = require('sequelize');
const { Purchase, PurchaseItem, Product, User } = require('../models');
const { success, created, paginated } = require('../utils/response');
const audit = require('../utils/audit');

const calcTotals = (items, discountType, discountValue) => {
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

const INCLUDE = [
  { model: PurchaseItem, as: 'items', order: [['sort_order', 'ASC']], include: [{ model: Product, as: 'product' }] },
  { model: User, as: 'creator', attributes: ['id', 'name'] },
];

exports.getAll = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, status, payment_status, search, from, to } = req.query;
    const where = {};
    if (status) where.status = status;
    if (payment_status) where.payment_status = payment_status;
    if (from || to) {
      where.bill_date = {};
      if (from) where.bill_date[Op.gte] = from;
      if (to) where.bill_date[Op.lte] = to;
    }
    if (search) {
      where[Op.or] = [
        { supplier_name: { [Op.iLike]: `%${search}%` } },
        { bill_number: { [Op.iLike]: `%${search}%` } },
      ];
    }
    if (req.user.role === 'agent') where.created_by = req.user.id;

    const { rows, count } = await Purchase.findAndCountAll({
      where,
      include: [{ model: User, as: 'creator', attributes: ['id', 'name'] }],
      limit: parseInt(limit),
      offset: (parseInt(page) - 1) * parseInt(limit),
      order: [['bill_date', 'DESC']],
      distinct: true,
    });
    paginated(res, rows, count, page, limit);
  } catch (err) { next(err); }
};

exports.getOne = async (req, res, next) => {
  try {
    const p = await Purchase.findByPk(req.params.id, { include: INCLUDE });
    if (!p) return res.status(404).json({ success: false, message: 'Purchase not found' });
    success(res, { data: p });
  } catch (err) { next(err); }
};

exports.getItems = async (req, res, next) => {
  try {
    const items = await PurchaseItem.findAll({
      include: [{ model: Product, as: 'product' }],
      order: [['created_at', 'DESC']],
      limit: 100,
    });
    success(res, { data: items });
  } catch (err) { next(err); }
};

exports.create = async (req, res, next) => {
  try {
    const {
      supplier_name, supplier_gstin, supplier_address,
      bill_number, bill_date, due_date,
      items = [], discount_type, discount_value,
      notes, currency,
    } = req.body;

    const builtItems = buildItems(items);
    const { subtotal, discountAmount, taxAmount, total } = calcTotals(builtItems, discount_type, discount_value);

    const p = await Purchase.create({
      supplier_name, supplier_gstin, supplier_address,
      bill_number, bill_date, due_date,
      discount_type, discount_value, discount_amount: discountAmount,
      subtotal, tax_amount: taxAmount, total, balance_due: total,
      notes, currency: currency || 'INR',
      created_by: req.user.id,
    });

    if (builtItems.length) await PurchaseItem.bulkCreate(builtItems.map(i => ({ ...i, purchase_id: p.id })));
    await audit(req, 'CREATE', 'Purchase', p.id, null, p.toJSON());
    const full = await Purchase.findByPk(p.id, { include: INCLUDE });
    created(res, { data: full }, 'Purchase created');
  } catch (err) { next(err); }
};

exports.update = async (req, res, next) => {
  try {
    const p = await Purchase.findByPk(req.params.id);
    if (!p) return res.status(404).json({ success: false, message: 'Purchase not found' });
    if (['paid', 'cancelled'].includes(p.status))
      return res.status(400).json({ success: false, message: 'Cannot edit paid or cancelled purchase' });

    const { items, discount_type, discount_value, ...rest } = req.body;
    if (items) {
      const builtItems = buildItems(items);
      const { subtotal, discountAmount, taxAmount, total } = calcTotals(builtItems, discount_type, discount_value);
      await PurchaseItem.destroy({ where: { purchase_id: p.id } });
      await PurchaseItem.bulkCreate(builtItems.map(i => ({ ...i, purchase_id: p.id })));
      await p.update({ ...rest, discount_type, discount_value, discount_amount: discountAmount, subtotal, tax_amount: taxAmount, total, balance_due: total - parseFloat(p.paid_amount || 0) });
    } else {
      await p.update(rest);
    }
    success(res, { data: p }, 'Purchase updated');
  } catch (err) { next(err); }
};

exports.recordPayment = async (req, res, next) => {
  try {
    const { amount, payment_date } = req.body;
    const p = await Purchase.findByPk(req.params.id);
    if (!p) return res.status(404).json({ success: false, message: 'Purchase not found' });

    const paid = parseFloat(p.paid_amount || 0) + parseFloat(amount);
    const balance = parseFloat(p.total) - paid;
    const payment_status = balance <= 0 ? 'paid' : 'partial';
    const status = balance <= 0 ? 'paid' : p.status;

    await p.update({ paid_amount: paid, balance_due: Math.max(0, balance), payment_status, status, payment_date });
    success(res, { data: p }, 'Payment recorded');
  } catch (err) { next(err); }
};

exports.cancel = async (req, res, next) => {
  try {
    const p = await Purchase.findByPk(req.params.id);
    if (!p) return res.status(404).json({ success: false, message: 'Purchase not found' });
    await p.update({ status: 'cancelled' });
    success(res, { data: p }, 'Purchase cancelled');
  } catch (err) { next(err); }
};

exports.delete = async (req, res, next) => {
  try {
    const p = await Purchase.findByPk(req.params.id);
    if (!p) return res.status(404).json({ success: false, message: 'Purchase not found' });
    await p.destroy();
    success(res, {}, 'Purchase deleted');
  } catch (err) { next(err); }
};
