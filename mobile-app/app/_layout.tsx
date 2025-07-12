import React from 'react';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

// Este componente configura a nossa barra de navegação com abas
export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#61dafb', // Cor do ícone ativo
        tabBarInactiveTintColor: 'gray',   // Cor do ícone inativo
        tabBarStyle: {
          backgroundColor: '#20232a', // Cor de fundo da barra
          borderTopColor: '#444c56',
        },
        headerShown: false, // Escondemos o cabeçalho padrão
      }}>
      <Tabs.Screen
        name="index" // Corresponde ao ficheiro index.tsx
        options={{
          title: 'Início',
          tabBarIcon: ({ color }) => <Ionicons size={28} name="home" color={color} />,
        }}
      />
      <Tabs.Screen
        name="admin" // Corresponde ao ficheiro admin.tsx
        options={{
          title: 'Admin',
          tabBarIcon: ({ color }) => <Ionicons size={28} name="shield-checkmark" color={color} />,
        }}
      />
    </Tabs>
  );
}
