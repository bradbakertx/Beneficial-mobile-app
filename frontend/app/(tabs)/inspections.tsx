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
import { useAuth } from '../../contexts/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import api from '../../services/api';
import { format } from 'date-fns';

interface Inspection {
  id: string;
  property_address: string;
  inspection_date: string;
  inspection_time: string;
  status: string;
  inspector_name?: string;
  report_url?: string;
}

export default function InspectionsScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const [inspections, setInspections] = useState<Inspection[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchInspections = async () => {
    try {
      let endpoint = '/inspections';
      if (user?.role === 'owner' || user?.role === 'admin') {
        endpoint = '/admin/inspections/confirmed';
      }
      const response = await api.get(endpoint);
      
      // For customers, filter to show only scheduled inspections
      let inspectionsList = response.data;
      if (user?.role === 'customer') {
        inspectionsList = inspectionsList.filter((i: any) => i.status === 'scheduled');
      }
      
      setInspections(inspectionsList);
    } catch (error: any) {
      console.error('Error fetching inspections:', error);
      if (error.response?.status !== 401) {
        Alert.alert('Error', 'Failed to fetch inspections');
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchInspections();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchInspections();
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'scheduled':
      case 'pending':
        return '#FF9500';
      case 'confirmed':
        return '#007AFF';
      case 'completed':
        return '#34C759';
      case 'cancelled':
        return '#FF3B30';
      default:
        return '#8E8E93';
    }
  };

  const renderInspectionItem = ({ item }: { item: Inspection }) => {
    // Map scheduled_date/scheduled_time to inspection_date/inspection_time for display
    const displayDate = item.inspection_date || (item as any).scheduled_date;
    const displayTime = item.inspection_time || (item as any).scheduled_time;
    
    return (
      <TouchableOpacity style={styles.inspectionCard}>
        <View style={styles.inspectionHeader}>
          <View style={styles.inspectionInfo}>
            <Text style={styles.inspectionAddress} numberOfLines={1}>
              {item.property_address}
            </Text>
            {item.inspector_name && (
              <Text style={styles.inspectorName}>Inspector: {item.inspector_name}</Text>
            )}
          </View>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
            <Text style={styles.statusText}>{item.status}</Text>
          </View>
        </View>
        
        <View style={styles.inspectionDetails}>
          {displayDate && (
            <View style={styles.detailRow}>
              <Ionicons name="calendar" size={18} color="#007AFF" />
              <Text style={styles.detailText}>
                {format(new Date(displayDate), 'MMMM dd, yyyy')}
              </Text>
            </View>
          )}
          {displayTime && (
            <View style={styles.detailRow}>
              <Ionicons name="time" size={18} color="#007AFF" />
              <Text style={styles.detailText}>{displayTime}</Text>
            </View>
          )}
        </View>

        {/* Agreement Button for Customers */}
        {user?.role === 'customer' && !item.agreement_signed && (
          <TouchableOpacity
            style={styles.agreementButton}
            onPress={() => router.push(`/inspections/agreement?id=${item.id}`)}
          >
            <Ionicons name="document-text-outline" size={20} color="#FF9500" />
            <Text style={styles.agreementButtonText}>Sign Pre-Inspection Agreement</Text>
            <Ionicons name="chevron-forward" size={18} color="#FF9500" />
          </TouchableOpacity>
        )}

        {item.report_url && (
          <TouchableOpacity style={styles.reportButton}>
            <Ionicons name="document-text" size={18} color="#007AFF" />
            <Text style={styles.reportButtonText}>View Report</Text>
          </TouchableOpacity>
        )}
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <FlatList
        data={inspections}
        renderItem={renderInspectionItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="clipboard-outline" size={64} color="#C7C7CC" />
            <Text style={styles.emptyText}>No inspections scheduled</Text>
            <Text style={styles.emptySubtext}>Schedule an inspection to get started</Text>
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
    fontSize: 16,
    fontWeight: '600',
    color: '#1C1C1E',
    marginBottom: 4,
  },
  inspectorName: {
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
    textTransform: 'capitalize',
  },
  inspectionDetails: {
    gap: 8,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  detailText: {
    fontSize: 14,
    color: '#1C1C1E',
  },
  reportButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 12,
    paddingVertical: 10,
    backgroundColor: '#F2F2F7',
    borderRadius: 8,
  },
  reportButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#007AFF',
  },
  agreementButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#FFF3E0',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FF9500',
  },
  agreementButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FF9500',
    flex: 1,
    marginLeft: 8,
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
