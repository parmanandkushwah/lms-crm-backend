const { Op } = require('sequelize');
const { Lead, User, LeadActivity, LeadAssignee, LeadStatusHistory, LeadFile, Contact, Quotation, Invoice } = require('../models');
const { success, created, paginated } = require('../utils/response');
const { notifyLeadAssigned, notifyLeadUpdated } = require('../services/notificationService');
const audit = require('../utils/audit');

const LEAD_INCLUDE = [
  { model: User, as: 'assignee', attributes: ['id', 'name', 'email', 'avatar'] },
  { model: User, as: 'creator',  attributes: ['id', 'name', 'email'] },
  { model: User, as: 'assignees', through: { attributes: [] }, attributes: ['id', 'name', 'email', 'avatar'] },
];

function normalizeAssigneeIds(body) {
  let ids = [];
  if (body.assigned_to_ids) {
    ids = Array.isArray(body.assigned_to_ids) ? body.assigned_to_ids : [body.assigned_to_ids];
  } else if (body.assigned_to) {
    ids = Array.isArray(body.assigned_to) ? body.assigned_to : [body.assigned_to];
  }
  return ids.map(id => parseInt(id)).filter(id => !isNaN(id));
}

async function syncAssignees(lead, assigneeIds, assignedBy) {
  if (assigneeIds.length > 0) {
    const primary = assigneeIds[0];
    if (lead.assigned_to !== primary) {
      await lead.update({ assigned_to: primary }, { fields: ['assigned_to'] });
    }
    await lead.setAssignees(assigneeIds);
    for (const uid of assigneeIds) {
      if (uid !== assignedBy) {
        await notifyLeadAssigned(uid, lead.title, lead.id);
      }
    }
  } else {
    await lead.update({ assigned_to: null }, { fields: ['assigned_to'] });
    await LeadAssignee.destroy({ where: { lead_id: lead.id } });
  }
}

exports.getAll = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, search, status, priority, source, assigned_to, from, to, tags } = req.query;
    const where = {};

    // Agents only see their own leads (primary assignee + join table)
    if (req.user.role === 'agent') {
      const agentId = parseInt(req.user.id);
      where[Op.and] = [
        Lead.sequelize.literal(`("Lead"."assigned_to" = ${agentId} OR EXISTS (SELECT 1 FROM lead_assignees la WHERE la.lead_id = "Lead".id AND la.user_id = ${agentId}))`),
      ];
    }

    if (search) {
      const phoneSearch = search.replace(/\D/g, '')
      const phoneConditions = [{ contact_phone: { [Op.iLike]: `%${search}%` } }]
      if (phoneSearch && phoneSearch !== search) {
        phoneConditions.push({ contact_phone: { [Op.iLike]: `%${phoneSearch}%` } })
      }
      where[Op.or] = [
        { title: { [Op.iLike]: `%${search}%` } },
        { contact_name: { [Op.iLike]: `%${search}%` } },
        { contact_email: { [Op.iLike]: `%${search}%` } },
        { company_name: { [Op.iLike]: `%${search}%` } },
        ...phoneConditions,
      ]
    }
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
      attributes: {
        include: [
          [Lead.sequelize.literal(`(
            SELECT la.scheduled_at FROM lead_activities la
            WHERE la.lead_id = "Lead".id
              AND la.outcome IN ('pending', 'follow_up')
              AND la.scheduled_at > NOW()
            ORDER BY la.scheduled_at ASC
            LIMIT 1
          )`), 'next_follow_date'],
        ],
      },
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
    const assigneeIds = normalizeAssigneeIds(req.body);
    const leadData = { ...req.body, created_by: req.user.id };
    delete leadData.assigned_to;
    delete leadData.assigned_to_ids;
    // Agents auto-assign to themselves when creating leads
    if (req.user.role === 'agent' && assigneeIds.length === 0) {
      assigneeIds.push(req.user.id);
    }
    if (assigneeIds.length > 0) {
      leadData.assigned_to = assigneeIds[0];
    }
    const lead = await Lead.create(leadData);
    if (assigneeIds.length > 0) {
      await lead.setAssignees(assigneeIds);
      for (const uid of assigneeIds) {
        if (uid !== req.user.id) {
          await notifyLeadAssigned(uid, lead.title, lead.id);
        }
      }
    }
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

    const assigneeIds = normalizeAssigneeIds(req.body);
    const body = { ...req.body };
    delete body.assigned_to;
    delete body.assigned_to_ids;
    if (assigneeIds.length > 0) {
      body.assigned_to = assigneeIds[0];
    }

    await lead.update(body);

    if (assigneeIds.length > 0) {
      await syncAssignees(lead, assigneeIds, req.user.id);
    }

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

    const assignees = await lead.getAssignees({ attributes: ['id'], through: { attributes: [] } });
    const uniqueAssigneeIds = [...new Set([lead.assigned_to, ...assignees.map(a => a.id)].filter(Boolean))];
    for (const uid of uniqueAssigneeIds) {
      if (uid !== req.user.id) {
        await notifyLeadUpdated(uid, lead.title, lead.id);
      }
    }
    success(res, { data: lead }, 'Status updated');
  } catch (err) { next(err); }
};

exports.assign = async (req, res, next) => {
  try {
    const assigneeIds = normalizeAssigneeIds(req.body);
    const lead = await Lead.findByPk(req.params.id);
    if (!lead) return res.status(404).json({ success: false, message: 'Lead not found' });
    if (assigneeIds.length > 0) {
      await syncAssignees(lead, assigneeIds, req.user.id);
    } else {
      await lead.update({ assigned_to: null }, { fields: ['assigned_to'] });
      await LeadAssignee.destroy({ where: { lead_id: lead.id } });
    }
    success(res, { data: lead }, 'Lead assigned');
  } catch (err) { next(err); }
};

exports.delete = async (req, res, next) => {
  try {
    const lead = await Lead.findByPk(req.params.id);
    if (!lead) return res.status(404).json({ success: false, message: 'Lead not found' });
    await audit(req, 'DELETE', 'Lead', lead.id, lead.toJSON(), null);
    await LeadAssignee.destroy({ where: { lead_id: lead.id } });
    await lead.destroy();
    success(res, {}, 'Lead deleted');
  } catch (err) { next(err); }
};

exports.getStats = async (req, res, next) => {
  try {
    let where = {};
    if (req.user.role === 'agent') {
      const agentId = parseInt(req.user.id);
      where[Op.and] = [
        Lead.sequelize.literal(`("Lead"."assigned_to" = ${agentId} OR EXISTS (SELECT 1 FROM lead_assignees la WHERE la.lead_id = "Lead".id AND la.user_id = ${agentId}))`),
      ];
    }
    const [total, byStatus, bySource, totalValue] = await Promise.all([
      Lead.count({ where }),
      Lead.findAll({ where, attributes: ['status', [Lead.sequelize.fn('COUNT', '*'), 'count']], group: ['status'], raw: true }),
      Lead.findAll({ where, attributes: ['source', [Lead.sequelize.fn('COUNT', '*'), 'count']], group: ['source'], raw: true }),
      Lead.sum('estimated_value', { where }),
    ]);
    success(res, { data: { total, byStatus, bySource, totalValue: totalValue || 0 } });
  } catch (err) { next(err); }
};
