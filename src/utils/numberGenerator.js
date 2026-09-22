const { Quotation, sequelize } = require('../models');

const pad = (n) => String(n).padStart(4, '0');
const year = () => new Date().getFullYear();

const generateQuotationNumber = async () => {
  const count = await Quotation.count();
  return `QT-${year()}-${pad(count + 1)}`;
};

const generateInvoiceNumber = async () => {
  const [[sequenceRow]] = await sequelize.query(
    "SELECT nextval('invoices_invoice_number_seq') AS number"
  );
  return `INV-${year()}-${pad(sequenceRow.number)}`;
};

module.exports = { generateQuotationNumber, generateInvoiceNumber };
