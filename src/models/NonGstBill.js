const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const NonGstBill = sequelize.define('NonGstBill', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  bill_number: { type: DataTypes.STRING, unique: true, allowNull: false },
  customer_name: { type: DataTypes.STRING, allowNull: false },
  customer_address: { type: DataTypes.TEXT },
  customer_mobile: { type: DataTypes.STRING },
  customer_email: { type: DataTypes.STRING },
  items: { type: DataTypes.JSONB, allowNull: false, defaultValue: [] },
  total_amount: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
  notes: { type: DataTypes.TEXT },
  created_by: { type: DataTypes.INTEGER, references: { model: 'users', key: 'id' } },
  bill_date: { type: DataTypes.DATEONLY, allowNull: false, defaultValue: DataTypes.NOW },
}, {
  tableName: 'non_gst_bills',
});

module.exports = NonGstBill;
