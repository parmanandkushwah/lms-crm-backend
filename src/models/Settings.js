const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Settings = sequelize.define('Settings', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  category: { type: DataTypes.STRING, allowNull: false, unique: true },
  data: { type: DataTypes.JSONB, defaultValue: {} },
}, {
  tableName: 'settings',
});

module.exports = Settings;
