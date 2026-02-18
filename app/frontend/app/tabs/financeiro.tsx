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
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import api from '../../services/api';

interface Financeiro {
  id: string;
  tipo: string;
  descricao: string;
  valor: number;
  categoria: string;
  status: string;
  data_vencimento: string;
  data_pagamento?: string;
}

export default function Financeiro() {
  const [financeiro, setFinanceiro] = useState<Financeiro[]>([]);
  const [filtro, setFiltro] = useState<'todos' | 'receber' | 'pagar'>('todos');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    loadFinanceiro();
  }, []);

  async function loadFinanceiro() {
    setLoading(true);
    try {
      const response = await api.get('/financeiro');
      setFinanceiro(response.data);
    } catch (error) {
      console.error('Erro ao carregar financeiro:', error);
      Alert.alert('Erro', 'Não foi possível carregar os dados financeiros');
    } finally {
      setLoading(false);
    }
  }

  const registrosFiltrados = financeiro.filter((f) => {
    if (filtro === 'todos') return true;
    return f.tipo === filtro;
  });

  const totais = {
    receber: financeiro
      .filter((f) => f.tipo === 'receber' && f.status === 'pendente')
      .reduce((sum, f) => sum + f.valor, 0),
    pagar: financeiro
      .filter((f) => f.tipo === 'pagar' && f.status === 'pendente')
      .reduce((sum, f) => sum + f.valor, 0),
    atrasadas: financeiro
      .filter((f) => f.status === 'atrasado')
      .reduce((sum, f) => sum + f.valor, 0),
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pago': return '#10b981';
      case 'pendente': return '#f59e0b';
      case 'atrasado': return '#dc2626';
      default: return '#64748b';
    }
  };

  const formatarData = (data: string) => {
    try {
      return format(parseISO(data), "dd 'de' MMMM, yyyy", { locale: ptBR });
    } catch {
      return data;
    }
  };

  return (
    <View style={styles.container}>
      {/* Resumo Financeiro */}
      <View style={styles.resumo}>
        <View style={styles.resumoCard}>
          <Text style={styles.resumoLabel}>A Receber</Text>
          <Text style={[styles.resumoValor, { color: '#10b981' }]}>
            R$ {totais.receber.toFixed(2)}
          </Text>
        </View>
        <View style={styles.resumoCard}>
          <Text style={styles.resumoLabel}>A Pagar</Text>
          <Text style={[styles.resumoValor, { color: '#dc2626' }]}>
            R$ {totais.pagar.toFixed(2)}
          </Text>
        </View>
        <View style={styles.resumoCard}>
          <Text style={styles.resumoLabel}>Atrasadas</Text>
          <Text style={[styles.resumoValor, { color: '#f59e0b' }]}>
            R$ {totais.atrasadas.toFixed(2)}
          </Text>
        </View>
      </View>

      {/* Filtros */}
      <View style={styles.filtros}>
        <TouchableOpacity
          style={[
            styles.filtroBtn,
            filtro === 'todos' && styles.filtroBtnActive,
          ]}
          onPress={() => setFiltro('todos')}
        >
          <Text
            style={[
              styles.filtroBtnText,
              filtro === 'todos' && styles.filtroBtnTextActive,
            ]}
          >
            Todos
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.filtroBtn,
            filtro === 'receber' && styles.filtroBtnActive,
          ]}
          onPress={() => setFiltro('receber')}
        >
          <Text
            style={[
              styles.filtroBtnText,
              filtro === 'receber' && styles.filtroBtnTextActive,
            ]}
          >
            A Receber
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.filtroBtn,
            filtro === 'pagar' && styles.filtroBtnActive,
          ]}
          onPress={() => setFiltro('pagar')}
        >
          <Text
            style={[
              styles.filtroBtnText,
              filtro === 'pagar' && styles.filtroBtnTextActive,
            ]}
          >
            A Pagar
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.list}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={loadFinanceiro} />
        }
      >
        {registrosFiltrados.map((registro) => (
          <TouchableOpacity
            key={registro.id}
            style={styles.card}
            onPress={() => router.push(`/financeiro/${registro.id}`)}
          >
            <View style={styles.cardHeader}>
              <View style={styles.cardLeft}>
                <Ionicons
                  name={registro.tipo === 'receber' ? 'trending-up' : 'trending-down'}
                  size={24}
                  color={registro.tipo === 'receber' ? '#10b981' : '#dc2626'}
                />
              </View>
              <View style={styles.cardContent}>
                <Text style={styles.cardDescricao}>{registro.descricao}</Text>
                <Text style={styles.cardCategoria}>{registro.categoria}</Text>
                <Text style={styles.cardData}>
                  Vencimento: {formatarData(registro.data_vencimento)}
                </Text>
              </View>
            </View>

            <View style={styles.cardFooter}>
              <Text style={styles.cardValor}>
                R$ {registro.valor.toFixed(2)}
              </Text>
              <View
                style={[
                  styles.statusBadge,
                  { backgroundColor: getStatusColor(registro.status) + '20' },
                ]}
              >
                <Text
                  style={[
                    styles.statusText,
                    { color: getStatusColor(registro.status) },
                  ]}
                >
                  {registro.status.charAt(0).toUpperCase() + registro.status.slice(1)}
                </Text>
              </View>
            </View>
          </TouchableOpacity>
        ))}

        {registrosFiltrados.length === 0 && !loading && (
          <View style={styles.emptyState}>
            <Ionicons name="cash-outline" size={64} color="#cbd5e1" />
            <Text style={styles.emptyText}>Nenhum registro encontrado</Text>
          </View>
        )}
      </ScrollView>

      <TouchableOpacity
        style={styles.fab}
        onPress={() => router.push('/financeiro/novo')}
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
  resumo: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
  },
  resumoCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  resumoLabel: {
    fontSize: 12,
    color: '#64748b',
    marginBottom: 8,
  },
  resumoValor: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  filtros: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 8,
    marginBottom: 16,
  },
  filtroBtn: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 16,
    backgroundColor: '#fff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    alignItems: 'center',
  },
  filtroBtnActive: {
    backgroundColor: '#1e40af',
    borderColor: '#1e40af',
  },
  filtroBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748b',
  },
  filtroBtnTextActive: {
    color: '#fff',
  },
  list: {
    flex: 1,
    paddingHorizontal: 16,
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
    marginBottom: 12,
  },
  cardLeft: {
    marginRight: 12,
  },
  cardContent: {
    flex: 1,
  },
  cardDescricao: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 4,
  },
  cardCategoria: {
    fontSize: 12,
    color: '#64748b',
    marginBottom: 4,
  },
  cardData: {
    fontSize: 12,
    color: '#94a3b8',
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardValor: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1e293b',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
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