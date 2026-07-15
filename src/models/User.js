const { DataTypes } = require('sequelize');
const bcrypt = require('bcryptjs');
const sequelize = require('../config/database');

const User = sequelize.define('User', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  name: { type: DataTypes.STRING, allowNull: false },
  email: { type: DataTypes.STRING, allowNull: false, unique: true, validate: { isEmail: true } },
  password: { type: DataTypes.STRING, allowNull: false },
  role: { type: DataTypes.ENUM('admin', 'manager', 'agent'), defaultValue: 'agent' },
  phone: { type: DataTypes.STRING },
  avatar: { type: DataTypes.STRING },
  is_active: { type: DataTypes.BOOLEAN, defaultValue: true },
  last_login: { type: DataTypes.DATE },
  refresh_token: { type: DataTypes.TEXT },
  reset_token: { type: DataTypes.STRING },
  reset_token_expires: { type: DataTypes.DATE },
}, {
  tableName: 'users',
  hooks: {
    beforeCreate: async (user) => { user.password = await bcrypt.hash(user.password, 12); },
    beforeUpdate: async (user) => { if (user.changed('password')) user.password = await bcrypt.hash(user.password, 12); },
  },
});

User.prototype.comparePassword = async function (plain) {
  return bcrypt.compare(plain, this.password);
};

User.prototype.toJSON = function () {
  const values = { ...this.get() };
  delete values.password;
  delete values.refresh_token;
  delete values.reset_token;
  return values;
};

module.exports = User;
