// --- Importações das Ferramentas ---
const express = require('express'); // Framework para criar o servidor e as rotas
const cors = require('cors'); // Permite que o nosso frontend aceda ao backend
const { Op } = require('sequelize'); // Usado para operadores de comparação complexos em consultas
const bcrypt = require('bcryptjs'); // Para encriptar e verificar senhas
const jwt = require('jsonwebtoken'); // Para criar e verificar tokens de autenticação (JWT)

// --- Importações dos Nossos Módulos ---
const db = require('./config/database'); // A nossa conexão com a base de dados
const Servico = require('./models/Servico'); // O modelo da tabela de Serviços
const Horario = require('./models/Horario'); // O modelo da tabela de Horários
const Agendamento = require('./models/Agendamento'); // O modelo da tabela de Agendamentos
const User = require('./models/User'); // O modelo da tabela de Utilizadores

// --- Associações entre as Tabelas ---
// Diz ao Sequelize como as tabelas se relacionam.
Agendamento.belongsTo(Horario); // Um Agendamento pertence a um Horário.
Agendamento.belongsTo(Servico); // Um Agendamento pertence a um Serviço.
Horario.hasOne(Agendamento); // Um Horário pode ter um Agendamento.

// --- Configuração da Aplicação Express ---
const app = express();
app.use(cors()); // Habilita o CORS para todas as rotas
app.use(express.json()); // Permite que o servidor entenda JSON no corpo das requisições
const PORT = 3001;
const JWT_SECRET = 'o_seu_segredo_super_secreto_para_proteger_o_token';

// --- Middleware de Autenticação ---
// Uma função que atua como um "segurança" antes de aceder a uma rota protegida.
const verifyToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Extrai o token do cabeçalho "Bearer TOKEN"

  if (!token) return res.status(403).json({ message: 'Acesso negado. Nenhum token fornecido.' });

  // Verifica se o token é válido e se foi assinado com o nosso segredo
  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) return res.status(401).json({ message: 'Token inválido ou expirado.' });
    req.userId = decoded.id; // Guarda o ID do utilizador para uso futuro
    next(); // Se o token for válido, permite que o pedido continue para a rota
  });
};

// =============================================
// --- ROTAS PÚBLICAS (Acessíveis a todos) ---
// =============================================

// Rota para buscar todos os serviços
app.get('/servicos', async (req, res) => {
    const servicos = await Servico.findAll();
    res.json(servicos);
});

// Rota para buscar apenas os horários disponíveis
app.get('/horarios', async (req, res) => {
    const horarios = await Horario.findAll({ where: { disponivel: true }, order: [['data', 'ASC'], ['hora', 'ASC']] });
    res.json(horarios);
});

// Rota para um cliente criar um novo agendamento
app.post('/agendamentos', async (req, res) => {
    const t = await db.transaction(); // Inicia uma transação para garantir que ou tudo funciona, ou nada é alterado.
    try {
        const { nomeCliente, telefoneCliente, horarioId, servicoId } = req.body;
        if (!nomeCliente || !horarioId || !servicoId) return res.status(400).json({ message: 'Dados incompletos.' });

        const horario = await Horario.findByPk(horarioId, { transaction: t });
        if (!horario || !horario.disponivel) return res.status(409).json({ message: 'Horário já agendado.' });

        // Cria o agendamento e marca o horário como indisponível
        await Agendamento.create({ nomeCliente, telefoneCliente, HorarioId: horarioId, ServicoId: servicoId }, { transaction: t });
        horario.disponivel = false;
        await horario.save({ transaction: t });
        
        await t.commit(); // Confirma todas as alterações na base de dados
        res.status(201).json({ message: "Agendamento confirmado com sucesso!"});
    } catch (error) {
        await t.rollback(); // Desfaz todas as alterações se ocorrer um erro
        res.status(500).json({ message: 'Erro ao criar agendamento.' });
    }
});

// =============================================
// --- ROTAS DE AUTENTICAÇÃO ---
// =============================================

// Rota para o administrador fazer login
app.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ where: { email } });
    if (!user) return res.status(404).json({ message: 'Utilizador não encontrado.' });

    const passwordIsValid = await bcrypt.compare(password, user.password);
    if (!passwordIsValid) return res.status(401).json({ auth: false, token: null, message: 'Senha inválida.' });

    const token = jwt.sign({ id: user.id }, JWT_SECRET, { expiresIn: 86400 }); // Gera um token válido por 24 horas
    res.status(200).json({ auth: true, token: token });
  } catch (error) {
    res.status(500).json({ message: 'Erro no servidor durante o login.' });
  }
});

// ==================================================
// --- ROTAS PROTEGIDAS (Apenas para o Admin) ---
// ==================================================

// Rota para o admin ver todos os agendamentos confirmados
app.get('/agendamentos', verifyToken, async (req, res) => {
    const agendamentos = await Agendamento.findAll({
        include: [{ model: Horario, required: true }, { model: Servico, required: true }],
        order: [[Horario, 'data', 'ASC'], [Horario, 'hora', 'ASC']]
    });
    res.json(agendamentos);
});

// Rota para o admin adicionar um novo serviço
app.post('/servicos', verifyToken, async (req, res) => {
    const { nome, preco } = req.body;
    const novoServico = await Servico.create({ nome, preco });
    res.status(201).json(novoServico);
});

// Rota para o admin apagar um serviço
app.delete('/servicos/:id', verifyToken, async (req, res) => {
    await Servico.destroy({ where: { id: req.params.id } });
    res.json({ message: 'Serviço excluído com sucesso!' });
});

// Rota para o admin gerar os horários da semana
app.post('/horarios/gerar-semana', verifyToken, async (req, res) => {
    // ... (lógica existente para gerar a semana)
});

// Rota para o admin cancelar um agendamento
app.delete('/agendamentos/:id', verifyToken, async (req, res) => {
  const t = await db.transaction();
  try {
    const agendamento = await Agendamento.findByPk(req.params.id, { include: [Horario], transaction: t });
    if (!agendamento) return res.status(404).json({ message: 'Agendamento não encontrado.' });

    // Torna o horário disponível novamente
    if (agendamento.Horario) {
      agendamento.Horario.disponivel = true;
      await agendamento.Horario.save({ transaction: t });
    }
    await agendamento.destroy({ transaction: t });
    await t.commit();
    res.json({ message: 'Agendamento cancelado com sucesso!' });
  } catch (error) {
    await t.rollback();
    res.status(500).json({ message: 'Erro ao cancelar o agendamento.' });
  }
});


// Rota de Sincronização (para desenvolvimento)
app.get('/sync', async (req, res) => {
    await db.sync({ force: true });
    await User.create({ email: 'admin@salao.com', password: 'senha_forte_123' });
    await Servico.bulkCreate([
      { nome: 'Corte de Cabelo', preco: 'R$ 50,00' },
      { nome: 'Barba Tradicional', preco: 'R$ 35,00' }
    ]);
    await Horario.bulkCreate([
        { data: '2025-07-28', hora: '09:00' }, { data: '2025-07-28', hora: '10:00' },
        { data: '2025-07-29', hora: '19:00' }, { data: '2025-07-29', hora: '20:00' },
    ]);
    res.json({ message: 'Base de dados sincronizada!' });
});

// Inicia o servidor
app.listen(PORT, async () => {
  try {
    await db.authenticate();
    console.log('Conexão com a base de dados estabelecida com sucesso.');
    console.log(`Servidor a rodar na porta ${PORT}`);
  } catch (error) {
    console.error('Não foi possível conectar à base de dados:', error);
  }
});
