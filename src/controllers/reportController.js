const { Op, fn, col } = require('sequelize');
const { Lead, Invoice, User, LeadActivity } = require('../models');
const { success } = require('../utils/response');

exports.leadsReport = async (req, res, next) => {
  try {
    const { from, to, assigned_to, status, source } = req.query;
    const where = {};
    if (from || to) {
      where.created_at = {};
      if (from) where.created_at[Op.gte] = new Date(from);
      if (to) where.created_at[Op.lte] = new Date(to);
    }
    if (assigned_to) where.assigned_to = assigned_to;
    if (status) where.status = status;
    if (source) where.source = source;
    if (req.user.role === 'agent') where.assigned_to = req.user.id;

    const leads = await Lead.findAll({
      where,
      include: [{ model: User, as: 'assignee', attributes: ['id', 'name'] }],
      order: [['created_at', 'DESC']],
    });
    success(res, { data: leads });
  } catch (err) { next(err); }
};

exports.revenueReport = async (req, res, next) => {
  try {
    const { from, to } = req.query;
    const where = {};
    if (from || to) {
      where.issue_date = {};
      if (from) where.issue_date[Op.gte] = new Date(from);
      if (to) where.issue_date[Op.lte] = new Date(to);
    }

    const [invoices, byStatus, monthly] = await Promise.all([
      Invoice.findAll({
        where,
        include: [{ model: Lead, as: 'lead', attributes: ['id', 'title', 'contact_name'] }],
        order: [['issue_date', 'DESC']],
      }),
      Invoice.findAll({
        where,
        attributes: ['status', [fn('SUM', col('total')), 'total'], [fn('COUNT', col('id')), 'count']],
        group: ['status'],
        raw: true,
      }),
      Invoice.findAll({
        where,
        attributes: [
          [fn('DATE_TRUNC', 'month', col('issue_date')), 'month'],
          [fn('SUM', col('total')), 'total'],
          [fn('SUM', col('paid_amount')), 'paid'],
        ],
        group: [fn('DATE_TRUNC', 'month', col('issue_date'))],
        order: [[fn('DATE_TRUNC', 'month', col('issue_date')), 'ASC']],
        raw: true,
      }),
    ]);
    success(res, { data: { invoices, byStatus, monthly } });
  } catch (err) { next(err); }
};

exports.employeeMetrics = async (req, res, next) => {
  try {
    const { from, to } = req.query;
    const dateWhere = {};
    if (from || to) {
      dateWhere.created_at = {};
      if (from) dateWhere.created_at[Op.gte] = new Date(from);
      if (to) dateWhere.created_at[Op.lte] = new Date(to);
    }

    const [totalResult, wonResult, revenueResult] = await Promise.all([
      Lead.findAll({
        where: dateWhere,
        attributes: ['assigned_to', [fn('COUNT', col('id')), 'leads']],
        group: ['assigned_to'],
        raw: true,
      }),
      Lead.findAll({
        where: { ...dateWhere, status: 'won' },
        attributes: ['assigned_to', [fn('COUNT', col('id')), 'won']],
        group: ['assigned_to'],
        raw: true,
      }),
      Lead.findAll({
        where: { ...dateWhere, status: 'won' },
        attributes: ['assigned_to', [fn('SUM', col('estimated_value')), 'revenue']],
        group: ['assigned_to'],
        raw: true,
      }),
    ]);

    const metrics = {};
    totalResult.forEach(r => {
      const uid = r.assigned_to
      if (!uid) return
      metrics[uid] = { leads: parseInt(r.leads) || 0, won: 0, revenue: 0 }
    })
    wonResult.forEach(r => {
      const uid = r.assigned_to
      if (!uid) return
      if (!metrics[uid]) metrics[uid] = { leads: 0, won: 0, revenue: 0 }
      metrics[uid].won = parseInt(r.won) || 0
    })
    revenueResult.forEach(r => {
      const uid = r.assigned_to
      if (!uid) return
      if (!metrics[uid]) metrics[uid] = { leads: 0, won: 0, revenue: 0 }
      metrics[uid].revenue = parseFloat(r.revenue) || 0
    })

    success(res, { data: metrics });
  } catch (err) { next(err); }
};

exports.agentPerformance = async (req, res, next) => {
  try {
    const { from, to } = req.query;
    const dateWhere = {};
    if (from || to) {
      dateWhere.created_at = {};
      if (from) dateWhere.created_at[Op.gte] = new Date(from);
      if (to) dateWhere.created_at[Op.lte] = new Date(to);
    }

    const agents = await User.findAll({ where: { role: 'agent', is_active: true } });
    const performance = await Promise.all(agents.map(async (agent) => {
      const [total, won, lost, activities] = await Promise.all([
        Lead.count({ where: { ...dateWhere, assigned_to: agent.id } }),
        Lead.count({ where: { ...dateWhere, assigned_to: agent.id, status: 'won' } }),
        Lead.count({ where: { ...dateWhere, assigned_to: agent.id, status: 'lost' } }),
        LeadActivity.count({ where: { ...dateWhere, user_id: agent.id } }),
      ]);
      return { agent: { id: agent.id, name: agent.name, email: agent.email }, total, won, lost, activities, winRate: total ? ((won / total) * 100).toFixed(1) : 0 };
    }));
    success(res, { data: performance });
  } catch (err) { next(err); }
};
