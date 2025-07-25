// --- Importações das Ferramentas do React e React Native ---
import React, { useState, useEffect, useCallback } from 'react';
import { 
  StyleSheet, Text, View, SafeAreaView, StatusBar, 
  TextInput, Pressable, Alert, FlatList, ActivityIndicator, ScrollView 
} from 'react-native';
import { Ionicons } from '@expo/vector-icons'; // Biblioteca de ícones
import AsyncStorage from '@react-native-async-storage/async-storage'; // Para guardar a sessão de login
import { useFocusEffect } from 'expo-router'; // Ferramenta para executar código quando a tela ganha foco

// --- Configurações Globais ---
// IMPORTANTE: Troque este endereço pelo IP do seu computador!
const API_URL = 'https://salao-zepaulo.onrender.com'; // Exemplo: use o IP da sua rede

// --- Componente Principal da Tela Admin ---
export default function AdminScreen() {
  // --- Estados do Componente ---
  const [token, setToken] = useState(null); // Guarda o token de autenticação
  const [isLoadingToken, setIsLoadingToken] = useState(true); // Controla o carregamento inicial do token

  // Estados para a Página de Login
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // Estados para o Painel de Admin
  const [agendamentos, setAgendamentos] = useState([]);
  const [servicos, setServicos] = useState([]);
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [novoServicoNome, setNovoServicoNome] = useState('');
  const [novoServicoPreco, setNovoServicoPreco] = useState('');
  const [semanaParaGerar, setSemanaParaGerar] = useState('');

  // --- Funções de Lógica ---

  // Função para guardar o token no telemóvel e no estado
  const handleLoginSuccess = (newToken) => {
    AsyncStorage.setItem('admin_token', newToken);
    setToken(newToken);
  };

  // Função para apagar o token e fazer logout
  const handleLogout = useCallback(() => {
    AsyncStorage.removeItem('admin_token');
    setToken(null);
  }, []);

  // Função auxiliar para fazer requisições seguras com o token
  const fetchWithAuth = useCallback((url, options = {}) => {
    const headers = { ...options.headers, 'Content-Type': 'application/json', 'authorization': `Bearer ${token}` };
    return fetch(url, { ...options, headers });
  }, [token]);

  // Função para buscar todos os dados do painel de admin
  const buscarDadosAdmin = useCallback(() => {
    if (!token) return;
    setIsLoadingData(true);
    Promise.all([
        fetchWithAuth(`${API_URL}/agendamentos`),
        fetchWithAuth(`${API_URL}/servicos`)
    ])
    .then(async ([resAgendamentos, resServicos]) => {
        if(resAgendamentos.status === 401 || resServicos.status === 401) {
            Alert.alert("Sessão Expirada", "Por favor, faça o login novamente.");
            handleLogout();
            return [null, null];
        }
        return await Promise.all([resAgendamentos.json(), resServicos.json()]);
    })
    .then(([agendamentosData, servicosData]) => {
        if(agendamentosData) setAgendamentos(Array.isArray(agendamentosData) ? agendamentosData : []);
        if(servicosData) setServicos(Array.isArray(servicosData) ? servicosData : []);
    })
    .catch(() => Alert.alert("Erro", "Não foi possível carregar os dados do painel."))
    .finally(() => setIsLoadingData(false));
  }, [fetchWithAuth, handleLogout, token]);

  // Hook que executa a busca de dados sempre que esta tela recebe o foco
  useFocusEffect(
    useCallback(() => {
      AsyncStorage.getItem('admin_token').then(storedToken => {
        if (storedToken) {
          setToken(storedToken);
        }
        setIsLoadingToken(false);
      });
    }, [])
  );
  
  // Hook que busca os dados sempre que o token muda (ou seja, após o login)
  useEffect(() => {
      if(token) {
          buscarDadosAdmin();
      }
  }, [token, buscarDadosAdmin]);

  // Função para o administrador fazer login
  const handleLogin = () => {
    setLoginError('');
    setIsLoggingIn(true);
    fetch(`${API_URL}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    })
    .then(res => res.json())
    .then(data => {
      if (data.auth && data.token) handleLoginSuccess(data.token);
      else setLoginError(data.message || 'Falha no login.');
    })
    .catch(() => setLoginError('Erro ao conectar ao servidor.'))
    .finally(() => setIsLoggingIn(false));
  };
  
  // Função para o admin adicionar um novo serviço
  const handleAdicionarServico = () => {
    if (!novoServicoNome || !novoServicoPreco) return Alert.alert("Erro", "Preencha o nome e o preço do serviço.");
    fetchWithAuth(`${API_URL}/servicos`, {
      method: 'POST',
      body: JSON.stringify({ nome: novoServicoNome, preco: novoServicoPreco }),
    })
    .then(res => {
        if (!res.ok) return res.json().then(err => { throw new Error(err.message || 'Erro desconhecido') });
        return res.json();
    })
    .then(() => {
        Alert.alert("Sucesso", "Serviço adicionado!");
        setNovoServicoNome('');
        setNovoServicoPreco('');
        buscarDadosAdmin();
    })
    .catch(err => Alert.alert("Erro", err.message));
  };
  
  // Função para o admin apagar um serviço
  const handleDeletarServico = (servicoId) => {
    Alert.alert("Confirmar Exclusão", "Tem a certeza que deseja excluir este serviço?", [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Excluir', style: 'destructive', onPress: () => {
        fetchWithAuth(`${API_URL}/servicos/${servicoId}`, { method: 'DELETE' })
        .then(res => res.json())
        .then(data => {
          Alert.alert("Sucesso", data.message);
          buscarDadosAdmin();
        })
        .catch(() => Alert.alert("Erro", "Não foi possível excluir o serviço."));
      }}
    ]);
  };

  // Função para o admin gerar a agenda da semana
  const handleGerarAgenda = () => {
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!semanaParaGerar || !dateRegex.test(semanaParaGerar)) {
      return Alert.alert("Erro de Formato", "Por favor, insira uma data no formato AAAA-MM-DD.");
    }
    
    fetchWithAuth(`${API_URL}/horarios/gerar-semana`, {
      method: 'POST',
      body: JSON.stringify({ dataInicio: semanaParaGerar }),
    })
    .then(async (res) => {
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Ocorreu um erro no servidor.');
      return data;
    })
    .then(data => {
      Alert.alert("Sucesso", data.message);
      setSemanaParaGerar('');
    })
    .catch(err => Alert.alert("Erro", err.message));
  };

  // Função para o admin cancelar um agendamento
  const handleCancelarAgendamento = (agendamentoId) => {
    Alert.alert(
      "Confirmar Cancelamento",
      "Tem a certeza que deseja cancelar este agendamento? O horário ficará disponível novamente.",
      [
        { text: 'Manter', style: 'cancel' },
        {
          text: 'Cancelar Agendamento',
          style: 'destructive',
          onPress: () => {
            fetchWithAuth(`${API_URL}/agendamentos/${agendamentoId}`, { method: 'DELETE' })
              .then(res => res.json())
              .then(data => {
                Alert.alert("Sucesso", data.message);
                buscarDadosAdmin();
              })
              .catch(() => Alert.alert("Erro", "Não foi possível cancelar o agendamento."));
          }
        }
      ]
    );
  };

  // --- RENDERIZAÇÃO ---

  if (isLoadingToken) {
    return <View style={styles.loginContainer}><ActivityIndicator size="large" color="#61dafb" /></View>;
  }

  // Se não houver token, mostra a PÁGINA DE LOGIN
  if (!token) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loginContainer}>
          <Ionicons name="shield-checkmark-outline" size={64} color="#61dafb" />
          <Text style={styles.loginTitle}>Acesso Administrativo</Text>
          {loginError ? <Text style={styles.loginError}>{loginError}</Text> : null}
          <TextInput style={styles.input} placeholder="Email (admin@salao.com)" placeholderTextColor="#999" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" />
          <TextInput style={styles.input} placeholder="Senha" placeholderTextColor="#999" value={password} onChangeText={setPassword} secureTextEntry />
          <Pressable style={styles.loginButton} onPress={handleLogin} disabled={isLoggingIn}>
            <Text style={styles.loginButtonText}>{isLoggingIn ? 'A entrar...' : 'Entrar'}</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  // Se houver token, mostra o PAINEL DE ADMIN
  return (
    <SafeAreaView style={styles.container}>
       <View style={styles.header}>
        <Text style={styles.title}>Painel de Controlo</Text>
        <Pressable onPress={handleLogout}>
            <Ionicons name="log-out-outline" size={28} color="#ff3860" />
        </Pressable>
      </View>
      <ScrollView contentContainerStyle={{paddingHorizontal: 20, paddingBottom: 40}}>
        <Text style={styles.sectionTitle}>Agendamentos Confirmados</Text>
        {isLoadingData ? <ActivityIndicator color="#61dafb" /> :
          agendamentos.length > 0 ? agendamentos.map(item => (
            <View key={item.id} style={styles.cardAgendamento}>
              <View style={{flex: 1}}>
                  <Text style={styles.agendamentoCliente}>{item.nomeCliente}</Text>
                  <Text style={styles.agendamentoServico}>{item.Servico.nome}</Text>
              </View>
              <View style={{alignItems: 'flex-end', marginRight: 15}}>
                  <Text style={styles.agendamentoData}>{new Date(item.Horario.data + 'T00:00:00').toLocaleDateString('pt-BR')}</Text>
                  <Text style={styles.agendamentoHora}>{item.Horario.hora}</Text>
              </View>
              <Pressable onPress={() => handleCancelarAgendamento(item.id)}>
                  <Ionicons name="close-circle" size={30} color="#ff3860" />
              </Pressable>
            </View>
          )) : <Text style={styles.emptyText}>Nenhum agendamento encontrado.</Text>
        }

        <Text style={styles.sectionTitle}>Gerir Serviços</Text>
        {servicos.map(servico => (
            <View key={servico.id} style={styles.servicoItem}>
                <Text style={styles.servicoText}>{servico.nome} - {servico.preco}</Text>
                <Pressable onPress={() => handleDeletarServico(servico.id)}>
                    <Ionicons name="trash-outline" size={22} color="#ff3860" />
                </Pressable>
            </View>
        ))}
        <View style={styles.addServicoContainer}>
            <TextInput style={[styles.input, {flex: 1, marginBottom: 0}]} placeholder="Nome do Serviço" value={novoServicoNome} onChangeText={setNovoServicoNome} placeholderTextColor="#999" />
            <TextInput style={[styles.input, {width: 100, marginLeft: 10, marginBottom: 0}]} placeholder="Preço" value={novoServicoPreco} onChangeText={setNovoServicoPreco} placeholderTextColor="#999" />
        </View>
        <Pressable style={[styles.loginButton, {marginTop: 15}]} onPress={handleAdicionarServico}>
            <Text style={styles.loginButtonText}>Adicionar Serviço</Text>
        </Pressable>

        <Text style={styles.sectionTitle}>Gerar Agenda da Semana</Text>
        <TextInput style={styles.input} placeholder="Data de início (AAAA-MM-DD)" value={semanaParaGerar} onChangeText={setSemanaParaGerar} placeholderTextColor="#999" maxLength={10} />
        <Text style={styles.helpText}>Use o formato AAAA-MM-DD. Ex: 2025-07-28</Text>
        <Pressable style={[styles.loginButton, {marginTop: 10, backgroundColor: '#3182CE'}]} onPress={handleGerarAgenda}>
            <Text style={styles.loginButtonText}>Gerar Horários</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}


const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1A202C', paddingTop: StatusBar.currentHeight || 0 },
  loginContainer: { flex: 1, backgroundColor: '#1A202C', justifyContent: 'center', alignItems: 'center', padding: 20 },
  loginTitle: { fontSize: 24, color: 'white', fontWeight: 'bold', marginVertical: 20 },
  loginError: { color: '#ff3860', marginBottom: 15, textAlign: 'center' },
  input: { backgroundColor: '#444c56', color: 'white', padding: 15, borderRadius: 8, marginBottom: 15, fontSize: 16 },
  loginButton: { backgroundColor: '#61dafb', padding: 15, borderRadius: 8, width: '100%', alignItems: 'center' },
  loginButtonText: { color: '#1A202C', fontWeight: 'bold', fontSize: 16 },
  header: { padding: 20, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#444c56' },
  title: { fontSize: 28, fontWeight: 'bold', color: '#61dafb' },
  sectionTitle: { fontSize: 22, fontWeight: 'bold', color: 'white', marginBottom: 15, marginTop: 30, borderTopWidth: 1, borderTopColor: '#444c56', paddingTop: 20 },
  cardAgendamento: { backgroundColor: '#2D3748', borderRadius: 12, padding: 20, marginBottom: 15, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  agendamentoCliente: { fontSize: 18, fontWeight: 'bold', color: '#E2E8F0' },
  agendamentoServico: { fontSize: 14, color: '#A0AEC0', marginTop: 4 },
  agendamentoData: { fontSize: 14, color: '#E2E8F0' },
  agendamentoHora: { fontSize: 16, fontWeight: 'bold', color: '#61dafb', marginTop: 4 },
  emptyText: {color: 'gray', textAlign: 'center', marginTop: 50},
  servicoItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#2D3748', padding: 15, borderRadius: 8, marginBottom: 10 },
  servicoText: { color: 'white', fontSize: 16 },
  addServicoContainer: { flexDirection: 'row', marginTop: 10 },
  helpText: { color: '#A0AEC0', fontSize: 12, textAlign: 'center', marginBottom: 10, fontStyle: 'italic' },
});
