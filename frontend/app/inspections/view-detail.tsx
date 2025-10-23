import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import api from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';

interface InspectionInfo {
  id: string;
  customer_id?: string;
  customer_name?: string;
  customer_email?: string;
  customer_phone?: string;
  property_address: string;
  scheduled_date?: string;
  scheduled_time?: string;
  inspector_name?: string;
  inspector_email?: string;
  inspector_phone?: string;
  agent_name?: string;
  agent_email?: string;
  agent_phone?: string;
  status: string;
  quote_id?: string;
  fee_amount?: number;
  is_paid?: boolean;
  payment_completed?: boolean;
  payment_method?: string;
  created_at: string;
  // Additional information fields
  wdi_report?: boolean;
  sprinkler_system?: boolean;
  detached_building?: boolean;
  detached_building_type?: string;
  detached_building_sqft?: string;
}

interface ManualInspectionInfo {
  id: string;
  client_name: string;
  customer_phone: string;
  client_email: string;
  agent_name?: string;
  agent_phone?: string;
  agent_email?: string;
  property_address: string;
  property_city: string;
  property_zip: string;
  square_feet?: number;
  year_built?: number;
  foundation_type: string;
  property_type: string;
  num_buildings?: number;
  num_units?: number;
  fee_amount: number;
  inspection_date: string;
  inspection_time: string;
  status: string;
  owner_name: string;
}

