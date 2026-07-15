const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Quotation = sequelize.define('Quotation', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  lead_id: { type: DataTypes.INTEGER, allowNull: false, references: { model: 'leads', key: 'id' } },
  created_by: { type: DataTypes.INTEGER, allowNull: false, references: { model: 'users', key: 'id' } },
  quotation_number: { type: DataTypes.STRING, unique: true, allowNull: false },
  title: { type: DataTypes.STRING, allowNull: false },
  status: {
    type: DataTypes.ENUM('draft', 'sent', 'viewed', 'accepted', 'rejected', 'expired', 'revised'),
    defaultValue: 'draft',
  },
  valid_until: { type: DataTypes.DATEONLY },
  subtotal: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
  discount_type: { type: DataTypes.ENUM('percentage', 'fixed'), defaultValue: 'percentage' },
  discount_value: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
  discount_amount: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
  tax_amount: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
  total: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
  currency: { type: DataTypes.STRING(3), defaultValue: 'INR' },
  notes: { type: DataTypes.TEXT },
  terms: { type: DataTypes.TEXT },
  file_path: { type: DataTypes.STRING },
  sent_at: { type: DataTypes.DATE },
  viewed_at: { type: DataTypes.DATE },
}, {
  tableName: 'quotations',
});

module.exports = Quotation;
