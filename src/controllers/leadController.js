const { Op } = require('sequelize');
const { Lead, User, LeadActivity, LeadStatusHistory, LeadFile, Contact, Quotation, Invoice } = require('../models');
const { success, created, paginated } = require('../utils/response');
const { notifyLeadAssigned, notifyLeadUpdated } = require('../services/notificationService');
const audit = require('../utils/audit');

const LEAD_INCLUDE = [
  { model: User, as: 'assignee', attributes: ['id', 'name', 'email', 'avatar'] },
  { model: User, as: 'creator',  attributes: ['id', 'name', 'email'] },
];

exports.getAll = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, search, status, priority, source, assigned_to, from, to, tags } = req.query;
    const where = {};

    // Agents only see their own leads
    if (req.user.role === 'agent') where.assigned_to = req.user.id;

    if (search) where[Op.or] = [
      { title: { [Op.iLike]: `%${search}%` } },
      { contact_name: { [Op.iLike]: `%${search}%` } },
      { contact_email: { [Op.iLike]: `%${search}%` } },
      { company_name: { [Op.iLike]: `%${search}%` } },
    ];
    if (status) where.status = status;
    if (priority) where.priority = priority;
    if (source) where.source = source;
    if (assigned_to) where.assigned_to = assigned_to;
    if (from || to) {
      where.created_at = {};
      if (from) where.created_at[Op.gte] = new Date(from);
      if (to) where.created_at[Op.lte] = new Date(to);
    }
    if (tags) where.tags = { [Op.overlap]: tags.split(',') };

    const { rows, count } = await Lead.findAndCountAll({
      where,
      include: LEAD_INCLUDE,
      limit: parseInt(limit),
      offset: (parseInt(page) - 1) * parseInt(limit),
      order: [['created_at', 'DESC']],
      distinct: true,
    });
    paginated(res, rows, count, page, limit);
  } catch (err) { next(err); }
};

exports.getOne = async (req, res, next) => {
  try {
    const lead = await Lead.findByPk(req.params.id, {
      include: [
        ...LEAD_INCLUDE,
        { model: LeadActivity, as: 'activities', include: [{ model: User, as: 'user', attributes: ['id', 'name', 'avatar'] }], order: [['created_at', 'DESC']], limit: 20 },
        { model: LeadFile, as: 'files', include: [{ model: User, as: 'uploader', attributes: ['id', 'name'] }] },
        { model: Contact, as: 'contacts' },
        { model: Quotation, as: 'quotations', attributes: ['id', 'quotation_number', 'title', 'status', 'total', 'created_at'] },
        { model: Invoice, as: 'invoices', attributes: ['id', 'invoice_number', 'title', 'status', 'total', 'created_at'] },
      ],
    });
    if (!lead) return res.status(404).json({ success: false, message: 'Lead not found' });
    success(res, { data: lead });
  } catch (err) { next(err); }
};

exports.create = async (req, res, next) => {
  try {
    const lead = await Lead.create({ ...req.body, created_by: req.user.id });
    if (lead.assigned_to && lead.assigned_to !== req.user.id)
      await notifyLeadAssigned(lead.assigned_to, lead.title, lead.id);
    await audit(req, 'CREATE', 'Lead', lead.id, null, lead.toJSON(), `Created lead: ${lead.title}`);
    created(res, { data: lead }, 'Lead created');
  } catch (err) { next(err); }
};

exports.update = async (req, res, next) => {
  try {
    const lead = await Lead.findByPk(req.params.id);
    if (!lead) return res.status(404).json({ success: false, message: 'Lead not found' });
    const old = lead.toJSON();
    const prevAssignee = lead.assigned_to;

    await lead.update(req.body);

    // Notify on reassignment
    if (req.body.assigned_to && req.body.assigned_to !== prevAssignee)
      await notifyLeadAssigned(req.body.assigned_to, lead.title, lead.id);

    await audit(req, 'UPDATE', 'Lead', lead.id, old, lead.toJSON());
    success(res, { data: lead }, 'Lead updated');
  } catch (err) { next(err); }
};

exports.updateStatus = async (req, res, next) => {
  try {
    const { status, reason } = req.body;
    const lead = await Lead.findByPk(req.params.id);
    if (!lead) return res.status(404).json({ success: false, message: 'Lead not found' });

    const fromStatus = lead.status;
    await lead.update({ status, ...(status === 'won' || status === 'lost' ? { actual_close_date: new Date() } : {}) });

    await LeadStatusHistory.create({ lead_id: lead.id, changed_by: req.user.id, from_status: fromStatus, to_status: status, reason });
    await LeadActivity.create({ lead_id: lead.id, user_id: req.user.id, type: 'status_change', title: `Status changed: ${fromStatus} → ${status}`, description: reason });

    if (lead.assigned_to) await notifyLeadUpdated(lead.assigned_to, lead.title, lead.id);
    success(res, { data: lead }, 'Status updated');
  } catch (err) { next(err); }
};

exports.assign = async (req, res, next) => {
  try {
    const { assigned_to } = req.body;
    const lead = await Lead.findByPk(req.params.id);
    if (!lead) return res.status(404).json({ success: false, message: 'Lead not found' });
    await lead.update({ assigned_to });
    await notifyLeadAssigned(assigned_to, lead.title, lead.id);
    success(res, { data: lead }, 'Lead assigned');
  } catch (err) { next(err); }
};

exports.delete = async (req, res, next) => {
  try {
    const lead = await Lead.findByPk(req.params.id);
    if (!lead) return res.status(404).json({ success: false, message: 'Lead not found' });
    await audit(req, 'DELETE', 'Lead', lead.id, lead.toJSON(), null);
    await lead.destroy();
    success(res, {}, 'Lead deleted');
  } catch (err) { next(err); }
};

exports.getStats = async (req, res, next) => {
  try {
    const where = req.user.role === 'agent' ? { assigned_to: req.user.id } : {};
    const [total, byStatus, bySource, totalValue] = await Promise.all([
      Lead.count({ where }),
      Lead.findAll({ where, attributes: ['status', [Lead.sequelize.fn('COUNT', '*'), 'count']], group: ['status'], raw: true }),
      Lead.findAll({ where, attributes: ['source', [Lead.sequelize.fn('COUNT', '*'), 'count']], group: ['source'], raw: true }),
      Lead.sum('estimated_value', { where }),
    ]);
    success(res, { data: { total, byStatus, bySource, totalValue: totalValue || 0 } });
  } catch (err) { next(err); }
};
