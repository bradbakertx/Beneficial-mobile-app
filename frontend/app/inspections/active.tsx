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
  Platform,
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

  const handleCancelInspection = async (inspection: ActiveInspection) => {
    console.log('=== CANCEL BUTTON CLICKED ===');
    console.log('Inspection to cancel:', inspection);
    
    // Web-compatible confirmation
    const confirmed = Platform.OS === 'web' 
      ? window.confirm(`Are you sure you want to cancel the inspection at ${inspection.property_address}?\n\nCalendar notifications will be sent to you and ${inspection.customer_name}.`)
      : await new Promise<boolean>((resolve) => {
          Alert.alert(
            'Cancel Inspection',
            `Are you sure you want to cancel the inspection at ${inspection.property_address}?\n\nCalendar notifications will be sent to you and ${inspection.customer_name}.`,
            [
              {
                text: 'No, Keep It',
                style: 'cancel',
                onPress: () => resolve(false),
              },
              {
                text: 'Yes, Cancel',
                style: 'destructive',
                onPress: () => resolve(true),
              },
            ]
          );
        });
    
    if (!confirmed) {
      console.log('User cancelled the cancellation');
      return;
    }
    
    try {
      console.log('User confirmed cancellation');
      console.log('Calling API to cancel inspection:', inspection.id);
      
      const response = await api.delete(`/admin/inspections/${inspection.id}/cancel`);
      console.log('Cancel response:', response.data);
      console.log('Emails sent successfully, removing inspection from local state');
      
      // Remove from local state immediately (no success dialog)
      setInspections(inspections.filter(i => i.id !== inspection.id));
      
      // Navigate back to dashboard
      router.push('/(tabs)');
    } catch (error: any) {
      console.error('Error cancelling inspection:', error);
      console.error('Error details:', error.response?.data);
      
      const errorMessage = error.response?.data?.detail || 'Failed to cancel inspection';
      if (Platform.OS === 'web') {
        alert(`Error: ${errorMessage}`);
      } else {
        Alert.alert('Error', errorMessage);
      }
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
      case 'scheduled':
        return '#34C759';
      case 'pending_scheduling':
        return '#FF9500';
      case 'completed':
        return '#007AFF';
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
          <Text style={styles.inspectionAddress} numberOfLines={2}>
            {item.property_address}
          </Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
          <Text style={styles.statusText}>
            {item.status === 'scheduled' ? 'Confirmed' : 'Pending'}
          </Text>
        </View>
      </View>
      
      <View style={styles.inspectionDetails}>
        <View style={styles.detailRow}>
          <Ionicons name="person-outline" size={16} color="#8E8E93" />
          <Text style={styles.detailText}>{item.customer_name}</Text>
        </View>
        <View style={styles.detailRow}>
          <Ionicons name="mail-outline" size={16} color="#8E8E93" />
          <Text style={styles.detailText}>{item.customer_email}</Text>
        </View>
        {item.scheduled_date && item.scheduled_time && (
          <View style={styles.detailRow}>
            <Ionicons name="calendar-outline" size={16} color="#8E8E93" />
            <Text style={styles.detailText}>
              {item.scheduled_date} at {item.scheduled_time}
            </Text>
          </View>
        )}
      </View>

      <View style={styles.footer}>
        <TouchableOpacity 
          style={styles.cancelButton}
          onPress={(e) => {
            e.stopPropagation(); // Prevent card click
            handleCancelInspection(item);
          }}
        >
          <Ionicons name="close-circle" size={20} color="#FF3B30" />
          <Text style={styles.cancelButtonText}>Cancel Inspection</Text>
        </TouchableOpacity>
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
  footerText: {
    fontSize: 12,
    color: '#8E8E93',
  },
  cancelButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#FFF5F5',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FFE5E5',
  },
  cancelButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FF3B30',
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
