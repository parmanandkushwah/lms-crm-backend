const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Contact = sequelize.define('Contact', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  lead_id: { type: DataTypes.INTEGER, references: { model: 'leads', key: 'id' } },
  created_by: { type: DataTypes.INTEGER, references: { model: 'users', key: 'id' } },
  name: { type: DataTypes.STRING, allowNull: false },
  email: { type: DataTypes.STRING, validate: { isEmail: true } },
  phone: { type: DataTypes.STRING },
  designation: { type: DataTypes.STRING },
  company: { type: DataTypes.STRING },
  is_primary: { type: DataTypes.BOOLEAN, defaultValue: false },
  notes: { type: DataTypes.TEXT },
  avatar: { type: DataTypes.STRING },
  linkedin: { type: DataTypes.STRING },
  whatsapp: { type: DataTypes.STRING },
}, {
  tableName: 'contacts',
});

module.exports = Contact;
