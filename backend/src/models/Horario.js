// Importa as ferramentas do Sequelize e a nossa conexão com a base de dados
const { DataTypes } = require('sequelize');
const db = require('../config/database');

// Define o modelo 'Horario', que corresponde a uma tabela 'Horarios'
const Horario = db.define('Horario', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },
  data: {
    type: DataTypes.STRING, // Guardaremos a data como texto, ex: "2025-07-28"
    allowNull: false
  },
  hora: {
    type: DataTypes.STRING, // Guardaremos a hora como texto, ex: "09:00"
    allowNull: false
  },
  disponivel: {
    type: DataTypes.BOOLEAN,
    defaultValue: true // Por padrão, todo horário criado está disponível
  }
});

// Exporta o modelo
module.exports = Horario;
