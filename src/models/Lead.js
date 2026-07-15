const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Lead = sequelize.define('Lead', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  title: { type: DataTypes.STRING, allowNull: false },
  description: { type: DataTypes.TEXT },

  // Contact info
  contact_name: { type: DataTypes.STRING, allowNull: false },
  contact_email: { type: DataTypes.STRING, validate: { isEmail: true } },
  contact_phone: { type: DataTypes.STRING },
  company_name: { type: DataTypes.STRING },
  company_website: { type: DataTypes.STRING },

  // Lead details
  source: {
    type: DataTypes.ENUM('website', 'referral', 'cold_call', 'email', 'social_media', 'advertisement', 'event', 'other'),
    defaultValue: 'other',
  },
  status: {
    type: DataTypes.ENUM('new', 'contacted', 'qualified', 'proposal', 'negotiation', 'won', 'lost', 'on_hold'),
    defaultValue: 'new',
  },
  priority: { type: DataTypes.ENUM('low', 'medium', 'high', 'urgent'), defaultValue: 'medium' },
  stage: { type: DataTypes.STRING, defaultValue: 'initial' },

  // Financial
  estimated_value: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
  currency: { type: DataTypes.STRING(3), defaultValue: 'INR' },
  probability: { type: DataTypes.INTEGER, defaultValue: 0, validate: { min: 0, max: 100 } },

  // Dates
  expected_close_date: { type: DataTypes.DATEONLY },
  actual_close_date: { type: DataTypes.DATEONLY },

  // Assignment
  assigned_to: { type: DataTypes.INTEGER, references: { model: 'users', key: 'id' } },
  created_by: { type: DataTypes.INTEGER, references: { model: 'users', key: 'id' } },

  // Extra
  tags: { type: DataTypes.ARRAY(DataTypes.STRING), defaultValue: [] },
  lost_reason: { type: DataTypes.TEXT },
  notes: { type: DataTypes.TEXT },
  address: { type: DataTypes.TEXT },
  city: { type: DataTypes.STRING },
  state: { type: DataTypes.STRING },
  country: { type: DataTypes.STRING },
  pincode: { type: DataTypes.STRING },
}, {
  tableName: 'leads',
});

module.exports = Lead;
