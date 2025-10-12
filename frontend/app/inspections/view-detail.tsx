import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import api from '../../services/api';

interface InspectionInfo {
  id: string;
  customer_id?: string;
  customer_name?: string;
  customer_email?: string;
  property_address: string;
  scheduled_date?: string;
  scheduled_time?: string;
  status: string;
  quote_id?: string;
  created_at: string;
}

interface ManualInspectionInfo {
  id: string;
  client_name: string;
  client_phone: string;
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
  const { id } = useLocalSearchParams();
  const [loading, setLoading] = useState(true);
  const [inspection, setInspection] = useState<InspectionInfo | null>(null);
  const [manualInspection, setManualInspection] = useState<ManualInspectionInfo | null>(null);
  const [isManual, setIsManual] = useState(false);

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

  const renderManualInspection = () => (
    <ScrollView style={styles.content}>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Client Information</Text>
        <InfoRow label="Name" value={manualInspection!.client_name} />
        <InfoRow label="Phone" value={manualInspection!.client_phone} />
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
        <Text style={styles.sectionTitle}>Property Information</Text>
        <InfoRow label="Address" value={manualInspection!.property_address} />
        <InfoRow label="City" value={manualInspection!.property_city} />
        <InfoRow label="Zip Code" value={manualInspection!.property_zip} />
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
        <InfoRow label="Status" value={manualInspection!.status} />
      </View>
    </ScrollView>
  );

  const renderRegularInspection = () => (
    <ScrollView style={styles.content}>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Inspection Information</Text>
        <InfoRow label="Property Address" value={inspection!.property_address} />
        {inspection!.scheduled_date && <InfoRow label="Scheduled Date" value={inspection!.scheduled_date} />}
        {inspection!.scheduled_time && <InfoRow label="Scheduled Time" value={inspection!.scheduled_time} />}
        <InfoRow label="Status" value={inspection!.status} />
      </View>

      {inspection!.customer_name && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Customer Information</Text>
          <InfoRow label="Name" value={inspection!.customer_name} />
          {inspection!.customer_email && <InfoRow label="Email" value={inspection!.customer_email} />}
        </View>
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
    padding: 4,
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
});
