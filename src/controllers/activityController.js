const { LeadActivity, User, Lead } = require('../models');
const { success, created, paginated } = require('../utils/response');

exports.getByLead = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, type } = req.query;
    const where = { lead_id: req.params.leadId };
    if (type) where.type = type;

    const { rows, count } = await LeadActivity.findAndCountAll({
      where,
      include: [{ model: User, as: 'user', attributes: ['id', 'name', 'avatar'] }],
      limit: parseInt(limit),
      offset: (parseInt(page) - 1) * parseInt(limit),
      order: [['created_at', 'DESC']],
    });
    paginated(res, rows, count, page, limit);
  } catch (err) { next(err); }
};

exports.create = async (req, res, next) => {
  try {
    const lead = await Lead.findByPk(req.params.leadId);
    if (!lead) return res.status(404).json({ success: false, message: 'Lead not found' });

    const activity = await LeadActivity.create({
      ...req.body,
      lead_id: req.params.leadId,
      user_id: req.user.id,
    });
    const full = await LeadActivity.findByPk(activity.id, {
      include: [{ model: User, as: 'user', attributes: ['id', 'name', 'avatar'] }],
    });
    created(res, { data: full }, 'Activity logged');
  } catch (err) { next(err); }
};

exports.update = async (req, res, next) => {
  try {
    const activity = await LeadActivity.findByPk(req.params.id);
    if (!activity) return res.status(404).json({ success: false, message: 'Activity not found' });
    if (activity.user_id !== req.user.id && req.user.role === 'agent')
      return res.status(403).json({ success: false, message: 'Not allowed' });
    await activity.update(req.body);
    success(res, { data: activity }, 'Activity updated');
  } catch (err) { next(err); }
};

exports.delete = async (req, res, next) => {
  try {
    const activity = await LeadActivity.findByPk(req.params.id);
    if (!activity) return res.status(404).json({ success: false, message: 'Activity not found' });
    if (activity.user_id !== req.user.id && req.user.role === 'agent')
      return res.status(403).json({ success: false, message: 'Not allowed' });
    await activity.destroy();
    success(res, {}, 'Activity deleted');
  } catch (err) { next(err); }
};

exports.pin = async (req, res, next) => {
  try {
    const activity = await LeadActivity.findByPk(req.params.id);
    if (!activity) return res.status(404).json({ success: false, message: 'Activity not found' });
    await activity.update({ is_pinned: !activity.is_pinned });
    success(res, { data: activity }, `Activity ${activity.is_pinned ? 'pinned' : 'unpinned'}`);
  } catch (err) { next(err); }
};

exports.getFollowUps = async (req, res, next) => {
  try {
    const { Op } = require('sequelize');
    const { outcome, type } = req.query;
    const where = {
      scheduled_at: { [Op.ne]: null },
      type: { [Op.in]: ['call', 'email', 'meeting', 'whatsapp', 'task'] },
      outcome: outcome === 'completed' ? 'completed' : { [Op.in]: ['pending', 'follow_up'] },
    };
    if (type) where.type = type;
    // Agents only see their own follow-ups; admins/managers see all.
    if (req.user.role === 'agent') where.user_id = req.user.id;

    const items = await LeadActivity.findAll({
      where,
      include: [
        { model: User, as: 'user', attributes: ['id', 'name', 'avatar'] },
        { model: Lead, as: 'lead', attributes: ['id', 'title', 'contact_name', 'company_name', 'contact_email', 'contact_phone'] },
      ],
      order: outcome === 'completed' ? [['completed_at', 'DESC']] : [['scheduled_at', 'ASC']],
      limit: 500,
    });
    success(res, { data: items });
  } catch (err) { next(err); }
};

exports.getTasks = async (req, res, next) => {
  try {
    const { Op } = require('sequelize');
    const { search } = req.query;
    const where = { type: 'task' };
    // Agents only see tasks they created; admins/managers see all.
    if (req.user.role === 'agent') where.user_id = req.user.id;
    if (search) where.title = { [Op.iLike]: `%${search}%` };

    const tasks = await LeadActivity.findAll({
      where,
      include: [
        { model: User, as: 'user', attributes: ['id', 'name', 'avatar'] },
        { model: Lead, as: 'lead', attributes: ['id', 'title', 'contact_name'] },
      ],
      order: [['scheduled_at', 'ASC'], ['created_at', 'DESC']],
      limit: 500,
    });
    success(res, { data: tasks });
  } catch (err) { next(err); }
};

exports.getCalendar = async (req, res, next) => {
  try {
    const { Op } = require('sequelize');
    const { start, end } = req.query;
    const where = {
      scheduled_at: { [Op.ne]: null },
      type: { [Op.in]: ['call', 'email', 'meeting', 'whatsapp', 'task'] },
    };
    // Restrict to the requested window when provided.
    if (start || end) {
      where.scheduled_at = {
        [Op.ne]: null,
        ...(start ? { [Op.gte]: new Date(start) } : {}),
        ...(end ? { [Op.lte]: new Date(end) } : {}),
      };
    }
    // Agents only see their own events; admins/managers see all.
    if (req.user.role === 'agent') where.user_id = req.user.id;

    const items = await LeadActivity.findAll({
      where,
      include: [
        { model: User, as: 'user', attributes: ['id', 'name', 'avatar'] },
        { model: Lead, as: 'lead', attributes: ['id', 'title', 'contact_name', 'company_name'] },
      ],
      order: [['scheduled_at', 'ASC']],
      limit: 1000,
    });
    success(res, { data: items });
  } catch (err) { next(err); }
};

exports.getUpcoming = async (req, res, next) => {
  try {
    const { Op } = require('sequelize');
    const where = {
      user_id: req.user.id,
      outcome: { [Op.in]: ['pending', 'follow_up'] },
      scheduled_at: { [Op.gte]: new Date() },
    };
    const tasks = await LeadActivity.findAll({
      where,
      include: [{ model: Lead, as: 'lead', attributes: ['id', 'title', 'contact_name'] }],
      order: [['scheduled_at', 'ASC']],
      limit: 20,
    });
    success(res, { data: tasks });
  } catch (err) { next(err); }
};
