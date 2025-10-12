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

interface ActiveInspection {
  id: string;
  quote_id: string;
  customer_id: string;
  customer_email: string;
  customer_name: string;
  property_address: string;
  status: string;
  scheduled_date: string | null;
  scheduled_time: string | null;
  preferred_date: string | null;
  preferred_time: string | null;
  created_at: string;
  updated_at: string;
}

export default function ActiveInspectionsScreen() {
  const router = useRouter();
  const [inspections, setInspections] = useState<ActiveInspection[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchActiveInspections = async () => {
    try {
      const response = await api.get('/admin/inspections/confirmed');
      console.log('Active inspections:', response.data);
      setInspections(response.data);
    } catch (error: any) {
      console.error('Error fetching active inspections:', error);
      Alert.alert('Error', 'Failed to fetch active inspections');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchActiveInspections();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchActiveInspections();
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'confirmed':
        return '#34C759';
      case 'awaiting_confirmation':
        return '#FF9500';
      default:
        return '#8E8E93';
    }
  };

  const renderInspectionItem = ({ item }: { item: ActiveInspection }) => (
    <TouchableOpacity 
      style={styles.inspectionCard}
      onPress={() => router.push(`/inspections/detail?id=${item.id}`)}
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
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
          <Text style={styles.statusText}>
            {item.status === 'awaiting_confirmation' ? 'Awaiting' : 'Confirmed'}
          </Text>
        </View>
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
          <Ionicons name="calendar-outline" size={16} color="#8E8E93" />
          <Text style={styles.detailText}>
            {format(new Date(item.inspection_date), 'MMM dd, yyyy')} at {item.inspection_time}
          </Text>
        </View>
        <View style={styles.detailRow}>
          <Ionicons name="cash-outline" size={16} color="#8E8E93" />
          <Text style={styles.detailText}>${item.total_amount.toFixed(2)}</Text>
        </View>
      </View>

      <View style={styles.footer}>
        <View style={styles.paymentBadge}>
          <Ionicons 
            name={item.payment_status === 'paid' ? 'checkmark-circle' : 'time-outline'} 
            size={16} 
            color={item.payment_status === 'paid' ? '#34C759' : '#FF9500'} 
          />
          <Text style={styles.paymentText}>
            {item.payment_status === 'paid' ? 'Paid' : 'Payment Pending'}
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color="#C7C7CC" />
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
        <Text style={styles.headerTitle}>Active Inspections</Text>
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
            <Ionicons name="clipboard-outline" size={64} color="#C7C7CC" />
            <Text style={styles.emptyText}>No active inspections</Text>
            <Text style={styles.emptySubtext}>Confirmed inspections will appear here</Text>
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
    padding: 4,
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
    alignItems: 'flex-start',
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
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#fff',
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
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E5E5EA',
  },
  paymentBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  paymentText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1C1C1E',
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