export default function InspectionDetailScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { id } = useLocalSearchParams();
  const [loading, setLoading] = useState(true);
  const [inspection, setInspection] = useState<InspectionInfo | null>(null);
  const [manualInspection, setManualInspection] = useState<ManualInspectionInfo | null>(null);
  const [isManual, setIsManual] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [marking, setMarking] = useState(false);

  useEffect(() => {
    fetchInspectionDetail();
  }, [id]);

  const fetchInspectionDetail = async () => {
    try {
      // For manual inspections (ID matches in both collections), fetch manual_inspection data
      // This gives us more details including agent info, property details, etc.
      try {
        const manualResponse = await api.get(`/admin/manual-inspection/${id}`);
        setManualInspection(manualResponse.data);
        setIsManual(true);
        setLoading(false);
        return; // Found manual inspection, done
      } catch (manualError) {
        // Not a manual inspection, try regular inspection
      }
      
      // Try to get from regular inspections
      const response = await api.get(`/inspections/${id}`);
      setInspection(response.data);
      setIsManual(false);
    } catch (error: any) {
      console.error('Error fetching inspection:', error);
      Alert.alert('Error', 'Failed to load inspection details');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = () => {
    router.push(`/inspections/edit?id=${id}&isManual=${isManual}`);
  };

  const handleMarkAsPaid = async (paymentMethod: string) => {
    setMarking(true);
    try {
      await api.post(`/inspections/${id}/mark-paid?payment_method=${encodeURIComponent(paymentMethod)}`);
      
      Alert.alert('Success', `Inspection marked as paid via ${paymentMethod}`);
      setShowPaymentModal(false);
      
      // Refresh inspection data
      fetchInspectionDetail();
    } catch (error: any) {
      console.error('Error marking as paid:', error);
      Alert.alert('Error', error.response?.data?.detail || 'Failed to mark as paid');
    } finally {
      setMarking(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator size="large" color="#007AFF" />
      </SafeAreaView>
    );
  }

  if (!inspection && !manualInspection) {
    return (
      <SafeAreaView style={styles.container}>
        <Text>Inspection not found</Text>
      </SafeAreaView>
    );
  }

  const renderManualInspection = () => {
    // Build full address display for header
    const fullAddress = `${manualInspection!.property_address}, ${manualInspection!.property_city}, TX ${manualInspection!.property_zip}`;
    
    return (
      <ScrollView style={styles.content}>
        {/* Property Address as main heading */}
        <View style={styles.addressHeader}>
          <Ionicons name="location" size={20} color="#007AFF" />
          <Text style={styles.addressText}>{fullAddress}</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Client Information</Text>
          <InfoRow label="Name" value={manualInspection!.client_name} />
          <InfoRow label="Phone" value={manualInspection!.customer_phone} />
          <InfoRow label="Email" value={manualInspection!.client_email} />
        </View>

        {manualInspection!.agent_name && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Agent Information</Text>
            <InfoRow label="Name" value={manualInspection!.agent_name} />
            {manualInspection!.agent_phone && <InfoRow label="Phone" value={manualInspection!.agent_phone} />}
            {manualInspection!.agent_email && <InfoRow label="Email" value={manualInspection!.agent_email} />}
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Property Details</Text>
          {manualInspection!.square_feet && <InfoRow label="Square Feet" value={manualInspection!.square_feet.toString()} />}
          {manualInspection!.year_built && <InfoRow label="Year Built" value={manualInspection!.year_built.toString()} />}
          <InfoRow label="Foundation Type" value={manualInspection!.foundation_type} />
          <InfoRow label="Property Type" value={manualInspection!.property_type} />
          {manualInspection!.num_buildings && <InfoRow label="Number of Buildings" value={manualInspection!.num_buildings.toString()} />}
          {manualInspection!.num_units && <InfoRow label="Number of Units" value={manualInspection!.num_units.toString()} />}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Inspection Details</Text>
          <InfoRow label="Fee Amount" value={`$${manualInspection!.fee_amount.toFixed(2)}`} />
          <InfoRow label="Date" value={manualInspection!.inspection_date} />
          <InfoRow label="Time" value={manualInspection!.inspection_time} />
          <InfoRow label="Status" value={manualInspection!.status.charAt(0).toUpperCase() + manualInspection!.status.slice(1)} />
        </View>

        {/* Mark as Paid Button - Owner Only, if not already paid */}
        {user?.role === 'owner' && manualInspection!.fee_amount && (
          <TouchableOpacity
            style={styles.markPaidButton}
            onPress={() => setShowPaymentModal(true)}
          >
            <Ionicons name="cash" size={20} color="#FFF" />
            <Text style={styles.markPaidButtonText}>Mark as Paid</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    );
  };

  const renderRegularInspection = () => (
    <ScrollView style={styles.content}>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Inspection Information</Text>
        <InfoRow label="Property Address" value={inspection!.property_address} />
        {inspection!.scheduled_date && <InfoRow label="Scheduled Date" value={inspection!.scheduled_date} />}
        {inspection!.scheduled_time && <InfoRow label="Scheduled Time" value={inspection!.scheduled_time} />}
        {inspection!.fee_amount && <InfoRow label="Inspection Fee" value={`$${inspection!.fee_amount.toFixed(2)}`} />}
        <InfoRow label="Status" value={inspection!.status} />
        
        {/* Additional Information */}
        {inspection!.wdi_report !== undefined && inspection!.wdi_report !== null && (
          <InfoRow label="WDI Report" value={inspection!.wdi_report ? 'Yes' : 'No'} />
        )}
        {inspection!.sprinkler_system !== undefined && inspection!.sprinkler_system !== null && (
          <InfoRow label="Sprinkler System" value={inspection!.sprinkler_system ? 'Yes' : 'No'} />
        )}
        {inspection!.detached_building && (
          <>
            <InfoRow label="Detached Building" value="Yes" />
            {inspection!.detached_building_type && inspection!.detached_building_type !== 'Please Choose' && (
              <InfoRow label="Building Type" value={inspection!.detached_building_type} />
            )}
            {inspection!.detached_building_sqft && (
              <InfoRow label="Building Square Feet" value={`${inspection!.detached_building_sqft} sq ft`} />
            )}
          </>
        )}
      </View>

      {inspection!.customer_name && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Customer Information</Text>
          <InfoRow label="Name" value={inspection!.customer_name} />
          {inspection!.customer_email && <InfoRow label="Email" value={inspection!.customer_email} />}
          {inspection!.customer_phone && <InfoRow label="Phone" value={inspection!.customer_phone} />}
        </View>
      )}

      {/* Inspector Information Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Inspector</Text>
        <InfoRow label="Name" value={inspection!.inspector_name || 'Not assigned'} />
        {inspection!.inspector_email && <InfoRow label="Email" value={inspection!.inspector_email} />}
        {inspection!.inspector_phone && <InfoRow label="Phone" value={inspection!.inspector_phone} />}
      </View>

      {inspection!.agent_name && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Agent Information</Text>
          <InfoRow label="Name" value={inspection!.agent_name} />
          {inspection!.agent_email && <InfoRow label="Email" value={inspection!.agent_email} />}
          {inspection!.agent_phone && <InfoRow label="Phone" value={inspection!.agent_phone} />}
        </View>
      )}

      {/* Mark as Paid Button - Owner Only, if not already paid */}
      {user?.role === 'owner' && !inspection!.is_paid && inspection!.fee_amount && (
        <TouchableOpacity
          style={styles.markPaidButton}
          onPress={() => setShowPaymentModal(true)}
        >
          <Ionicons name="cash" size={20} color="#FFF" />
          <Text style={styles.markPaidButtonText}>Mark as Paid</Text>
        </TouchableOpacity>
      )}
    </ScrollView>
  );

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#007AFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Inspection Details</Text>
        <TouchableOpacity onPress={handleEdit} style={styles.editButton}>
          <Ionicons name="pencil" size={24} color="#007AFF" />
        </TouchableOpacity>
      </View>

      {isManual ? renderManualInspection() : renderRegularInspection()}

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
              style={styles.cancelButton}
              onPress={() => setShowPaymentModal(false)}
              disabled={marking}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>

            {marking && <ActivityIndicator size="large" color="#007AFF" style={{ marginTop: 16 }} />}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const InfoRow = ({ label, value }: { label: string; value: string }) => (
  <View style={styles.infoRow}>
    <Text style={styles.infoLabel}>{label}</Text>
    <Text style={styles.infoValue}>{value}</Text>
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F2F7',
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
  editButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1C1C1E',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  addressHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    gap: 12,
  },
  addressText: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: '#1C1C1E',
  },
  section: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1C1C1E',
    marginBottom: 16,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F2F2F7',
  },
  infoLabel: {
    fontSize: 16,
    color: '#8E8E93',
    flex: 1,
  },
  infoValue: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1C1C1E',
    flex: 2,
    textAlign: 'right',
  },
  markPaidButton: {
    backgroundColor: '#34C759',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    margin: 16,
    gap: 8,
    shadowColor: '#34C759',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  markPaidButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFF',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
    paddingBottom: 40,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1C1C1E',
    marginBottom: 8,
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#8E8E93',
    marginBottom: 24,
  },
  paymentOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#F2F2F7',
    borderRadius: 12,
    marginBottom: 12,
    gap: 12,
  },
  paymentOptionText: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: '#1C1C1E',
  },
  cancelButton: {
    marginTop: 8,
    paddingVertical: 16,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FF3B30',
  },
});
