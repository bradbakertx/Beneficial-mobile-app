import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
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

interface Inspection {
  id: string;
  property_address: string;
  offered_time_slots?: Array<{
    date: string;
    times: string[];
  }>;
  created_at: string;
  status: string;
}

export default function CustomerPendingSchedulingScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [inspections, setInspections] = useState<Inspection[]>([]);
  const [cancelingId, setCancelingId] = useState<string | null>(null);

  useEffect(() => {
    fetchInspections();
  }, []);

  const fetchInspections = async () => {
    try {
      const response = await api.get('/inspections');
      // Filter inspections awaiting customer selection
      const pending = response.data.filter(
        (i: Inspection) => i.status === 'awaiting_customer_selection'
      );
      setInspections(pending);
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

  const handleCancelInspection = async (inspectionId: string, propertyAddress: string) => {
    // Show confirmation using React Native Alert
    Alert.alert(
      'Cancel Inspection',
      `Are you sure you want to cancel the inspection for ${propertyAddress}?`,
      [
        {
          text: 'No',
          style: 'cancel'
        },
        {
          text: 'Yes, Cancel',
          style: 'destructive',
          onPress: async () => {
            setCancelingId(inspectionId);
            try {
              await api.delete(`/inspections/${inspectionId}`);
              
              // Show success message
              Alert.alert('Success', 'Inspection canceled successfully.');
              
              // Refresh the list
              fetchInspections();
            } catch (error: any) {
              console.error('Error canceling inspection:', error);
              const errorMessage = error.response?.data?.detail || 'Failed to cancel inspection. Please try again.';
              Alert.alert('Error', errorMessage);
            } finally {
              setCancelingId(null);
            }
          }
        }
      ]
    );
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
        <Text style={styles.headerTitle}>Available Times</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {inspections.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="time-outline" size={64} color="#C7C7CC" />
            <Text style={styles.emptyText}>No available time slots yet</Text>
            <Text style={styles.emptySubtext}>
              The inspector will offer available dates and times soon
            </Text>
          </View>
        ) : (
          inspections.map((inspection) => (
            <View key={inspection.id} style={styles.inspectionCard}>
              <TouchableOpacity
                onPress={() => router.push(`/inspections/select-time?id=${inspection.id}`)}
                style={styles.cardContent}
              >
                <View style={styles.cardHeader}>
                  <View style={styles.propertyInfo}>
                    <Ionicons name="home" size={20} color="#007AFF" />
                    <Text style={styles.propertyAddress} numberOfLines={2}>
                      {inspection.property_address}
                    </Text>
                  </View>
                  <View style={styles.statusBadge}>
                    <Text style={styles.statusText}>NEW</Text>
                  </View>
                </View>

                <View style={styles.cardBody}>
                  <Text style={styles.infoTitle}>
                    <Ionicons name="calendar" size={16} color="#34C759" /> Available Time Slots:
                  </Text>
                  
                  {inspection.offered_time_slots && inspection.offered_time_slots.length > 0 ? (
                    <View style={styles.timeSlotPreview}>
                      {/* Group slots by date for display */}
                      {(() => {
                        // Group by date
                        const groupedSlots: { [key: string]: any[] } = {};
                        inspection.offered_time_slots.forEach((slot: any) => {
                          if (!groupedSlots[slot.date]) {
                            groupedSlots[slot.date] = [];
                          }
                          groupedSlots[slot.date].push(slot);
                        });
                        
                        // Get first 2 dates
                        const dates = Object.keys(groupedSlots).sort().slice(0, 2);
                        
                        return dates.map((date, index) => (
                          <View key={index} style={styles.previewSlot}>
                            <Text style={styles.previewDate}>
                              {format(new Date(date), 'MMM dd')}
                            </Text>
                            <Text style={styles.previewTimes}>
                              {groupedSlots[date].map(s => s.time).join(', ')}
                            </Text>
                          </View>
                        ));
                      })()}
                      {Object.keys(inspection.offered_time_slots.reduce((acc: any, slot: any) => {
                        acc[slot.date] = true;
                        return acc;
                      }, {})).length > 2 && (
                        <Text style={styles.moreSlots}>
                          +{Object.keys(inspection.offered_time_slots.reduce((acc: any, slot: any) => {
                            acc[slot.date] = true;
                            return acc;
                          }, {})).length - 2} more date(s)
                        </Text>
                      )}
                    </View>
                  ) : (
                    <Text style={styles.noSlotsText}>Time slots pending...</Text>
                  )}
                </View>

                <View style={styles.cardFooter}>
                  <Text style={styles.viewDetails}>Tap to select a time slot</Text>
                  <Ionicons name="chevron-forward" size={20} color="#007AFF" />
                </View>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => handleCancelInspection(inspection.id, inspection.property_address)}
                disabled={cancelingId === inspection.id}
              >
                {cancelingId === inspection.id ? (
                  <ActivityIndicator size="small" color="#FF3B30" />
                ) : (
                  <>
                    <Ionicons name="close-circle" size={20} color="#FF3B30" />
                    <Text style={styles.cancelButtonText}>Cancel Inspection</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
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
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardContent: {
    padding: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F2F2F7',
  },
  propertyInfo: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    flex: 1,
  },
  propertyAddress: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1C1C1E',
    flex: 1,
  },
  statusBadge: {
    backgroundColor: '#34C759',
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
  infoTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1C1C1E',
    marginBottom: 8,
  },
  timeSlotPreview: {
    backgroundColor: '#F9F9F9',
    padding: 12,
    borderRadius: 8,
    gap: 8,
  },
  previewSlot: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  previewDate: {
    fontSize: 14,
    fontWeight: '600',
    color: '#007AFF',
  },
  previewTimes: {
    fontSize: 13,
    color: '#1C1C1E',
  },
  moreSlots: {
    fontSize: 12,
    color: '#8E8E93',
    fontStyle: 'italic',
  },
  noSlotsText: {
    fontSize: 14,
    color: '#8E8E93',
    fontStyle: 'italic',
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
  cancelButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: '#F2F2F7',
    gap: 8,
  },
  cancelButtonText: {
    fontSize: 14,
    color: '#FF3B30',
    fontWeight: '600',
  },
});
