const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const LeadStatusHistory = sequelize.define('LeadStatusHistory', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  lead_id: { type: DataTypes.INTEGER, allowNull: false, references: { model: 'leads', key: 'id' } },
  changed_by: { type: DataTypes.INTEGER, allowNull: false, references: { model: 'users', key: 'id' } },
  from_status: { type: DataTypes.STRING },
  to_status: { type: DataTypes.STRING, allowNull: false },
  reason: { type: DataTypes.TEXT },
}, {
  tableName: 'lead_status_history',
});

module.exports = LeadStatusHistory;
