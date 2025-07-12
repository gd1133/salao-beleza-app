const { DataTypes } = require('sequelize');
const db = require('../config/database');

const Agendamento = db.define('Agendamento', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },
  nomeCliente: {
    type: DataTypes.STRING,
    allowNull: false
  },
  telefoneCliente: {
    type: DataTypes.STRING,
    allowNull: true // O telefone pode ser opcional
  }
  // As ligações com Horario e Servico serão feitas através de associações
});

module.exports = Agendamento;
