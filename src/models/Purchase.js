const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Purchase = sequelize.define('Purchase', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  supplier_name: { type: DataTypes.STRING, allowNull: false },
  supplier_gstin: { type: DataTypes.STRING },
  supplier_address: { type: DataTypes.TEXT },
  bill_number: { type: DataTypes.STRING, allowNull: false },
  bill_date: { type: DataTypes.DATEONLY, allowNull: false },
  due_date: { type: DataTypes.DATEONLY },
  status: {
    type: DataTypes.ENUM('draft', 'received', 'paid', 'partially_paid', 'cancelled'),
    defaultValue: 'draft',
  },
  payment_status: {
    type: DataTypes.ENUM('unpaid', 'partial', 'paid'),
    defaultValue: 'unpaid',
  },
  subtotal: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
  discount_type: { type: DataTypes.ENUM('percentage', 'fixed'), defaultValue: 'percentage' },
  discount_value: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
  discount_amount: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
  tax_amount: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
  total: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
  paid_amount: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
  balance_due: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
  currency: { type: DataTypes.STRING(3), defaultValue: 'INR' },
  notes: { type: DataTypes.TEXT },
  file_path: { type: DataTypes.STRING },
  created_by: { type: DataTypes.INTEGER, references: { model: 'users', key: 'id' } },
}, {
  tableName: 'purchases',
});

module.exports = Purchase;
