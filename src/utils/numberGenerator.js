const { Quotation, Invoice } = require('../models');

const pad = (n) => String(n).padStart(4, '0');
const year = () => new Date().getFullYear();

const generateQuotationNumber = async () => {
  const count = await Quotation.count();
  return `QT-${year()}-${pad(count + 1)}`;
};

const generateInvoiceNumber = async () => {
  const count = await Invoice.count();
  return `INV-${year()}-${pad(count + 1)}`;
};

module.exports = { generateQuotationNumber, generateInvoiceNumber };
