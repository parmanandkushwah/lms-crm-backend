const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Notification = sequelize.define('Notification', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  user_id: { type: DataTypes.INTEGER, allowNull: false, references: { model: 'users', key: 'id' } },
  title: { type: DataTypes.STRING, allowNull: false },
  message: { type: DataTypes.TEXT, allowNull: false },
  type: {
    type: DataTypes.ENUM('lead_assigned', 'lead_updated', 'task_due', 'quotation_viewed', 'invoice_paid', 'mention', 'system'),
    defaultValue: 'system',
  },
  is_read: { type: DataTypes.BOOLEAN, defaultValue: false },
  read_at: { type: DataTypes.DATE },
  link: { type: DataTypes.STRING },
  metadata: { type: DataTypes.JSONB, defaultValue: {} },
}, {
  tableName: 'notifications',
});

module.exports = Notification;
