// --- Importações das Ferramentas do React e React Native ---
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  StyleSheet, Text, View, SafeAreaView, StatusBar, 
  SectionList, Pressable, Alert, Modal, TextInput, Button, 
  ActivityIndicator, FlatList, Image, Linking 
} from 'react-native';
import { Picker } from '@react-native-picker/picker'; // Componente para listas de seleção
import { useFocusEffect } from 'expo-router'; // Ferramenta para executar código quando a tela ganha foco
import { Ionicons } from '@expo/vector-icons'; // Biblioteca de ícones

// --- Configurações Globais ---
// IMPORTANTE: Troque este endereço pelo IP do seu computador!
const API_URL = 'http://192.168.1.134:3001'; // Exemplo: use o IP da sua rede

// --- Componente da Tela Principal (Visível para Clientes) ---
export default function SalaoScreen() {
  // --- Estados do Componente (a "memória" do componente) ---
  const [servicos, setServicos] = useState([]); // Guarda a lista de serviços
  const [horarios, setHorarios] = useState([]); // Guarda a lista de horários disponíveis
  const [status, setStatus] = useState('Conectando...'); // Mensagem de status da conexão
  const [isLoading, setIsLoading] = useState(true); // Controla o indicador de "a carregar..."

  // Estados para o Modal (janela) de Agendamento
  const [modalVisible, setModalVisible] = useState(false);
  const [horarioSelecionado, setHorarioSelecionado] = useState(null);
  const [nomeCliente, setNomeCliente] = useState('');
  const [servicoIdSelecionado, setServicoIdSelecionado] = useState(null);

  // --- Constantes ---
  const numeroWhatsapp = '5511999998888'; // Substitua pelo seu número

  // Lista de fotos para o carrossel. Substitua pelos links das suas fotos reais.
  const fotosCarrossel = [
    { id: '1', url: 'https://placehold.co/600x600/282c34/ffffff?text=Corte+1' },
    { id: '2', url: 'https://placehold.co/600x600/282c34/ffffff?text=Corte+2' },
    { id: '3', url: 'https://placehold.co/600x600/282c34/ffffff?text=Corte+3' },
    { id: '4', url: 'https://placehold.co/600x600/282c34/ffffff?text=Corte+4' },
    { id: '5', url: 'https://placehold.co/600x600/282c34/ffffff?text=Corte+5' },
  ];

  // --- Funções de Lógica ---

  // Função para buscar os dados públicos (serviços e horários) do backend
  const buscarDados = useCallback(() => {
    setIsLoading(true);
    Promise.all([
      fetch(`${API_URL}/servicos`).then(response => response.json()),
      fetch(`${API_URL}/horarios`).then(response => response.json())
    ])
    .then(([servicosData, horariosData]) => {
      setServicos(Array.isArray(servicosData) ? servicosData : []);
      setHorarios(Array.isArray(horariosData) ? horariosData : []);
      setStatus('Conectado com sucesso!');
    })
    .catch(error => {
      console.error(error);
      setStatus('Falha ao conectar com a API.');
      Alert.alert("Erro de Conexão", "Não foi possível buscar os dados do servidor.");
    })
    .finally(() => setIsLoading(false));
  }, []);

  // Hook que executa a busca de dados sempre que esta tela recebe o foco
  useFocusEffect(useCallback(() => { buscarDados(); }, [buscarDados]));

  // Funções para controlar o modal de agendamento
  const handleOpenModal = (horario) => { setHorarioSelecionado(horario); setModalVisible(true); };
  const handleCloseModal = () => {
    setModalVisible(false);
    setHorarioSelecionado(null);
    setNomeCliente('');
    setServicoIdSelecionado(null);
  };

  // Função que envia os dados do agendamento para o backend
  const handleConfirmarAgendamento = () => {
    if (!nomeCliente || !servicoIdSelecionado) {
      Alert.alert("Campos Obrigatórios", "Por favor, preencha o seu nome e selecione um serviço.");
      return;
    }
    fetch(`${API_URL}/agendamentos`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        nomeCliente: nomeCliente,
        horarioId: horarioSelecionado.id,
        servicoId: servicoIdSelecionado,
      }),
    })
    .then(res => {
      if (!res.ok) throw new Error('Este horário já foi agendado por outra pessoa.');
      return res.json();
    })
    .then(() => {
      Alert.alert("Sucesso!", "O seu horário foi agendado.");
      handleCloseModal();
      buscarDados(); // Atualiza a lista de horários
    })
    .catch(error => {
      Alert.alert("Erro", error.message);
      handleCloseModal();
      buscarDados();
    });
  };

  // Função para abrir o WhatsApp
  const abrirWhatsApp = () => {
    const mensagem = 'Olá! Gostaria de agendar um horário.';
    const url = `whatsapp://send?phone=${numeroWhatsapp}&text=${mensagem}`;
    Linking.openURL(url).catch(() => {
      Alert.alert('Erro', 'Certifique-se de que o WhatsApp está instalado no seu telemóvel.');
    });
  };

  // Memoiza (guarda o resultado) o agrupamento de horários para otimizar a performance
  const horariosAgrupados = useMemo(() => {
    if (!horarios || horarios.length === 0) return [];
    const agrupados = horarios.reduce((acc, horario) => {
      const { data } = horario;
      if (!acc[data]) acc[data] = [];
      acc[data].push(horario);
      return acc;
    }, {});
    return Object.keys(agrupados).map(data => ({
      title: new Date(data + 'T00:00:00').toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' }),
      data: agrupados[data],
    }));
  }, [horarios]);
  
  // Mostra um indicador de "a carregar..." enquanto os dados são buscados
  if (isLoading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color="#61dafb" />
        <Text style={{ color: 'white', marginTop: 10 }}>A carregar dados...</Text>
      </View>
    )
  }

  // --- Renderização do Componente (o que aparece na tela) ---
  return (
    <SafeAreaView style={styles.container}>
      <SectionList
        sections={[{ title: 'Nossos Serviços', data: servicos, isServicos: true }, ...horariosAgrupados]}
        keyExtractor={(item, index) => item.id.toString() + index}
        renderItem={({ item, section }) => {
          if (section.isServicos) {
            return (
              <View style={styles.cardServico}>
                <Text style={styles.cardTitle}>{item.nome}</Text>
                <Text style={styles.cardPrice}>{item.preco}</Text>
              </View>
            );
          }
          return (
            <View style={styles.horarioContainer}>
                <Pressable style={styles.horarioButton} onPress={() => handleOpenModal(item)}>
                    <Text style={styles.horarioText}>{item.hora}</Text>
                </Pressable>
            </View>
          );
        }}
        renderSectionHeader={({ section: { title, isServicos } }) => (
          <Text style={styles.sectionTitle}>{isServicos ? title : `Horários para ${title}`}</Text>
        )}
        ListHeaderComponent={() => (
          <>
            <View style={styles.header}>
              <Text style={styles.title}>Salão de Beleza</Text>
              <Text style={styles.status}>Status da API: {status}</Text>
            </View>
            <View style={styles.carouselSection}>
              <Text style={styles.sectionTitle}>Inspire-se</Text>
              <FlatList
                data={fotosCarrossel}
                renderItem={({ item }) => (
                  <Image source={{ uri: item.url }} style={styles.carouselImage} />
                )}
                keyExtractor={item => item.id}
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.carouselContainer}
              />
            </View>
          </>
        )}
        ListFooterComponent={() => (
            <View style={styles.footer}>
                <Text style={styles.sectionTitle}>Nosso Endereço</Text>
                <View style={styles.enderecoContainer}>
                    <Text style={styles.enderecoText}>Rua da Barbearia, 123</Text>
                    <Text style={styles.enderecoText}>Bairro do Corte, Cidade Navalha - SP</Text>
                </View>
                <Pressable style={styles.whatsappButton} onPress={abrirWhatsApp}>
                    <Ionicons name="logo-whatsapp" size={24} color="white" />
                    <Text style={styles.whatsappButtonText}>Agendar via WhatsApp</Text>
                </Pressable>
            </View>
        )}
        contentContainerStyle={{ paddingHorizontal: 20 }}
        stickySectionHeadersEnabled={false}
      />

      <Modal visible={modalVisible} onRequestClose={handleCloseModal} transparent={true} animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Confirmar Agendamento</Text>
            {horarioSelecionado && (
              <Text style={styles.modalSubTitle}>
                Horário: {new Date(horarioSelecionado.data + 'T00:00:00').toLocaleDateString('pt-BR')} às {horarioSelecionado.hora}
              </Text>
            )}
            <TextInput style={styles.input} placeholder="Digite o seu nome" placeholderTextColor="#999" value={nomeCliente} onChangeText={setNomeCliente} />
            <View style={styles.pickerContainer}>
              <Picker selectedValue={servicoIdSelecionado} onValueChange={(itemValue) => setServicoIdSelecionado(itemValue)} style={{ color: 'white' }} dropdownIconColor="white">
                <Picker.Item label="-- Selecione um serviço --" value={null} />
                {servicos.map(servico => (
                  <Picker.Item key={servico.id} label={`${servico.nome} - ${servico.preco}`} value={servico.id} />
                ))}
              </Picker>
            </View>
            <Button title="Confirmar Agendamento" onPress={handleConfirmarAgendamento} color="#61dafb" />
            <Pressable onPress={handleCloseModal} style={{ marginTop: 10 }}>
              <Text style={styles.cancelText}>Cancelar</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

