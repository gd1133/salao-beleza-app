import React, { useState, useEffect, useMemo } from 'react';
import { StyleSheet, Text, View, FlatList, SafeAreaView, StatusBar, SectionList, Pressable } from 'react-native';

// IMPORTANTE: Troque este endereço pelo IP do seu computador!
// O seu telemóvel não entende 'localhost'.
const API_URL = 'http://192.168.1.134:3001'; // Exemplo: use o IP da sua rede

export default function App() {
  const [servicos, setServicos] = useState([]);
  const [horarios, setHorarios] = useState([]); // Novo estado para os horários
  const [status, setStatus] = useState('Conectando...');

  useEffect(() => {
    // Usamos Promise.all para buscar os dois tipos de dados em paralelo
    Promise.all([
      fetch(`${API_URL}/servicos`).then(response => response.json()),
      fetch(`${API_URL}/horarios`).then(response => response.json())
    ])
    .then(([servicosData, horariosData]) => {
      setServicos(servicosData);
      setHorarios(horariosData);
      setStatus('Conectado com sucesso!');
    })
    .catch(error => {
      console.error(error);
      setStatus('Falha ao conectar com a API.');
    });
  }, []);

  // Função para agrupar os horários por data para a SectionList
  const horariosAgrupados = useMemo(() => {
    if (!horarios || horarios.length === 0) return [];
    
    const agrupados = horarios.reduce((acc, horario) => {
      const { data } = horario;
      if (!acc[data]) {
        acc[data] = [];
      }
      acc[data].push(horario);
      return acc;
    }, {});

    return Object.keys(agrupados).map(data => ({
      title: new Date(data + 'T00:00:00').toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' }),
      data: agrupados[data],
    }));
  }, [horarios]);

  // A aplicação agora usa uma SectionList para uma melhor organização
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />
      
      <SectionList
        sections={[{ title: 'Serviços', data: servicos }, ...horariosAgrupados]}
        keyExtractor={(item, index) => item.id.toString() + index}
        renderItem={({ item, section }) => {
          if (section.title === 'Serviços') {
            return (
              <View style={styles.cardServico}>
                <Text style={styles.cardTitle}>{item.nome}</Text>
                <Text style={styles.cardPrice}>{item.preco}</Text>
              </View>
            );
          }
          // Renderiza os botões de horário
          return (
            <View style={styles.horarioContainer}>
                <Pressable style={styles.horarioButton} onPress={() => alert(`Agendar ${item.hora}`)}>
                    <Text style={styles.horarioText}>{item.hora}</Text>
                </Pressable>
            </View>
          );
        }}
        renderSectionHeader={({ section: { title } }) => (
          <Text style={styles.sectionTitle}>{title}</Text>
        )}
        ListHeaderComponent={() => (
          <View style={styles.header}>
            <Text style={styles.title}>Salão de Beleza</Text>
            <Text style={styles.status}>Status da API: {status}</Text>
          </View>
        )}
        contentContainerStyle={{ paddingHorizontal: 20 }}
        stickySectionHeadersEnabled={false}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#282c34',
  },
  header: {
    paddingVertical: 20,
    alignItems: 'center',
    marginBottom: 10,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#61dafb',
  },
  status: {
    fontSize: 12,
    color: 'gray',
    marginTop: 4,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
    backgroundColor: '#282c34',
    paddingTop: 20,
    paddingBottom: 10,
  },
  cardServico: {
    backgroundColor: '#444c56',
    borderRadius: 8,
    padding: 20,
    marginBottom: 15,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#61dafb',
  },
  cardPrice: {
    fontSize: 16,
    color: 'white',
    marginTop: 5,
  },
  // Novos estilos para os horários
  horarioContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  horarioButton: {
    backgroundColor: '#3e8ed0',
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: 5,
    margin: 5,
  },
  horarioText: {
    color: 'white',
    fontSize: 14,
  },
});
