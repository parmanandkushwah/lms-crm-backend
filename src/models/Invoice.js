const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Invoice = sequelize.define('Invoice', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  lead_id: { type: DataTypes.INTEGER, allowNull: false, references: { model: 'leads', key: 'id' } },
  quotation_id: { type: DataTypes.INTEGER, references: { model: 'quotations', key: 'id' } },
  created_by: { type: DataTypes.INTEGER, allowNull: false, references: { model: 'users', key: 'id' } },
  invoice_number: { type: DataTypes.STRING, unique: true, allowNull: false },
  title: { type: DataTypes.STRING, allowNull: false },
  status: {
    type: DataTypes.ENUM('draft', 'sent', 'viewed', 'paid', 'partial', 'overdue', 'cancelled'),
    defaultValue: 'draft',
  },
  issue_date: { type: DataTypes.DATEONLY, allowNull: false },
  due_date: { type: DataTypes.DATEONLY },
  subtotal: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
  discount_type: { type: DataTypes.ENUM('percentage', 'fixed'), defaultValue: 'percentage' },
  discount_value: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
  discount_amount: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
  tax_amount: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
  total: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
  paid_amount: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
  balance_due: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
  currency: { type: DataTypes.STRING(3), defaultValue: 'INR' },
  payment_method: { type: DataTypes.STRING },
  payment_date: { type: DataTypes.DATEONLY },
  notes: { type: DataTypes.TEXT },
  terms: { type: DataTypes.TEXT },
  file_path: { type: DataTypes.STRING },
  sent_at: { type: DataTypes.DATE },
}, {
  tableName: 'invoices',
});

module.exports = Invoice;
