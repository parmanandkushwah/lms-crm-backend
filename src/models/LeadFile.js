const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const LeadFile = sequelize.define('LeadFile', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  lead_id: { type: DataTypes.INTEGER, allowNull: false, references: { model: 'leads', key: 'id' } },
  uploaded_by: { type: DataTypes.INTEGER, allowNull: false, references: { model: 'users', key: 'id' } },
  original_name: { type: DataTypes.STRING, allowNull: false },
  file_name: { type: DataTypes.STRING, allowNull: false },
  file_path: { type: DataTypes.STRING, allowNull: false },
  file_type: { type: DataTypes.STRING },
  file_size: { type: DataTypes.INTEGER },
  category: { type: DataTypes.ENUM('document', 'image', 'contract', 'proposal', 'other'), defaultValue: 'document' },
  description: { type: DataTypes.TEXT },
}, {
  tableName: 'lead_files',
});

module.exports = LeadFile;
