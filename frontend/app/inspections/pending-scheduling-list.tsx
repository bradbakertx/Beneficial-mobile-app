import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import api from '../../services/api';
import { format } from 'date-fns';

interface Inspection {
  id: string;
  customer_name: string;
  customer_email: string;
  property_address: string;
  option_period_end_date?: string;
  option_period_unsure: boolean;
  preferred_days_of_week: string[];
  created_at: string;
  status: string;
}

export default function PendingSchedulingListScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [inspections, setInspections] = useState<Inspection[]>([]);

  useEffect(() => {
    fetchInspections();
  }, []);

  const fetchInspections = async () => {
    try {
      const response = await api.get('/admin/inspections/pending-scheduling');
      setInspections(response.data);
    } catch (error) {
      console.error('Error fetching inspections:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchInspections();
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#007AFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Pending Scheduling</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {inspections.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="calendar-outline" size={64} color="#C7C7CC" />
            <Text style={styles.emptyText}>No pending scheduling requests</Text>
            <Text style={styles.emptySubtext}>
              Inspection scheduling requests will appear here
            </Text>
          </View>
        ) : (
          inspections.map((inspection) => (
            <TouchableOpacity
              key={inspection.id}
              style={styles.inspectionCard}
              onPress={() => router.push(`/inspections/offer-times?id=${inspection.id}`)}
            >
              <View style={styles.cardHeader}>
                <View style={styles.customerInfo}>
                  <Ionicons name="person" size={20} color="#007AFF" />
                  <Text style={styles.customerName}>{inspection.customer_name}</Text>
                </View>
                <View style={styles.statusBadge}>
                  <Text style={styles.statusText}>PENDING</Text>
                </View>
              </View>

              <View style={styles.cardBody}>
                <View style={styles.infoRow}>
                  <Ionicons name="location" size={16} color="#8E8E93" />
                  <Text style={styles.infoText}>{inspection.property_address}</Text>
                </View>

                <View style={styles.infoRow}>
                  <Ionicons name="mail" size={16} color="#8E8E93" />
                  <Text style={styles.infoText}>{inspection.customer_email}</Text>
                </View>

                <View style={styles.divider} />

                <View style={styles.preferencesSection}>
                  <Text style={styles.preferencesTitle}>Customer Preferences:</Text>
                  
                  <View style={styles.preferenceRow}>
                    <Ionicons name="calendar" size={16} color="#FF9500" />
                    <Text style={styles.preferenceLabel}>Option Period End:</Text>
                    <Text style={styles.preferenceValue}>
                      {inspection.option_period_unsure
                        ? 'Unsure'
                        : inspection.option_period_end_date
                        ? format(new Date(inspection.option_period_end_date), 'MMM dd, yyyy')
                        : 'Not specified'}
                    </Text>
                  </View>

                  <View style={styles.preferenceRow}>
                    <Ionicons name="time" size={16} color="#34C759" />
                    <Text style={styles.preferenceLabel}>Preferred Days:</Text>
                    <Text style={styles.preferenceValue}>
                      {inspection.preferred_days_of_week.join(', ')}
                    </Text>
                  </View>
                </View>
              </View>

              <View style={styles.cardFooter}>
                <Text style={styles.viewDetails}>Tap to offer time slots</Text>
                <Ionicons name="chevron-forward" size={20} color="#007AFF" />
              </View>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>
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
  content: {
    flex: 1,
    padding: 16,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
  },
  emptyText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#8E8E93',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#C7C7CC',
    marginTop: 8,
    textAlign: 'center',
    paddingHorizontal: 32,
  },
  inspectionCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F2F2F7',
  },
  customerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  customerName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1C1C1E',
  },
  statusBadge: {
    backgroundColor: '#FF9500',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '600',
  },
  cardBody: {
    gap: 8,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  infoText: {
    fontSize: 14,
    color: '#1C1C1E',
    flex: 1,
  },
  divider: {
    height: 1,
    backgroundColor: '#F2F2F7',
    marginVertical: 8,
  },
  preferencesSection: {
    backgroundColor: '#F9F9F9',
    padding: 12,
    borderRadius: 8,
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
    fontSize: 13,
    color: '#8E8E93',
    fontWeight: '500',
  },
  preferenceValue: {
    fontSize: 13,
    color: '#1C1C1E',
    fontWeight: '600',
    flex: 1,
    textAlign: 'right',
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F2F2F7',
  },
  viewDetails: {
    fontSize: 14,
    color: '#007AFF',
    fontWeight: '600',
  },
});
