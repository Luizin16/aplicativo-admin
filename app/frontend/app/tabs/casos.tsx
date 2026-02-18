import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import api from '../../services/api';

interface Caso {
  id: string;
  titulo: string;
  area: string;
  numero_processo?: string;
  status: string;
  prioridade: string;
  cliente_id: string;
}

const statusColors: any = {
  novo: '#3b82f6',
  'em andamento': '#f59e0b',
  aguardando: '#8b5cf6',
  'concluído': '#10b981',
};

const prioridadeColors: any = {
  baixa: '#10b981',
  media: '#f59e0b',
  alta: '#dc2626',
};

export default function Casos() {
  const [casos, setCasos] = useState<Caso[]>([]);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    loadCasos();
  }, []);

  async function loadCasos() {
    setLoading(true);
    try {
      const response = await api.get('/casos');
      setCasos(response.data);
    } catch (error) {
      console.error('Erro ao carregar casos:', error);
      Alert.alert('Erro', 'Não foi possível carregar os casos');
    } finally {
      setLoading(false);
    }
  }

  const getStatusLabel = (status: string) => {
    const labels: any = {
      novo: 'Novo',
      'em andamento': 'Em Andamento',
      aguardando: 'Aguardando',
      'concluído': 'Concluído',
    };
    return labels[status] || status;
  };

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.list}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={loadCasos} />
        }
      >
        {casos.map((caso) => (
          <TouchableOpacity
            key={caso.id}
            style={styles.card}
            onPress={() => router.push(`/caso/${caso.id}`)}
          >
            <View style={styles.cardHeader}>
              <View style={styles.cardHeaderLeft}>
                <Text style={styles.cardTitle}>{caso.titulo}</Text>
                <Text style={styles.cardArea}>{caso.area}</Text>
                {caso.numero_processo && (
                  <Text style={styles.cardProcesso}>
                    Processo: {caso.numero_processo}
                  </Text>
                )}
              </View>
              <Ionicons name="chevron-forward" size={24} color="#cbd5e1" />
            </View>

            <View style={styles.cardFooter}>
              <View
                style={[
                  styles.badge,
                  { backgroundColor: statusColors[caso.status] + '20' },
                ]}
              >
                <Text
                  style={[
                    styles.badgeText,
                    { color: statusColors[caso.status] },
                  ]}
                >
                  {getStatusLabel(caso.status)}
                </Text>
              </View>

              <View
                style={[
                  styles.badge,
                  { backgroundColor: prioridadeColors[caso.prioridade] + '20' },
                ]}
              >
                <Text
                  style={[
                    styles.badgeText,
                    { color: prioridadeColors[caso.prioridade] },
                  ]}
                >
                  {caso.prioridade.charAt(0).toUpperCase() + caso.prioridade.slice(1)}
                </Text>
              </View>
            </View>
          </TouchableOpacity>
        ))}

        {casos.length === 0 && !loading && (
          <View style={styles.emptyState}>
            <Ionicons name="briefcase-outline" size={64} color="#cbd5e1" />
            <Text style={styles.emptyText}>Nenhum caso cadastrado</Text>
          </View>
        )}
      </ScrollView>

      <TouchableOpacity
        style={styles.fab}
        onPress={() => router.push('/caso/novo')}
      >
        <Ionicons name="add" size={32} color="#fff" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  list: {
    flex: 1,
    padding: 16,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  cardHeaderLeft: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 4,
  },
  cardArea: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 4,
  },
  cardProcesso: {
    fontSize: 12,
    color: '#94a3b8',
  },
  cardFooter: {
    flexDirection: 'row',
    gap: 8,
  },
  badge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 64,
  },
  emptyText: {
    fontSize: 16,
    color: '#64748b',
    marginTop: 16,
  },
  fab: {
    position: 'absolute',
    right: 24,
    bottom: 24,
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#1e40af',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
});