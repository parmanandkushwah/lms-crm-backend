const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Document = sequelize.define('Document', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  title: { type: DataTypes.STRING, allowNull: false },
  original_name: { type: DataTypes.STRING, allowNull: false },
  file_name: { type: DataTypes.STRING, allowNull: false },
  file_path: { type: DataTypes.STRING, allowNull: false },
  file_type: { type: DataTypes.STRING },
  file_size: { type: DataTypes.INTEGER },
  category: {
    type: DataTypes.ENUM('document', 'contract', 'proposal', 'spreadsheet', 'other'),
    defaultValue: 'document',
  },
  description: { type: DataTypes.TEXT },
  uploaded_by: { type: DataTypes.INTEGER, references: { model: 'users', key: 'id' } },
}, {
  tableName: 'documents',
});

module.exports = Document;
