const { Op, fn, col, literal } = require('sequelize');
const { Lead, Invoice, Quotation, User, LeadActivity } = require('../models');
const { success } = require('../utils/response');

exports.getStats = async (req, res, next) => {
  try {
    const isAgent = req.user.role === 'agent';
    const leadWhere = isAgent ? { assigned_to: req.user.id } : {};

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);

    const [
      totalLeads,
      newLeads,
      wonLeads,
      lostLeads,
      totalRevenue,
      monthRevenue,
      lastMonthRevenue,
      pendingInvoices,
      overdueInvoices,
      totalUsers,
      recentActivities,
      leadsByStatus,
      leadsBySource,
      monthlyLeads,
    ] = await Promise.all([
      Lead.count({ where: leadWhere }),
      Lead.count({ where: { ...leadWhere, status: 'new' } }),
      Lead.count({ where: { ...leadWhere, status: 'won' } }),
      Lead.count({ where: { ...leadWhere, status: 'lost' } }),
      Lead.sum('estimated_value', { where: { ...leadWhere, status: 'won' } }),
      Lead.sum('estimated_value', { where: { ...leadWhere, status: 'won', actual_close_date: { [Op.gte]: startOfMonth } } }),
      Lead.sum('estimated_value', { where: { ...leadWhere, status: 'won', actual_close_date: { [Op.between]: [startOfLastMonth, endOfLastMonth] } } }),
      Invoice.count({ where: { status: 'sent' } }),
      Invoice.count({ where: { status: 'overdue' } }),
      isAgent ? null : User.count({ where: { is_active: true } }),
      LeadActivity.findAll({
        where: isAgent ? { user_id: req.user.id } : {},
        include: [{ model: Lead, as: 'lead', attributes: ['id', 'title'] }],
        order: [['created_at', 'DESC']],
        limit: 10,
      }),
      Lead.findAll({
        where: leadWhere,
        attributes: ['status', [fn('COUNT', col('id')), 'count']],
        group: ['status'],
        raw: true,
      }),
      Lead.findAll({
        where: leadWhere,
        attributes: ['source', [fn('COUNT', col('id')), 'count']],
        group: ['source'],
        raw: true,
      }),
      Lead.findAll({
        where: { ...leadWhere, created_at: { [Op.gte]: new Date(now.getFullYear(), now.getMonth() - 5, 1) } },
        attributes: [
          [fn('DATE_TRUNC', 'month', col('created_at')), 'month'],
          [fn('COUNT', col('id')), 'count'],
        ],
        group: [fn('DATE_TRUNC', 'month', col('created_at'))],
        order: [[fn('DATE_TRUNC', 'month', col('created_at')), 'ASC']],
        raw: true,
      }),
    ]);

    success(res, {
      data: {
        leads: { total: totalLeads, new: newLeads, won: wonLeads, lost: lostLeads },
        revenue: {
          total: totalRevenue || 0,
          thisMonth: monthRevenue || 0,
          lastMonth: lastMonthRevenue || 0,
          growth: lastMonthRevenue ? (((monthRevenue || 0) - lastMonthRevenue) / lastMonthRevenue * 100).toFixed(1) : null,
        },
        invoices: { pending: pendingInvoices, overdue: overdueInvoices },
        users: totalUsers,
        recentActivities,
        charts: { leadsByStatus, leadsBySource, monthlyLeads },
      },
    });
  } catch (err) { next(err); }
};
