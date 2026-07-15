const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const AuditLog = sequelize.define('AuditLog', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  user_id: { type: DataTypes.INTEGER, references: { model: 'users', key: 'id' } },
  action: { type: DataTypes.STRING, allowNull: false },
  entity: { type: DataTypes.STRING, allowNull: false },
  entity_id: { type: DataTypes.INTEGER },
  old_values: { type: DataTypes.JSONB },
  new_values: { type: DataTypes.JSONB },
  ip_address: { type: DataTypes.STRING },
  user_agent: { type: DataTypes.TEXT },
  description: { type: DataTypes.TEXT },
}, {
  tableName: 'audit_logs',
  updatedAt: false,
});

module.exports = AuditLog;
