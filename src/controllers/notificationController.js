const { Notification } = require('../models');
const { success } = require('../utils/response');

exports.getAll = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, is_read } = req.query;
    const where = { user_id: req.user.id };
    if (is_read !== undefined) where.is_read = is_read === 'true';

    const { rows, count } = await Notification.findAndCountAll({
      where,
      limit: parseInt(limit),
      offset: (parseInt(page) - 1) * parseInt(limit),
      order: [['created_at', 'DESC']],
    });
    const unreadCount = await Notification.count({ where: { user_id: req.user.id, is_read: false } });
    res.status(200).json({
      success: true,
      message: 'Notifications fetched',
      data: rows,
      pagination: {
        total: count,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(count / parseInt(limit)),
      },
      unreadCount,
    });
  } catch (err) { next(err); }
};

exports.getUnreadCount = async (req, res, next) => {
  try {
    const count = await Notification.count({ where: { user_id: req.user.id, is_read: false } });
    success(res, { data: { count } });
  } catch (err) { next(err); }
};

exports.markRead = async (req, res, next) => {
  try {
    const n = await Notification.findOne({ where: { id: req.params.id, user_id: req.user.id } });
    if (!n) return res.status(404).json({ success: false, message: 'Notification not found' });
    await n.update({ is_read: true, read_at: new Date() });
    success(res, { data: n });
  } catch (err) { next(err); }
};

exports.markAllRead = async (req, res, next) => {
  try {
    await Notification.update(
      { is_read: true, read_at: new Date() },
      { where: { user_id: req.user.id, is_read: false } }
    );
    success(res, {}, 'All notifications marked as read');
  } catch (err) { next(err); }
};

exports.delete = async (req, res, next) => {
  try {
    await Notification.destroy({ where: { id: req.params.id, user_id: req.user.id } });
    success(res, {}, 'Notification deleted');
  } catch (err) { next(err); }
};
