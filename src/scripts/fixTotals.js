// One-time backfill: recompute stored Quotation/Invoice totals (and line item
// tax_amount/total) from their line items using the corrected pre-tax logic.
// Run with: node src/scripts/fixTotals.js   (from backend/)

const path = require('path');
require('dotenv').config();
const models = require('../models');
const { sequelize, Quotation, QuotationItem, Invoice, InvoiceItem } = models;

const computeItem = (it) => {
  const qty = parseFloat(it.quantity) || 0;
  const price = parseFloat(it.unit_price) || 0;
  const taxRate = parseFloat(it.tax_rate) || 0;
  const discount = parseFloat(it.discount_value) || 0;
  const base = qty * price - discount;
  const taxAmount = (base * taxRate) / 100;
  return { base, taxAmount, total: base + taxAmount };
};

const computeTotals = (items, discountType, discountValue) => {
  const taxAmount = items.reduce((s, i) => s + (parseFloat(i.tax_amount) || 0), 0);
  const subtotal = items.reduce((s, i) => s + (parseFloat(i.total) - (parseFloat(i.tax_amount) || 0)), 0);
  const discountAmount = discountType === 'percentage'
    ? (subtotal * (parseFloat(discountValue) || 0)) / 100
    : (parseFloat(discountValue) || 0);
  const total = subtotal - discountAmount + taxAmount;
  return { subtotal, discountAmount, taxAmount, total };
};

const asPlain = (i) => (typeof i.toJSON === 'function' ? i.toJSON() : i);

async function fixQuotations() {
  const rows = await Quotation.findAll({ include: [{ model: QuotationItem, as: 'items' }] });
  let updated = 0;
  for (const q of rows) {
    const plain = q.items.map(asPlain);
    const computed = plain.map(computeItem);
    for (let idx = 0; idx < q.items.length; idx++) {
      const c = computed[idx];
      if (Number(q.items[idx].tax_amount) !== Number(c.taxAmount) || Number(q.items[idx].total) !== Number(c.total)) {
        await q.items[idx].update({ tax_amount: c.taxAmount, total: c.total });
      }
    }
    const t = computeTotals(plain, q.discount_type, q.discount_value);
    if (Number(q.subtotal) !== Number(t.subtotal) || Number(q.total) !== Number(t.total)) {
      await q.update({ subtotal: t.subtotal, discount_amount: t.discountAmount, tax_amount: t.taxAmount, total: t.total });
      updated++;
    }
  }
  return updated;
}

async function fixInvoices() {
  const rows = await Invoice.findAll({ include: [{ model: InvoiceItem, as: 'items' }] });
  let updated = 0;
  for (const inv of rows) {
    const plain = inv.items.map(asPlain);
    const computed = plain.map(computeItem);
    for (let idx = 0; idx < inv.items.length; idx++) {
      const c = computed[idx];
      if (Number(inv.items[idx].tax_amount) !== Number(c.taxAmount) || Number(inv.items[idx].total) !== Number(c.total)) {
        await inv.items[idx].update({ tax_amount: c.taxAmount, total: c.total });
      }
    }
    const t = computeTotals(plain, inv.discount_type, inv.discount_value);
    const paid = parseFloat(inv.paid_amount) || 0;
    const balance = Math.max(0, t.total - paid);
    if (Number(inv.subtotal) !== Number(t.subtotal) || Number(inv.total) !== Number(t.total) || Number(inv.balance_due) !== Number(balance)) {
      await inv.update({ subtotal: t.subtotal, discount_amount: t.discountAmount, tax_amount: t.taxAmount, total: t.total, balance_due: balance });
      updated++;
    }
  }
  return updated;
}

(async () => {
  try {
    await sequelize.authenticate();
    const q = await fixQuotations();
    const i = await fixInvoices();
    console.log(`Done. Updated ${q} quotation(s) and ${i} invoice(s).`);
    process.exit(0);
  } catch (err) {
    console.error('Backfill failed:', err);
    process.exit(1);
  }
})();
