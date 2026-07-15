const { Op } = require('sequelize');
const { Product } = require('../models');
const { success, created, paginated } = require('../utils/response');

exports.getAll = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, search, category, is_active } = req.query;
    const where = {};
    if (search) where[Op.or] = [
      { name: { [Op.iLike]: `%${search}%` } },
      { code: { [Op.iLike]: `%${search}%` } },
    ];
    if (category) where.category = category;
    if (is_active !== undefined) where.is_active = is_active === 'true';

    const { rows, count } = await Product.findAndCountAll({
      where,
      limit: parseInt(limit),
      offset: (parseInt(page) - 1) * parseInt(limit),
      order: [['name', 'ASC']],
    });
    paginated(res, rows, count, page, limit);
  } catch (err) { next(err); }
};

exports.getOne = async (req, res, next) => {
  try {
    const product = await Product.findByPk(req.params.id);
    if (!product) return res.status(404).json({ success: false, message: 'Product not found' });
    success(res, { data: product });
  } catch (err) { next(err); }
};

exports.create = async (req, res, next) => {
  try {
    const product = await Product.create({ ...req.body, created_by: req.user.id });
    created(res, { data: product }, 'Product created');
  } catch (err) { next(err); }
};

exports.update = async (req, res, next) => {
  try {
    const product = await Product.findByPk(req.params.id);
    if (!product) return res.status(404).json({ success: false, message: 'Product not found' });
    await product.update(req.body);
    success(res, { data: product }, 'Product updated');
  } catch (err) { next(err); }
};

exports.delete = async (req, res, next) => {
  try {
    const product = await Product.findByPk(req.params.id);
    if (!product) return res.status(404).json({ success: false, message: 'Product not found' });
    await product.destroy();
    success(res, {}, 'Product deleted');
  } catch (err) { next(err); }
};
