const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const QuotationItem = sequelize.define('QuotationItem', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  quotation_id: { type: DataTypes.INTEGER, allowNull: false, references: { model: 'quotations', key: 'id' } },
  product_id: { type: DataTypes.INTEGER, references: { model: 'products', key: 'id' } },
  name: { type: DataTypes.STRING, allowNull: false },
  description: { type: DataTypes.TEXT },
  quantity: { type: DataTypes.DECIMAL(10, 2), allowNull: false, defaultValue: 1 },
  unit: { type: DataTypes.STRING, defaultValue: 'piece' },
  unit_price: { type: DataTypes.DECIMAL(15, 2), allowNull: false, defaultValue: 0 },
  tax_rate: { type: DataTypes.DECIMAL(5, 2), defaultValue: 0 },
  tax_amount: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
  discount_value: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
  total: { type: DataTypes.DECIMAL(15, 2), allowNull: false, defaultValue: 0 },
  sort_order: { type: DataTypes.INTEGER, defaultValue: 0 },
}, {
  tableName: 'quotation_items',
});

module.exports = QuotationItem;
