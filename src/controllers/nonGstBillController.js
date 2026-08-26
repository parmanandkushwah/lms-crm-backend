const { NonGstBill, sequelize } = require('../models');
const { success, error } = require('../utils/response');

exports.create = async (req, res, next) => {
  const t = await sequelize.transaction();
  try {
    const { customer_name, customer_address, customer_mobile, customer_email, items, total_amount, notes, bill_date } = req.body;
    if (!customer_name) return error(res, 'Customer name is required', 400);

    const count = await NonGstBill.count({ transaction: t });
    const bill_number = `BILL-${String(count + 1).padStart(4, '0')}`;

    const bill = await NonGstBill.create({
      bill_number,
      customer_name,
      customer_address,
      customer_mobile,
      customer_email,
      items: items || [],
      total_amount: total_amount || 0,
      notes,
      bill_date: bill_date || new Date(),
      created_by: req.user?.id,
    }, { transaction: t });

    await t.commit();
    success(res, { data: bill }, 'Bill created', 201);
  } catch (err) {
    await t.rollback();
    next(err);
  }
};

exports.getAll = async (req, res, next) => {
  try {
    const { search, limit = 50, page = 1 } = req.query;
    const where = {};
    if (search) {
      where[sequelize.Sequelize.Op.or] = [
        { customer_name: { [sequelize.Sequelize.Op.iLike]: `%${search}%` } },
        { bill_number: { [sequelize.Sequelize.Op.iLike]: `%${search}%` } },
        { customer_mobile: { [sequelize.Sequelize.Op.iLike]: `%${search}%` } },
      ];
    }
    const offset = (parseInt(page) - 1) * parseInt(limit);
    const { rows, count } = await NonGstBill.findAndCountAll({
      where,
      limit: parseInt(limit),
      offset,
      order: [['created_at', 'DESC']],
    });
    success(res, { data: rows, total: count, page: parseInt(page), limit: parseInt(limit) });
  } catch (err) { next(err); }
};

exports.getById = async (req, res, next) => {
  try {
    const bill = await NonGstBill.findByPk(req.params.id);
    if (!bill) return error(res, 'Bill not found', 404);
    success(res, { data: bill });
  } catch (err) { next(err); }
};

exports.delete = async (req, res, next) => {
  try {
    const bill = await NonGstBill.findByPk(req.params.id);
    if (!bill) return error(res, 'Bill not found', 404);
    await bill.destroy();
    success(res, null, 'Bill deleted');
  } catch (err) { next(err); }
};
