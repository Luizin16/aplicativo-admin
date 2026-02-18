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
import { Calendar, LocaleConfig } from 'react-native-calendars';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import api from '../../services/api';

// Configurar locale do calendário
LocaleConfig.locales['pt-br'] = {
  monthNames: [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ],
  monthNamesShort: [
    'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun',
    'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'
  ],
  dayNames: [
    'Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'
  ],
  dayNamesShort: ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'],
  today: 'Hoje'
};
LocaleConfig.defaultLocale = 'pt-br';

interface Prazo {
  id: string;
  tipo: string;
  titulo: string;
  data: string;
  hora: string;
  descricao?: string;
}

export default function Agenda() {
  const [prazos, setPrazos] = useState<Prazo[]>([]);
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [markedDates, setMarkedDates] = useState<any>({});
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    loadPrazos();
  }, []);

  useEffect(() => {
    // Marcar datas com eventos
    const marked: any = {};
    prazos.forEach((prazo) => {
      const date = prazo.data.split('T')[0];
      if (!marked[date]) {
        marked[date] = { marked: true, dotColor: '#1e40af' };
      }
    });
    
    // Destacar data selecionada
    marked[selectedDate] = {
      ...marked[selectedDate],
      selected: true,
      selectedColor: '#1e40af',
    };
    
    setMarkedDates(marked);
  }, [prazos, selectedDate]);

  async function loadPrazos() {
    setLoading(true);
    try {
      const response = await api.get('/prazos');
      setPrazos(response.data);
    } catch (error) {
      console.error('Erro ao carregar prazos:', error);
      Alert.alert('Erro', 'Não foi possível carregar os prazos');
    } finally {
      setLoading(false);
    }
  }

  const prazosDoDia = prazos.filter((p) => p.data.startsWith(selectedDate));

  const getTipoIcon = (tipo: string) => {
    switch (tipo) {
      case 'audiência': return 'mic';
      case 'reunião': return 'people';
      default: return 'timer';
    }
  };

  const getTipoColor = (tipo: string) => {
    switch (tipo) {
      case 'audiência': return '#dc2626';
      case 'reunião': return '#3b82f6';
      default: return '#f59e0b';
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={loadPrazos} />
        }
      >
        <Calendar
          current={selectedDate}
          onDayPress={(day) => setSelectedDate(day.dateString)}
          markedDates={markedDates}
          theme={{
            backgroundColor: '#fff',
            calendarBackground: '#fff',
            textSectionTitleColor: '#64748b',
            selectedDayBackgroundColor: '#1e40af',
            selectedDayTextColor: '#fff',
            todayTextColor: '#1e40af',
            dayTextColor: '#1e293b',
            textDisabledColor: '#cbd5e1',
            dotColor: '#1e40af',
            selectedDotColor: '#fff',
            arrowColor: '#1e40af',
            monthTextColor: '#1e293b',
            textDayFontWeight: '500',
            textMonthFontWeight: 'bold',
            textDayHeaderFontWeight: '500',
            textDayFontSize: 14,
            textMonthFontSize: 16,
            textDayHeaderFontSize: 12,
          }}
        />

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            Eventos do dia {format(parseISO(selectedDate), "dd 'de' MMMM", { locale: ptBR })}
          </Text>

          {prazosDoDia.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="calendar-outline" size={48} color="#cbd5e1" />
              <Text style={styles.emptyText}>Nenhum evento neste dia</Text>
            </View>
          ) : (
            prazosDoDia
              .sort((a, b) => a.hora.localeCompare(b.hora))
              .map((prazo) => (
                <TouchableOpacity
                  key={prazo.id}
                  style={styles.eventoCard}
                  onPress={() => router.push(`/prazo/${prazo.id}`)}
                >
                  <View
                    style={[
                      styles.eventoIcon,
                      { backgroundColor: getTipoColor(prazo.tipo) + '20' },
                    ]}
                  >
                    <Ionicons
                      name={getTipoIcon(prazo.tipo)}
                      size={24}
                      color={getTipoColor(prazo.tipo)}
                    />
                  </View>
                  <View style={styles.eventoContent}>
                    <Text style={styles.eventoHora}>{prazo.hora}</Text>
                    <Text style={styles.eventoTitulo}>{prazo.titulo}</Text>
                    <Text style={styles.eventoTipo}>
                      {prazo.tipo.charAt(0).toUpperCase() + prazo.tipo.slice(1)}
                    </Text>
                    {prazo.descricao && (
                      <Text style={styles.eventoDescricao} numberOfLines={2}>
                        {prazo.descricao}
                      </Text>
                    )}
                  </View>
                  <Ionicons name="chevron-forward" size={24} color="#cbd5e1" />
                </TouchableOpacity>
              ))
          )}
        </View>
      </ScrollView>

      <TouchableOpacity
        style={styles.fab}
        onPress={() => router.push('/prazo/novo')}
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
  section: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 16,
  },
  eventoCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  eventoIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  eventoContent: {
    flex: 1,
  },
  eventoHora: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1e40af',
    marginBottom: 4,
  },
  eventoTitulo: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 4,
  },
  eventoTipo: {
    fontSize: 12,
    color: '#64748b',
    marginBottom: 4,
  },
  eventoDescricao: {
    fontSize: 12,
    color: '#94a3b8',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
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