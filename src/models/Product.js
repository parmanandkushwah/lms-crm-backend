const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Product = sequelize.define('Product', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  created_by: { type: DataTypes.INTEGER, references: { model: 'users', key: 'id' } },
  name: { type: DataTypes.STRING, allowNull: false },
  code: { type: DataTypes.STRING, unique: true },
  description: { type: DataTypes.TEXT },
  category: { type: DataTypes.STRING },
  unit: { type: DataTypes.STRING, defaultValue: 'piece' },
  price: { type: DataTypes.DECIMAL(15, 2), allowNull: false, defaultValue: 0 },
  tax_rate: { type: DataTypes.DECIMAL(5, 2), defaultValue: 0 },
  currency: { type: DataTypes.STRING(3), defaultValue: 'INR' },
  is_active: { type: DataTypes.BOOLEAN, defaultValue: true },
  image: { type: DataTypes.STRING },
  hsn_code: { type: DataTypes.STRING },
}, {
  tableName: 'products',
});

module.exports = Product;
