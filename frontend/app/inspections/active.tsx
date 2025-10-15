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
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import api from '../../services/api';
import { format } from 'date-fns';
import { useAuth } from '../../contexts/AuthContext';
import * as DocumentPicker from 'expo-document-picker';

interface ActiveInspection {
  id: string;
  quote_id: string;
  customer_id: string;
  customer_email: string;
  customer_name: string;
  customer_phone?: string;
  property_address: string;
  status: string;
  scheduled_date: string | null;
  scheduled_time: string | null;
  preferred_date: string | null;
  preferred_time: string | null;
  fee_amount?: number;
  is_paid?: boolean;
  payment_completed?: boolean;
  created_at: string;
  updated_at: string;
}

export default function ActiveInspectionsScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [inspections, setInspections] = useState<ActiveInspection[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [selectedInspection, setSelectedInspection] = useState<ActiveInspection | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState('');
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentInspection, setPaymentInspection] = useState<ActiveInspection | null>(null);
  const [marking, setMarking] = useState(false);

  const fetchActiveInspections = async () => {
    try {
      // Use appropriate endpoint based on user role
      const endpoint = (user?.role === 'owner' || user?.role === 'admin') 
        ? '/admin/inspections/confirmed' 
        : '/inspections';
      
      const response = await api.get(endpoint);
      console.log('Active inspections:', response.data);
      
      // For customers and agents, filter to only show 'scheduled' status
      let inspectionsList = response.data;
      if (user?.role === 'customer' || user?.role === 'agent') {
        inspectionsList = inspectionsList.filter((i: any) => i.status === 'scheduled');
      }
      
      setInspections(inspectionsList);
    } catch (error: any) {
      console.error('Error fetching active inspections:', error);
      Alert.alert('Error', 'Failed to fetch active inspections');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleCancelInspection = (inspection: ActiveInspection) => {
    console.log('=== Cancel button pressed ===');
    console.log('Inspection ID:', inspection.id);
    console.log('Property:', inspection.property_address);
    
    setSelectedInspection(inspection);
    setShowCancelModal(true);
  };

  const handleFinalizeInspection = async (inspection: ActiveInspection) => {
    Alert.alert(
      'Finalize Inspection',
      `Are you sure you want to finalize this inspection? This will send reports to the customer and agent, and move the inspection to "My Reports".`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Finalize',
          onPress: async () => {
            try {
              const response = await api.post(`/inspections/${inspection.id}/finalize`);
              
              Alert.alert(
                'Success',
                'Inspection finalized! Notifications and emails sent.',
                [{ text: 'OK', onPress: () => fetchActiveInspections() }]
              );
            } catch (error: any) {
              console.error('Finalize error:', error);
              const errorMessage = error.response?.data?.detail || 'Failed to finalize inspection';
              Alert.alert('Error', errorMessage);
            }
          },
        },
      ]
    );
  };

  const handleUploadReport = async (inspection: ActiveInspection) => {
    try {
      // Pick multiple PDF documents
      const result = await DocumentPicker.getDocumentAsync({
        type: 'application/pdf',
        copyToCacheDirectory: true,
        multiple: true, // Allow multiple file selection
      });

      if (result.canceled) {
        return;
      }

      const files = result.assets;
      
      // Validate all files are PDFs
      const invalidFiles = files.filter(f => !f.name.toLowerCase().endsWith('.pdf'));
      if (invalidFiles.length > 0) {
        Alert.alert('Invalid Files', 'Please select only PDF files');
        return;
      }

      // Show confirmation with file count
      const fileNames = files.map(f => f.name).join(', ');
      const fileCount = files.length;
      const fileWord = fileCount === 1 ? 'file' : 'files';
      
      Alert.alert(
        'Upload Reports',
        `Upload ${fileCount} ${fileWord} for ${inspection.property_address}?\n\n${fileNames}`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Upload',
            onPress: () => {
              // Small delay to let Alert dismiss first
              setTimeout(async () => {
                // Set uploading state
                setUploading(true);
                setUploadProgress(`Uploading ${fileCount} ${fileWord}...`);
                console.log('🚀 Starting upload...');
                
                try {
                  // Create FormData
                  const formData = new FormData();
                  
                  // Add all files to FormData
                  console.log(`📦 Adding ${fileCount} files to FormData...`);
                  files.forEach((file, idx) => {
                    const fileToUpload: any = {
                      uri: file.uri,
                      type: 'application/pdf',
                      name: file.name,
                    };
                    formData.append('files', fileToUpload);
                    console.log(`  ✓ File ${idx + 1}: ${file.name}`);
                  });

                  // Upload to backend
                  console.log('📤 Uploading to backend...');
                  const response = await api.post(
                    `/inspections/${inspection.id}/report/upload`,
                    formData,
                    {
                      headers: {
                        'Content-Type': 'multipart/form-data',
                      },
                    }
                  );

                  console.log('✅ Upload successful!', response.data);
                  
                  // Clear uploading state
                  setUploading(false);
                  setUploadProgress('');

                  Alert.alert(
                    'Success',
                    `${fileCount} report ${fileWord} uploaded successfully!`,
                    [{ text: 'OK', onPress: () => fetchActiveInspections() }]
                  );
                } catch (error: any) {
                  console.error('❌ Upload error:', error);
                  console.error('Error details:', error.response?.data);
                  
                  // Clear uploading state
                  setUploading(false);
                  setUploadProgress('');
                  
                  const errorMessage = error.response?.data?.detail || 'Failed to upload reports';
                  Alert.alert('Upload Failed', errorMessage);
                }
              }, 500); // 500ms delay to let Alert dismiss
            },
          },
        ]
      );
    } catch (error) {
      console.error('Document picker error:', error);
      Alert.alert('Error', 'Failed to select files');
    }
  };

  const confirmCancellation = async () => {
    if (!selectedInspection) return;
    
    console.log('User confirmed cancellation');
    setCancelling(true);
    
    try {
      console.log('Calling DELETE /api/admin/inspections/' + selectedInspection.id + '/cancel');
      
      const response = await api.delete(`/admin/inspections/${selectedInspection.id}/cancel`);
      console.log('Cancel response:', response.data);
      
      setShowCancelModal(false);
      setSelectedInspection(null);
      
      Alert.alert(
        'Success',
        'Inspection cancelled successfully. Calendar cancellations have been sent.',
        [{ text: 'OK' }]
      );
      
      // Refresh the list
      fetchActiveInspections();
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

  useEffect(() => {
    fetchActiveInspections();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchActiveInspections();
  };

  const handleMarkAsPaid = async (paymentMethod: string) => {
    if (!paymentInspection) return;
    
    setMarking(true);
    try {
      await api.post(`/inspections/${paymentInspection.id}/mark-paid?payment_method=${encodeURIComponent(paymentMethod)}`);
      
      Alert.alert('Success', `Inspection marked as paid via ${paymentMethod}`);
      setShowPaymentModal(false);
      setPaymentInspection(null);
      
      // Refresh list
      fetchActiveInspections();
    } catch (error: any) {
      console.error('Error marking as paid:', error);
      Alert.alert('Error', error.response?.data?.detail || 'Failed to mark as paid');
    } finally {
      setMarking(false);
    }
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
    <View style={styles.inspectionCard}>
      <TouchableOpacity 
        style={styles.cardContent}
        onPress={() => router.push(`/inspections/view-detail?id=${item.id}`)}
      >
        <View style={styles.inspectionHeader}>
          <View style={styles.inspectionInfo}>
            <Text style={styles.inspectionAddress} numberOfLines={2}>
              {item.property_address}
            </Text>
          </View>
          <View style={styles.statusContainer}>
            <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
              <Text style={styles.statusText}>
                {item.status === 'scheduled' ? 'Confirmed' : 'Pending'}
              </Text>
            </View>
            {item.fee_amount && (
              <Text style={styles.feeAmount}>${item.fee_amount.toFixed(2)}</Text>
            )}
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
          {item.customer_phone && (
            <View style={styles.detailRow}>
              <Ionicons name="call-outline" size={16} color="#8E8E93" />
              <Text style={styles.detailText}>{item.customer_phone}</Text>
            </View>
          )}
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
          <Text style={styles.viewDetailsText}>Tap to view details</Text>
          <Ionicons name="chevron-forward" size={20} color="#C7C7CC" />
        </View>
      </TouchableOpacity>
      
      <TouchableOpacity 
        style={styles.cancelButton}
        onPress={() => handleCancelInspection(item)}
      >
        <Ionicons name="close-circle" size={20} color="#FF3B30" />
        <Text style={styles.cancelButtonText}>Cancel Inspection</Text>
      </TouchableOpacity>
      
      <TouchableOpacity 
        style={styles.rescheduleButton}
        onPress={() => router.push(`/inspections/reschedule?id=${item.id}&currentDate=${item.scheduled_date}&currentTime=${item.scheduled_time}&address=${encodeURIComponent(item.property_address)}`)}
      >
        <Ionicons name="calendar-outline" size={20} color="#007AFF" />
        <Text style={styles.rescheduleButtonText}>Reschedule</Text>
      </TouchableOpacity>
      
      {/* Upload Report button - Owner/Inspector only */}
      {(user?.role === 'owner' || user?.role === 'admin' || user?.role === 'inspector') && (
        <TouchableOpacity 
          style={styles.uploadButton}
          onPress={() => handleUploadReport(item)}
        >
          <Ionicons name="cloud-upload-outline" size={20} color="#34C759" />
          <Text style={styles.uploadButtonText}>Upload Report</Text>
        </TouchableOpacity>
      )}
      
      {/* Finalize Inspection button - Owner/Inspector only */}
      {(user?.role === 'owner' || user?.role === 'admin' || user?.role === 'inspector') && (
        <TouchableOpacity 
          style={styles.finalizeButton}
          onPress={() => handleFinalizeInspection(item)}
        >
          <Ionicons name="checkmark-circle-outline" size={20} color="#007AFF" />
          <Text style={styles.finalizeButtonText}>Finalize Inspection</Text>
        </TouchableOpacity>
      )}
      
      {/* Mark as Paid button - Owner only, if not paid */}
      {(user?.role === 'owner' || user?.role === 'admin') && !item.is_paid && !item.payment_completed && item.fee_amount && (
        <TouchableOpacity 
          style={styles.markPaidButton}
          onPress={() => {
            setPaymentInspection(item);
            setShowPaymentModal(true);
          }}
        >
          <Ionicons name="cash" size={20} color="#FFF" />
          <Text style={styles.markPaidButtonText}>Mark as Paid</Text>
        </TouchableOpacity>
      )}
    </View>
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

      {/* Custom Cancellation Modal */}
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
              Calendar cancellation notifications will be sent to the customer, owner, and inspector.
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

      {/* Upload Progress Indicator */}
      {uploading && (
        <View style={styles.uploadOverlay}>
          <View style={styles.uploadIndicator}>
            <ActivityIndicator size="large" color="#34C759" />
            <Text style={styles.uploadText}>{uploadProgress}</Text>
            <Text style={styles.uploadSubtext}>Please wait...</Text>
          </View>
        </View>
      )}

      {/* Payment Method Modal */}
      <Modal
        visible={showPaymentModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => !marking && setShowPaymentModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Select Payment Method</Text>
            <Text style={styles.modalSubtitle}>
              How did the customer pay for this inspection?
            </Text>

            {/* Payment Method Options */}
            <TouchableOpacity
              style={styles.paymentOption}
              onPress={() => handleMarkAsPaid('Cash')}
              disabled={marking}
            >
              <Ionicons name="cash-outline" size={24} color="#34C759" />
              <Text style={styles.paymentOptionText}>Cash</Text>
              <Ionicons name="chevron-forward" size={20} color="#C7C7CC" />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.paymentOption}
              onPress={() => handleMarkAsPaid('Check')}
              disabled={marking}
            >
              <Ionicons name="document-text-outline" size={24} color="#007AFF" />
              <Text style={styles.paymentOptionText}>Check</Text>
              <Ionicons name="chevron-forward" size={20} color="#C7C7CC" />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.paymentOption}
              onPress={() => handleMarkAsPaid('Card/Mobile Tap')}
              disabled={marking}
            >
              <Ionicons name="card-outline" size={24} color="#FF9500" />
              <Text style={styles.paymentOptionText}>Card/Mobile Tap</Text>
              <Ionicons name="chevron-forward" size={20} color="#C7C7CC" />
            </TouchableOpacity>

            {/* Cancel Button */}
            <TouchableOpacity
              style={styles.cancelButtonModal}
              onPress={() => setShowPaymentModal(false)}
              disabled={marking}
            >
              <Text style={styles.cancelButtonModalText}>Cancel</Text>
            </TouchableOpacity>

            {marking && <ActivityIndicator size="large" color="#007AFF" style={{ marginTop: 16 }} />}
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
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  cardContent: {
    padding: 16,
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
  statusContainer: {
    alignItems: 'flex-end',
    gap: 6,
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
  feeAmount: {
    fontSize: 16,
    fontWeight: '700',
    color: '#34C759',
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
  viewDetailsText: {
    fontSize: 14,
    color: '#007AFF',
    fontWeight: '500',
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
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderTopWidth: 1,
    borderTopColor: '#F2F2F7',
    backgroundColor: '#FFF',
  },
  cancelButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FF3B30',
  },
  rescheduleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderTopWidth: 1,
    borderTopColor: '#F2F2F7',
    backgroundColor: '#FFF',
  },
  rescheduleButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#007AFF',
  },
  uploadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderTopWidth: 1,
    borderTopColor: '#F2F2F7',
    backgroundColor: '#FFF',
  },
  uploadButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#34C759',
  },
  finalizeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderTopWidth: 1,
    borderTopColor: '#F2F2F7',
    backgroundColor: '#FFF',
  },
  finalizeButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#007AFF',
  },
  uploadOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 999,
  },
  uploadIndicator: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  uploadText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1C1C1E',
    marginTop: 16,
  },
  uploadSubtext: {
    fontSize: 14,
    color: '#8E8E93',
    marginTop: 8,
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
    marginBottom: 24,
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
});
