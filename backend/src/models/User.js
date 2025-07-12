const { DataTypes } = require('sequelize');
const db = require('../config/database');
const bcrypt = require('bcryptjs');

const User = db.define('User', {
  email: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true, // Cada email deve ser único
    validate: {
      isEmail: true // Valida o formato do email
    }
  },
  password: {
    type: DataTypes.STRING,
    allowNull: false
  }
});

// "Hook" do Sequelize: Antes de um novo utilizador ser criado,
// esta função será chamada para encriptar a senha.
User.beforeCreate(async (user) => {
  const salt = await bcrypt.genSalt(10);
  user.password = await bcrypt.hash(user.password, salt);
});

module.exports = User;
