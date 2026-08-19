const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const LeadAssignee = sequelize.define('LeadAssignee', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  lead_id: { type: DataTypes.INTEGER, allowNull: false, references: { model: 'leads', key: 'id' } },
  user_id: { type: DataTypes.INTEGER, allowNull: false, references: { model: 'users', key: 'id' } },
  assigned_by: { type: DataTypes.INTEGER, references: { model: 'users', key: 'id' } },
}, {
  tableName: 'lead_assignees',
  timestamps: true,
  indexes: [
    { unique: true, fields: ['lead_id', 'user_id'] },
  ],
});

module.exports = LeadAssignee;
