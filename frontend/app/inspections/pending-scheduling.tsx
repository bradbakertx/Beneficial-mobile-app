import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import api from '../../services/api';
import { format } from 'date-fns';

interface PendingInspection {
  id: string;
  option_period_end: string;
  best_days: string;
  total_amount: number;
  customer: {
    name: string;
    email: string;
  };
  quote: {
    street_address: string;
    city: string;
    state: string;
    zip_code: string;
    inspection_type: string;
    square_footage: number;
  };
}

export default function PendingSchedulingScreen() {
  const router = useRouter();
  const [inspections, setInspections] = useState<PendingInspection[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchPendingInspections = async () => {
    try {
      const response = await api.get('/admin/inspections/pending');
      console.log('Pending inspections:', response.data);
      setInspections(response.data);
    } catch (error: any) {
      console.error('Error fetching pending inspections:', error);
      Alert.alert('Error', 'Failed to fetch pending inspections');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchPendingInspections();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchPendingInspections();
  };

  const renderInspectionItem = ({ item }: { item: PendingInspection }) => (
    <TouchableOpacity 
      style={styles.inspectionCard}
      onPress={() => router.push(`/inspections/set-datetime?id=${item.id}`)}
    >
      <View style={styles.inspectionHeader}>
        <View style={styles.inspectionInfo}>
          <Text style={styles.inspectionAddress} numberOfLines={1}>
            {item.quote.street_address}
          </Text>
          <Text style={styles.inspectionCity}>
            {item.quote.city}, {item.quote.state} {item.quote.zip_code}
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={24} color="#C7C7CC" />
      </View>
      
      <View style={styles.inspectionDetails}>
        <View style={styles.detailRow}>
          <Ionicons name="person-outline" size={16} color="#8E8E93" />
          <Text style={styles.detailText}>{item.customer.name}</Text>
        </View>
        <View style={styles.detailRow}>
          <Ionicons name="home-outline" size={16} color="#8E8E93" />
          <Text style={styles.detailText}>{item.quote.inspection_type}</Text>
        </View>
        <View style={styles.detailRow}>
          <Ionicons name="cash-outline" size={16} color="#8E8E93" />
          <Text style={styles.detailText}>${item.total_amount.toFixed(2)}</Text>
        </View>
      </View>

      <View style={styles.divider} />

      <View style={styles.preferencesSection}>
        <Text style={styles.preferencesTitle}>Customer Preferences:</Text>
        <View style={styles.preferenceRow}>
          <Ionicons name="calendar-outline" size={16} color="#007AFF" />
          <Text style={styles.preferenceLabel}>Option Period Ends:</Text>
          <Text style={styles.preferenceValue}>
            {format(new Date(item.option_period_end), 'MMM dd, yyyy')}
          </Text>
        </View>
        <View style={styles.preferenceRow}>
          <Ionicons name="time-outline" size={16} color="#007AFF" />
          <Text style={styles.preferenceLabel}>Preferred Days:</Text>
          <Text style={styles.preferenceValue}>{item.best_days}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.push('/(tabs)')} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#007AFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Pending Scheduling</Text>
        <View style={styles.placeholder} />
      </View>

      <FlatList
        data={inspections}
        renderItem={renderInspectionItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="checkmark-circle-outline" size={64} color="#C7C7CC" />
            <Text style={styles.emptyText}>No pending scheduling requests</Text>
            <Text style={styles.emptySubtext}>All inspections have been scheduled</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  backButton: {
    padding: 8,
    marginLeft: -8,
    minWidth: 44,
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1C1C1E',
  },
  placeholder: {
    width: 32,
  },
  listContent: {
    padding: 16,
    flexGrow: 1,
  },
  inspectionCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  inspectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  inspectionInfo: {
    flex: 1,
    marginRight: 12,
  },
  inspectionAddress: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1C1C1E',
    marginBottom: 4,
  },
  inspectionCity: {
    fontSize: 14,
    color: '#8E8E93',
  },
  inspectionDetails: {
    gap: 8,
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  detailText: {
    fontSize: 14,
    color: '#8E8E93',
  },
  divider: {
    height: 1,
    backgroundColor: '#E5E5EA',
    marginVertical: 12,
  },
  preferencesSection: {
    gap: 8,
  },
  preferencesTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1C1C1E',
    marginBottom: 4,
  },
  preferenceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  preferenceLabel: {
    fontSize: 14,
    color: '#8E8E93',
  },
  preferenceValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#007AFF',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 80,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#8E8E93',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#C7C7CC',
    marginTop: 8,
  },
});
