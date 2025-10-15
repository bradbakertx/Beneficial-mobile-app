import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
  Modal,
  Linking,
  TextInput,
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
  agreement_signed?: boolean;
  scheduled_date?: string;
  scheduled_time?: string;
}

export default function InspectionsScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const [activeInspections, setActiveInspections] = useState<Inspection[]>([]);
  const [finalizedInspections, setFinalizedInspections] = useState<Inspection[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showRescheduleModal, setShowRescheduleModal] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [selectedInspection, setSelectedInspection] = useState<Inspection | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const fetchInspections = async () => {
    try {
      let endpoint = '/inspections';
      if (user?.role === 'owner' || user?.role === 'admin') {
        endpoint = '/admin/inspections/confirmed';
      }
      const response = await api.get(endpoint);
      
      console.log('=== FETCHED INSPECTIONS ===');
      console.log('Endpoint:', endpoint);
      console.log('Total inspections:', response.data.length);
      console.log('First inspection sample:', JSON.stringify(response.data[0], null, 2));
      
      // Separate active and finalized inspections
      const allInspections = response.data;
      
      // For Owner/Admin: Active = not finalized, My Reports = finalized
      // For Customer: Active = scheduled and not finalized, My Reports = finalized
      let active, finalized;
      
      if (user?.role === 'owner' || user?.role === 'admin') {
        // Owner sees all non-finalized inspections in Active (scheduled, pending, etc.)
        active = allInspections.filter((i: any) => !i.finalized && i.status !== 'finalized');
        finalized = allInspections.filter((i: any) => i.finalized || i.status === 'finalized');
      } else {
        // Customer/Agent only sees 'scheduled' status in Active
        active = allInspections.filter((i: any) => i.status === 'scheduled' && !i.finalized);
        finalized = allInspections.filter((i: any) => i.finalized || i.status === 'finalized');
      }
      
      console.log('Active inspections:', active.length);
      console.log('Finalized inspections:', finalized.length);
      if (active.length > 0) {
        console.log('Active inspection sample:', JSON.stringify(active[0], null, 2));
      }
      if (finalized.length > 0) {
        console.log('Finalized inspection sample:', JSON.stringify(finalized[0], null, 2));
      }
      
      // Sort finalized by date (newest first)
      finalized.sort((a: any, b: any) => {
        const dateA = new Date(a.finalized_at || a.scheduled_date).getTime();
        const dateB = new Date(b.finalized_at || b.scheduled_date).getTime();
        return dateB - dateA;
      });
      
      setActiveInspections(active);
      setFinalizedInspections(finalized);
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

  // Auto-navigate to agreement if there's an unsigned scheduled inspection (customer only)
  useEffect(() => {
    if (user?.role === 'customer' && activeInspections.length > 0 && !loading) {
      // Find first scheduled inspection without agreement signed
      const unsignedInspection = activeInspections.find(
        (insp) => insp.status === 'scheduled' && !insp.agreement_signed
      );
      
      if (unsignedInspection) {
        console.log('Found unsigned agreement, navigating to agreement screen:', unsignedInspection.id);
        // Navigate to agreement screen automatically
        router.push(`/inspections/agreement?id=${unsignedInspection.id}`);
      }
    }
  }, [activeInspections, loading, user?.role]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchInspections();
  };

  const handleCancelInspection = (inspection: Inspection) => {
    console.log('=== Cancel button pressed (customer) ===');
    console.log('Inspection ID:', inspection.id);
    console.log('Property:', inspection.property_address);
    
    setSelectedInspection(inspection);
    setShowCancelModal(true);
  };

  const confirmCancellation = async () => {
    if (!selectedInspection) return;
    
    console.log('Customer confirmed cancellation');
    setCancelling(true);
    
    try {
      console.log('Calling DELETE /api/inspections/' + selectedInspection.id);
      
      const response = await api.delete(`/inspections/${selectedInspection.id}`);
      console.log('Cancel response:', response.data);
      
      setShowCancelModal(false);
      setSelectedInspection(null);
      
      Alert.alert(
        'Success',
        'Inspection cancelled successfully. Calendar cancellations and notifications have been sent.',
        [{ text: 'OK' }]
      );
      
      // Refresh the list
      fetchInspections();
    } catch (error: any) {
      console.error('Error cancelling inspection:', error);
      console.error('Error response:', error.response?.data);
      
      const errorMessage = error.response?.data?.detail || 'Failed to cancel inspection';
      Alert.alert('Error', errorMessage);
    } finally {
      setCancelling(false);
    }
  };

  const closeCancelModal = () => {
    if (!cancelling) {
      setShowCancelModal(false);
      setSelectedInspection(null);
    }
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
    
    // Debug Pay Now button visibility
    console.log('=== Inspection Card Debug ===');
    console.log('Property:', item.property_address);
    console.log('User role:', user?.role);
    console.log('Payment completed:', (item as any).payment_completed);
    console.log('Fee amount:', (item as any).fee_amount);
    console.log('Should show Pay Now?:', user?.role === 'customer' && !(item as any).payment_completed && (item as any).fee_amount);
    
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
          <View style={styles.statusContainer}>
            <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
              <Text style={styles.statusText}>{item.status}</Text>
            </View>
            
            {/* Pay Now button - only show if not paid for customers */}
            {user?.role === 'customer' && !(item as any).payment_completed && (item as any).fee_amount && (
              <TouchableOpacity 
                style={styles.payNowButtonNew}
                onPress={() => router.push(`/inspections/payment?id=${item.id}&amount=${(item as any).fee_amount}&address=${encodeURIComponent(item.property_address)}`)}
              >
                <Ionicons name="card" size={18} color="#FFF" />
                <Text style={styles.payNowTextNew}>Pay Now ${(item as any).fee_amount}</Text>
              </TouchableOpacity>
            )}
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
        {user?.role === 'customer' && !item.agreement_signed && item.status === 'scheduled' && (
          <TouchableOpacity
            style={styles.agreementButton}
            onPress={() => router.push(`/inspections/agreement?id=${item.id}`)}
          >
            <Ionicons name="document-text-outline" size={20} color="#FF9500" />
            <Text style={styles.agreementButtonText}>Sign Pre-Inspection Agreement</Text>
            <Ionicons name="chevron-forward" size={18} color="#FF9500" />
          </TouchableOpacity>
        )}

        {/* Chat Button for Customers - Group Chat with Inspector and Agent */}
        {user?.role === 'customer' && item.status === 'scheduled' && (
          <TouchableOpacity
            style={styles.chatButton}
            onPress={() => router.push(`/chat?inspectionId=${item.id}&recipientName=Inspector and Agent&propertyAddress=${encodeURIComponent(item.property_address)}&customerName=${encodeURIComponent(user?.name || '')}`)}
          >
            <Ionicons name="chatbubble-outline" size={20} color="#34C759" />
            <Text style={styles.chatButtonText}>Chat with Inspector and Agent</Text>
          </TouchableOpacity>
        )}

        {/* Chat Button for Agents - Group Chat with Customer and Inspector */}
        {user?.role === 'agent' && item.status === 'scheduled' && (
          <TouchableOpacity
            style={styles.chatButton}
            onPress={() => router.push(`/chat?inspectionId=${item.id}&recipientName=Inspector and Customer&propertyAddress=${encodeURIComponent(item.property_address)}&customerName=${encodeURIComponent(user?.name || '')}`)}
          >
            <Ionicons name="chatbubble-outline" size={20} color="#FF9500" />
            <Text style={styles.chatButtonText}>Chat with Inspector and Customer</Text>
          </TouchableOpacity>
        )}

        {/* Reschedule Button for Customers */}
        {user?.role === 'customer' && item.status === 'scheduled' && (
          <TouchableOpacity
            style={styles.rescheduleButton}
            onPress={() => setShowRescheduleModal(true)}
          >
            <Ionicons name="calendar-outline" size={20} color="#007AFF" />
            <Text style={styles.rescheduleButtonText}>Request Reschedule</Text>
          </TouchableOpacity>
        )}

        {/* Cancel Button for Customers */}
        {user?.role === 'customer' && item.status === 'scheduled' && (
          <TouchableOpacity
            style={styles.cancelButton}
            onPress={() => handleCancelInspection(item)}
          >
            <Ionicons name="close-circle" size={20} color="#FF3B30" />
            <Text style={styles.cancelButtonText}>Cancel Inspection</Text>
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

  // Filter finalized inspections based on search query
  const filteredFinalizedInspections = finalizedInspections.filter((inspection) => {
    if (!searchQuery.trim()) return true;
    
    const query = searchQuery.toLowerCase();
    const address = inspection.property_address?.toLowerCase() || '';
    const customerName = inspection.customer_name?.toLowerCase() || '';
    
    return address.includes(query) || customerName.includes(query);
  });

  const renderFinalizedItem = (inspection: Inspection) => {
    const paymentCompleted = (inspection as any).payment_completed;
    const isUnlocked = paymentCompleted;
    
    const handleViewReports = () => {
      if (isUnlocked) {
        // Reports unlocked - will implement viewer in next phase
        Alert.alert('Reports Available', 'Report viewer will be implemented in the next phase.');
      } else {
        // Reports locked - redirect to payment
        Alert.alert(
          'Payment Required',
          'Please complete payment to unlock and view your reports.',
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Pay Now',
              onPress: () => {
                if ((inspection as any).fee_amount) {
                  router.push(`/inspections/payment?id=${inspection.id}&amount=${(inspection as any).fee_amount}&address=${encodeURIComponent(inspection.property_address)}`);
                }
              }
            }
          ]
        );
      }
    };
    
    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Ionicons name="checkmark-circle" size={24} color="#34C759" />
          <View style={styles.cardHeaderText}>
            <Text style={styles.cardTitleBold}>{inspection.property_address}</Text>
            <Text style={styles.cardCustomerName}>{inspection.customer_name}</Text>
            <Text style={styles.cardSubtitle}>
              {inspection.scheduled_date && format(new Date(inspection.scheduled_date), 'MMM d, yyyy')}
            </Text>
          </View>
        </View>
        
        {inspection.inspector_name && (
          <Text style={styles.inspectorText}>Inspector: {inspection.inspector_name}</Text>
        )}
        
        <TouchableOpacity 
          style={[
            styles.viewReportsButton,
            isUnlocked && styles.viewReportsButtonUnlocked
          ]}
          onPress={handleViewReports}
        >
          <Ionicons 
            name={isUnlocked ? "lock-open-outline" : "lock-closed-outline"} 
            size={20} 
            color={isUnlocked ? "#FFF" : "#000"} 
          />
          <Text style={[
            styles.viewReportsButtonText,
            isUnlocked && styles.viewReportsButtonTextUnlocked
          ]}>
            View/Download Reports
          </Text>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Active Inspections Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Active Inspections</Text>
          {activeInspections.length === 0 ? (
            <View style={styles.emptySection}>
              <Text style={styles.emptySectionText}>No active inspections</Text>
            </View>
          ) : (
            activeInspections.map((inspection) => (
              <View key={inspection.id}>
                {renderInspectionItem({ item: inspection })}
              </View>
            ))
          )}
        </View>

        {/* My Reports Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>My Reports</Text>
          
          {/* Search Bar - Only show for Owner/Agent */}
          {(user?.role === 'owner' || user?.role === 'agent') && finalizedInspections.length > 0 && (
            <View style={styles.searchContainer}>
              <Ionicons name="search-outline" size={20} color="#8E8E93" style={styles.searchIcon} />
              <TextInput
                style={styles.searchInput}
                placeholder="Search by customer name or address..."
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholderTextColor="#8E8E93"
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity onPress={() => setSearchQuery('')} style={styles.clearButton}>
                  <Ionicons name="close-circle" size={20} color="#8E8E93" />
                </TouchableOpacity>
              )}
            </View>
          )}
          
          {finalizedInspections.length === 0 ? (
            <View style={styles.emptySection}>
              <Text style={styles.emptySectionText}>No finalized inspections yet</Text>
            </View>
          ) : filteredFinalizedInspections.length === 0 ? (
            <View style={styles.emptySection}>
              <Text style={styles.emptySectionText}>No results found for "{searchQuery}"</Text>
            </View>
          ) : (
            filteredFinalizedInspections.map((inspection) => (
              <View key={inspection.id}>
                {renderFinalizedItem(inspection)}
              </View>
            ))
          )}
        </View>
      </ScrollView>

      {/* Customer Reschedule Request Modal */}
      <Modal
        visible={showRescheduleModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowRescheduleModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Ionicons name="calendar-outline" size={32} color="#007AFF" />
              <Text style={styles.modalTitle}>Request Reschedule</Text>
            </View>
            
            <Text style={styles.modalMessage}>
              To request a different day or time for your inspection, please call us directly:
            </Text>
            
            <TouchableOpacity
              style={styles.phoneButton}
              onPress={() => Linking.openURL('tel:2105620673')}
            >
              <Ionicons name="call" size={24} color="#fff" />
              <Text style={styles.phoneButtonText}>(210) 562-0673</Text>
            </TouchableOpacity>
            
            <Text style={styles.modalSubtext}>
              Our team will work with you to find a convenient time that fits your schedule.
            </Text>
            
            <TouchableOpacity
              style={styles.modalCloseButton}
              onPress={() => setShowRescheduleModal(false)}
            >
              <Text style={styles.modalCloseButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Customer Cancel Inspection Modal */}
      <Modal
        visible={showCancelModal}
        transparent={true}
        animationType="fade"
        onRequestClose={closeCancelModal}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Ionicons name="warning-outline" size={32} color="#FF3B30" />
              <Text style={styles.modalTitle}>Cancel Inspection</Text>
            </View>
            
            <Text style={styles.modalMessage}>
              Are you sure you want to cancel the inspection at{'\n\n'}
              <Text style={styles.modalAddress}>{selectedInspection?.property_address}</Text>
              {'\n\n'}
              Calendar cancellation notifications will be sent to you, the owner, and the inspector.
            </Text>
            
            <View style={styles.modalButtons}>
              <TouchableOpacity 
                style={[styles.modalButton, styles.modalButtonCancel]}
                onPress={closeCancelModal}
                disabled={cancelling}
              >
                <Text style={styles.modalButtonTextCancel}>No, Keep It</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.modalButton, styles.modalButtonConfirm]}
                onPress={confirmCancellation}
                disabled={cancelling}
              >
                {cancelling ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.modalButtonTextConfirm}>Yes, Cancel</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
  rescheduleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#E3F2FD',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#007AFF',
    marginTop: 8,
  },
  rescheduleButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#007AFF',
  },
  chatButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#E8F5E9',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#34C759',
    marginTop: 8,
  },
  chatButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#34C759',
  },
  cancelButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#FFE5E5',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FF3B30',
    marginTop: 8,
  },
  cancelButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FF3B30',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  modalHeader: {
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1C1C1E',
    marginTop: 12,
    textAlign: 'center',
  },
  modalMessage: {
    fontSize: 16,
    color: '#3A3A3C',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 20,
  },
  modalSubtext: {
    fontSize: 14,
    color: '#8E8E93',
    textAlign: 'center',
    lineHeight: 20,
    marginTop: 16,
  },
  phoneButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#34C759',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 12,
    shadowColor: '#34C759',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  phoneButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
  },
  modalCloseButton: {
    marginTop: 16,
    paddingVertical: 12,
    alignItems: 'center',
  },
  modalCloseButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#007AFF',
  },
  modalAddress: {
    fontWeight: '600',
    color: '#1C1C1E',
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalButtonCancel: {
    backgroundColor: '#F2F2F7',
  },
  modalButtonConfirm: {
    backgroundColor: '#FF3B30',
  },
  modalButtonTextCancel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1C1C1E',
  },
  modalButtonTextConfirm: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
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
  scrollContent: {
    padding: 16,
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1C1C1E',
    marginBottom: 16,
  },
  emptySection: {
    padding: 24,
    backgroundColor: '#FFF',
    borderRadius: 12,
    alignItems: 'center',
  },
  emptySectionText: {
    fontSize: 14,
    color: '#8E8E93',
  },
  viewReportsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#FFD700',
    borderRadius: 8,
    marginTop: 12,
  },
  viewReportsButtonUnlocked: {
    backgroundColor: '#34C759',
  },
  viewReportsButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000',
  },
  viewReportsButtonTextUnlocked: {
    color: '#FFF',
  },
  cardTitleBold: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1C1C1E',
    marginBottom: 4,
  },
  cardCustomerName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#3C3C43',
    marginBottom: 4,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#1C1C1E',
    paddingVertical: 4,
  },
  clearButton: {
    padding: 4,
    marginLeft: 8,
  },
  statusContainer: {
    alignItems: 'flex-end',
    gap: 8,
  },
  payNowButtonNew: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#34C759',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    shadowColor: '#34C759',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  payNowTextNew: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFF',
    letterSpacing: 0.3,
  },
});
