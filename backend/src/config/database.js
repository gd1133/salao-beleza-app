// Importa a biblioteca Sequelize
const { Sequelize } = require('sequelize');

// Cria uma nova instância do Sequelize, configurada para usar o SQLite.
// 'storage' define o nome do ficheiro onde a nossa base de dados será guardada.
const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: './database.sqlite' // O ficheiro será criado na raiz da pasta 'backend'
});

// Exporta a instância para que outros ficheiros possam usá-la
module.exports = sequelize;
