const { Op } = require('sequelize');
const { User } = require('../models');
const { sendWelcome } = require('../services/emailService');
const { success, created, paginated } = require('../utils/response');
const audit = require('../utils/audit');

exports.getAll = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, search, role, is_active } = req.query;
    const where = {};
    if (search) where[Op.or] = [
      { name: { [Op.iLike]: `%${search}%` } },
      { email: { [Op.iLike]: `%${search}%` } },
    ];
    if (role) where.role = role;
    if (is_active !== undefined) where.is_active = is_active === 'true';

    const { rows, count } = await User.findAndCountAll({
      where,
      limit: parseInt(limit),
      offset: (parseInt(page) - 1) * parseInt(limit),
      order: [['created_at', 'DESC']],
    });
    paginated(res, rows, count, page, limit);
  } catch (err) { next(err); }
};

exports.getOne = async (req, res, next) => {
  try {
    const user = await User.findByPk(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    success(res, { data: user });
  } catch (err) { next(err); }
};

exports.create = async (req, res, next) => {
  try {
    const { name, email, password, role, phone } = req.body;
    const user = await User.create({ name, email, password, role, phone });
    await sendWelcome(email, name, password).catch(() => {});
    await audit(req, 'CREATE', 'User', user.id, null, user.toJSON(), `Created user ${email}`);
    created(res, { data: user }, 'User created successfully');
  } catch (err) { next(err); }
};

exports.update = async (req, res, next) => {
  try {
    const user = await User.findByPk(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    const old = user.toJSON();
    const { name, email, role, phone, is_active } = req.body;
    await user.update({ name, email, role, phone, is_active });
    await audit(req, 'UPDATE', 'User', user.id, old, user.toJSON());
    success(res, { data: user }, 'User updated');
  } catch (err) { next(err); }
};

exports.toggleStatus = async (req, res, next) => {
  try {
    const user = await User.findByPk(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    await user.update({ is_active: !user.is_active });
    success(res, { data: user }, `User ${user.is_active ? 'activated' : 'deactivated'}`);
  } catch (err) { next(err); }
};

exports.resetPassword = async (req, res, next) => {
  try {
    const user = await User.findByPk(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    const newPassword = req.body.password;
    await user.update({ password: newPassword });
    success(res, {}, 'Password reset successfully');
  } catch (err) { next(err); }
};
