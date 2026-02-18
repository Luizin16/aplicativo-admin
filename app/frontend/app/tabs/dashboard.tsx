import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  RefreshControl,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useAuth } from '../../contexts/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import api from '../../services/api';

interface DashboardStats {
  prazos_hoje: number;
  prazos_semana: number;
  tarefas_pendentes: number;
  processos_ativos: number;
  contas_receber_mes: number;
  contas_atrasadas: number;
  alertas: Array<{
    tipo: string;
    mensagem: string;
    urgencia: string;
  }>;
}

export default function Dashboard() {
  const { user, signOut } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadDashboard();
  }, []);

  async function loadDashboard() {
    setLoading(true);
    try {
      const response = await api.get('/dashboard');
      setStats(response.data);
    } catch (error) {
      console.error('Erro ao carregar dashboard:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleLogout() {
    Alert.alert('Sair', 'Deseja realmente sair?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Sair', onPress: () => signOut(), style: 'destructive' },
    ]);
  }

  const getUrgenciaColor = (urgencia: string) => {
    switch (urgencia) {
      case 'alta': return '#dc2626';
      case 'media': return '#f59e0b';
      case 'baixa': return '#3b82f6';
      default: return '#64748b';
    }
  };

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={loading} onRefresh={loadDashboard} />
      }
    >
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Olá, {user?.nome}!</Text>
          <Text style={styles.subtitle}>Bem-vindo ao AdvControl</Text>
        </View>
        <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
          <Ionicons name="log-out-outline" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      {stats && (
        <>
          {/* Cards de Estatísticas */}
          <View style={styles.statsGrid}>
            <View style={[styles.statCard, { backgroundColor: '#dbeafe' }]}>
              <Ionicons name="today" size={24} color="#1e40af" />
              <Text style={styles.statNumber}>{stats.prazos_hoje}</Text>
              <Text style={styles.statLabel}>Prazos Hoje</Text>
            </View>

            <View style={[styles.statCard, { backgroundColor: '#ddd6fe' }]}>
              <Ionicons name="calendar" size={24} color="#6d28d9" />
              <Text style={styles.statNumber}>{stats.prazos_semana}</Text>
              <Text style={styles.statLabel}>Prazos na Semana</Text>
            </View>

            <View style={[styles.statCard, { backgroundColor: '#fef3c7' }]}>
              <Ionicons name="checkmark-circle" size={24} color="#f59e0b" />
              <Text style={styles.statNumber}>{stats.tarefas_pendentes}</Text>
              <Text style={styles.statLabel}>Tarefas Pendentes</Text>
            </View>

            <View style={[styles.statCard, { backgroundColor: '#d1fae5' }]}>
              <Ionicons name="briefcase" size={24} color="#059669" />
              <Text style={styles.statNumber}>{stats.processos_ativos}</Text>
              <Text style={styles.statLabel}>Processos Ativos</Text>
            </View>
          </View>

          {/* Cards Financeiros */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Financeiro</Text>
            <View style={styles.financeCard}>
              <View style={styles.financeRow}>
                <View style={styles.financeItem}>
                  <Ionicons name="trending-up" size={20} color="#059669" />
                  <Text style={styles.financeLabel}>A Receber (Mês)</Text>
                  <Text style={styles.financeValue}>
                    R$ {stats.contas_receber_mes.toFixed(2)}
                  </Text>
                </View>
                <View style={[styles.financeItem, { alignItems: 'flex-end' }]}>
                  <Ionicons name="alert-circle" size={20} color="#dc2626" />
                  <Text style={styles.financeLabel}>Atrasadas</Text>
                  <Text style={[styles.financeValue, { color: '#dc2626' }]}>
                    R$ {stats.contas_atrasadas.toFixed(2)}
                  </Text>
                </View>
              </View>
            </View>
          </View>

          {/* Alertas */}
          {stats.alertas.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Alertas e Prazos</Text>
              {stats.alertas.map((alerta, index) => (
                <View
                  key={index}
                  style={[
                    styles.alertCard,
                    { borderLeftColor: getUrgenciaColor(alerta.urgencia) },
                  ]}
                >
                  <Ionicons
                    name="warning"
                    size={20}
                    color={getUrgenciaColor(alerta.urgencia)}
                  />
                  <Text style={styles.alertText}>{alerta.mensagem}</Text>
                </View>
              ))}
            </View>
          )}
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    backgroundColor: '#1e40af',
    padding: 24,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  greeting: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  subtitle: {
    fontSize: 14,
    color: '#bfdbfe',
    marginTop: 4,
  },
  logoutButton: {
    padding: 8,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 16,
    gap: 12,
  },
  statCard: {
    width: '48%',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#1e293b',
    marginTop: 8,
  },
  statLabel: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 4,
    textAlign: 'center',
  },
  section: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 12,
  },
  financeCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  financeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  financeItem: {
    flex: 1,
  },
  financeLabel: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 4,
  },
  financeValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1e293b',
    marginTop: 4,
  },
  alertCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderLeftWidth: 4,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  alertText: {
    flex: 1,
    fontSize: 14,
    color: '#1e293b',
  },
});