// --- Estilos do Componente ---
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#282c34', paddingTop: StatusBar.currentHeight || 0 },
  header: { paddingVertical: 20, alignItems: 'center', marginBottom: 10 },
  title: { fontSize: 24, fontWeight: 'bold', color: '#61dafb' },
  status: { fontSize: 12, color: 'gray', marginTop: 4 },
  sectionTitle: { fontSize: 20, fontWeight: 'bold', color: 'white', backgroundColor: '#282c34', paddingTop: 20, paddingBottom: 10 },
  carouselSection: { marginBottom: 20 },
  carouselContainer: { paddingRight: 20 },
  carouselImage: { width: 150, height: 150, borderRadius: 10, marginRight: 15 },
  cardServico: { backgroundColor: '#444c56', borderRadius: 8, padding: 20, marginBottom: 15 },
  cardTitle: { fontSize: 18, fontWeight: 'bold', color: '#61dafb' },
  cardPrice: { fontSize: 16, color: 'white', marginTop: 5 },
  horarioContainer: { flexDirection: 'row', flexWrap: 'wrap' },
  horarioButton: { backgroundColor: '#3e8ed0', paddingVertical: 10, paddingHorizontal: 15, borderRadius: 5, margin: 5 },
  horarioText: { color: 'white', fontSize: 14 },
  footer: { marginTop: 30, paddingBottom: 20 },
  enderecoContainer: { backgroundColor: '#444c56', borderRadius: 8, padding: 20, alignItems: 'center' },
  enderecoText: { color: 'white', fontSize: 16, lineHeight: 24 },
  whatsappButton: { flexDirection: 'row', backgroundColor: '#25D366', paddingVertical: 15, paddingHorizontal: 30, borderRadius: 50, alignItems: 'center', justifyContent: 'center', marginTop: 20 },
  whatsappButtonText: { color: 'white', fontWeight: 'bold', fontSize: 16, marginLeft: 10 },
  modalOverlay: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0, 0, 0, 0.7)' },
  modalContent: { width: '90%', backgroundColor: '#20232a', borderRadius: 10, padding: 20, alignItems: 'center' },
  modalTitle: { fontSize: 20, fontWeight: 'bold', color: '#61dafb', marginBottom: 10 },
  modalSubTitle: { fontSize: 16, color: 'white', marginBottom: 20 },
  input: { width: '100%', backgroundColor: '#444c56', color: 'white', padding: 10, borderRadius: 5, marginBottom: 15 },
  pickerContainer: { width: '100%', backgroundColor: '#444c56', borderRadius: 5, marginBottom: 20 },
  cancelText: { color: '#ff3860', marginTop: 15 },
});
