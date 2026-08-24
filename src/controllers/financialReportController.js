const { Op, fn, col } = require('sequelize');
const { Invoice, InvoiceItem, Purchase, PurchaseItem, Lead } = require('../models');
const { success } = require('../utils/response');

exports.getFinancialSummary = async (req, res, next) => {
  try {
    const { from, to } = req.query;
    const dateFilter = (field) => {
      const where = {};
      if (from || to) {
        where[field] = {};
        if (from) where[field][Op.gte] = new Date(from);
        if (to) where[field][Op.lte] = new Date(to);
      }
      return where;
    };

    const invoiceWhere = dateFilter('issue_date');
    const purchaseWhere = dateFilter('bill_date');
    const paidInvoiceWhere = { ...dateFilter('issue_date'), status: 'paid' };

    if (req.user.role === 'agent') {
      invoiceWhere.created_by = req.user.id;
      purchaseWhere.created_by = req.user.id;
      paidInvoiceWhere.created_by = req.user.id;
    }

    const [invoices, purchases, monthlySales, monthlyPurchases] = await Promise.all([
      Invoice.findAll({ where: paidInvoiceWhere }),
      Purchase.findAll({ where: purchaseWhere }),
      Invoice.findAll({
        where: paidInvoiceWhere,
        attributes: [
          [fn('DATE_TRUNC', 'month', col('issue_date')), 'month'],
          [fn('SUM', col('total')), 'total'],
          [fn('SUM', col('tax_amount')), 'tax'],
          [fn('SUM', col('subtotal')), 'subtotal'],
          [fn('SUM', col('paid_amount')), 'paid'],
          [fn('COUNT', col('id')), 'count'],
        ],
        group: [fn('DATE_TRUNC', 'month', col('issue_date'))],
        order: [[fn('DATE_TRUNC', 'month', col('issue_date')), 'ASC']],
        raw: true,
      }),
      Purchase.findAll({
        where: purchaseWhere,
        attributes: [
          [fn('DATE_TRUNC', 'month', col('bill_date')), 'month'],
          [fn('SUM', col('total')), 'total'],
          [fn('SUM', col('tax_amount')), 'tax'],
          [fn('SUM', col('subtotal')), 'subtotal'],
          [fn('SUM', col('paid_amount')), 'paid'],
          [fn('COUNT', col('id')), 'count'],
        ],
        group: [fn('DATE_TRUNC', 'month', col('bill_date'))],
        order: [[fn('DATE_TRUNC', 'month', col('bill_date')), 'ASC']],
        raw: true,
      }),
    ]);

    const totalSales = invoices.reduce((s, i) => s + parseFloat(i.total || 0), 0);
    const totalSalesTax = invoices.reduce((s, i) => s + parseFloat(i.tax_amount || 0), 0);
    const totalSalesPaid = invoices.reduce((s, i) => s + parseFloat(i.paid_amount || 0), 0);
    const totalSalesPending = invoices.reduce((s, i) => s + parseFloat(i.balance_due || 0), 0);

    const totalPurchases = purchases.reduce((s, p) => s + parseFloat(p.total || 0), 0);
    const totalPurchaseTax = purchases.reduce((s, p) => s + parseFloat(p.tax_amount || 0), 0);
    const totalPurchasesPaid = purchases.reduce((s, p) => s + parseFloat(p.paid_amount || 0), 0);
    const totalPurchasesPending = purchases.reduce((s, p) => s + parseFloat(p.balance_due || 0), 0);

    const outputGST = totalSalesTax;
    const inputGST = totalPurchaseTax;
    const netGST = outputGST - inputGST;

    success(res, {
      data: {
        sales: {
          total: totalSales,
          tax: totalSalesTax,
          paid: totalSalesPaid,
          pending: totalSalesPending,
          count: invoices.length,
        },
        purchases: {
          total: totalPurchases,
          tax: totalPurchaseTax,
          paid: totalPurchasesPaid,
          pending: totalPurchasesPending,
          count: purchases.length,
        },
        gst: {
          output: outputGST,
          input: inputGST,
          net: netGST,
          payable: netGST > 0 ? netGST : 0,
          credit: netGST < 0 ? Math.abs(netGST) : 0,
        },
        profit: {
          gross: totalSales - totalPurchases,
          net: totalSales - totalPurchases - Math.max(0, netGST),
        },
        monthly: {
          sales: monthlySales.map(m => ({
            month: m.month,
            total: parseFloat(m.total) || 0,
            tax: parseFloat(m.tax) || 0,
            subtotal: parseFloat(m.subtotal) || 0,
            paid: parseFloat(m.paid) || 0,
            count: parseInt(m.count) || 0,
          })),
          purchases: monthlyPurchases.map(m => ({
            month: m.month,
            total: parseFloat(m.total) || 0,
            tax: parseFloat(m.tax) || 0,
            subtotal: parseFloat(m.subtotal) || 0,
            paid: parseFloat(m.paid) || 0,
            count: parseInt(m.count) || 0,
          })),
        },
      },
    });
  } catch (err) { next(err); }
};

exports.getSalesRegister = async (req, res, next) => {
  try {
    const { from, to, status } = req.query;
    const where = {};
    if (status) where.status = status;
    if (from || to) {
      where.issue_date = {};
      if (from) where.issue_date[Op.gte] = new Date(from);
      if (to) where.issue_date[Op.lte] = new Date(to);
    }
    if (req.user.role === 'agent') where.created_by = req.user.id;

    const invoices = await Invoice.findAll({
      where,
      include: [{ model: Lead, as: 'lead', attributes: ['id', 'contact_name', 'company_name'] }],
      order: [['issue_date', 'DESC']],
    });

    const data = invoices.map(inv => ({
      id: inv.id,
      invoice_number: inv.invoice_number,
      lead_name: inv.lead?.contact_name || '—',
      company: inv.lead?.company_name || '—',
      date: inv.issue_date,
      subtotal: parseFloat(inv.subtotal) || 0,
      tax_amount: parseFloat(inv.tax_amount) || 0,
      total: parseFloat(inv.total) || 0,
      paid: parseFloat(inv.paid_amount) || 0,
      balance: parseFloat(inv.balance_due) || 0,
      status: inv.status,
    }));

    success(res, { data });
  } catch (err) { next(err); }
};

exports.getPurchaseRegister = async (req, res, next) => {
  try {
    const { from, to, status } = req.query;
    const where = {};
    if (status) where.status = status;
    if (from || to) {
      where.bill_date = {};
      if (from) where.bill_date[Op.gte] = new Date(from);
      if (to) where.bill_date[Op.lte] = new Date(to);
    }
    if (req.user.role === 'agent') where.created_by = req.user.id;

    const purchases = await Purchase.findAll({
      where,
      order: [['bill_date', 'DESC']],
    });

    const data = purchases.map(p => ({
      id: p.id,
      bill_number: p.bill_number,
      supplier: p.supplier_name,
      gstin: p.supplier_gstin || '—',
      date: p.bill_date,
      subtotal: parseFloat(p.subtotal) || 0,
      tax_amount: parseFloat(p.tax_amount) || 0,
      total: parseFloat(p.total) || 0,
      paid: parseFloat(p.paid_amount) || 0,
      balance: parseFloat(p.balance_due) || 0,
      payment_status: p.payment_status,
    }));

    success(res, { data });
  } catch (err) { next(err); }
};
