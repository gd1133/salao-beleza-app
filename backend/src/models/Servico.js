// Importa as ferramentas do Sequelize e a nossa conexão com a base de dados
const { DataTypes } = require('sequelize');
const db = require('../config/database');

// Define o modelo 'Servico', que corresponde a uma tabela 'Servicos' na base de dados
const Servico = db.define('Servico', {
  // Define as colunas da tabela
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true, // O ID será gerado automaticamente
    primaryKey: true     // Define esta coluna como a chave primária
  },
  nome: {
    type: DataTypes.STRING,
    allowNull: false // O campo 'nome' não pode ser nulo
  },
  preco: {
    type: DataTypes.STRING,
    allowNull: false // O campo 'preco' não pode ser nulo
  }
});

// Exporta o modelo para ser usado em outras partes da aplicação
module.exports = Servico;
