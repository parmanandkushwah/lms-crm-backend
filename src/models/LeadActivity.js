const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const LeadActivity = sequelize.define('LeadActivity', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  lead_id: { type: DataTypes.INTEGER, allowNull: false, references: { model: 'leads', key: 'id' } },
  user_id: { type: DataTypes.INTEGER, allowNull: false, references: { model: 'users', key: 'id' } },
  type: {
    type: DataTypes.ENUM('note', 'call', 'email', 'meeting', 'task', 'status_change', 'file_upload', 'whatsapp'),
    allowNull: false,
  },
  title: { type: DataTypes.STRING },
  description: { type: DataTypes.TEXT },
  outcome: { type: DataTypes.ENUM('pending', 'completed', 'cancelled', 'no_answer', 'follow_up'), defaultValue: 'completed' },
  scheduled_at: { type: DataTypes.DATE },
  completed_at: { type: DataTypes.DATE },
  duration_minutes: { type: DataTypes.INTEGER },
  is_pinned: { type: DataTypes.BOOLEAN, defaultValue: false },
  metadata: { type: DataTypes.JSONB, defaultValue: {} },
}, {
  tableName: 'lead_activities',
});

module.exports = LeadActivity;
