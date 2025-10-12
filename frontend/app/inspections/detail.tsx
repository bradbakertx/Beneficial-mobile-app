import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import api from '../../services/api';
import { format } from 'date-fns';

interface InspectionDetail {
  id: string;
  inspection_date: string;
  inspection_time: string;
  status: string;
  payment_status: string;
  total_amount: number;
  confirmed_by_customer: boolean;
  agreement_signed: boolean;
  report_name: string;
  realtor_name?: string;
  client_name?: string;
  client_email?: string;
  agent_name?: string;
  agent_email?: string;
  agent_phone?: string;
  option_period_end: string;
  best_days: string;
  customer: {
    name: string;
    email: string;
    phone: string;
  };
  quote: {
    street_address: string;
    city: string;
    state: string;
    zip_code: string;
    inspection_type: string;
    square_footage: number;
    year_built: number;
    foundation_type: string;
    quote_amount: number;
  };
}

export default function InspectionDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const [inspection, setInspection] = useState<InspectionDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchInspectionDetail();
  }, [id]);

  const fetchInspectionDetail = async () => {
    try {
      const response = await api.get('/admin/inspections/confirmed');
      const allInspections = response.data;
      const foundInspection = allInspections.find((i: InspectionDetail) => i.id === id);
      
      if (foundInspection) {
        setInspection(foundInspection);
      } else {
        Alert.alert('Error', 'Inspection not found');
        router.back();
      }
    } catch (error) {
      console.error('Error fetching inspection:', error);
      Alert.alert('Error', 'Failed to fetch inspection details');
      router.back();
    } finally {
      setLoading(false);
    }
  };

  const handleCall = (phone: string) => {
    Linking.openURL(`tel:${phone}`);
  };

  const handleEmail = (email: string) => {
    Linking.openURL(`mailto:${email}`);
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  if (!inspection) {
    return null;
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#007AFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Inspection Details</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Status Banner */}
        <View style={[
          styles.statusBanner,
          { backgroundColor: inspection.status === 'confirmed' ? '#34C759' : '#FF9500' }
        ]}>
          <Ionicons name="checkmark-circle" size={24} color="#fff" />
          <View style={styles.statusInfo}>
            <Text style={styles.statusTitle}>
              {inspection.status === 'confirmed' ? 'Confirmed' : 'Awaiting Confirmation'}
            </Text>
            <Text style={styles.statusSubtitle}>
              {inspection.payment_status === 'paid' ? 'Payment Received' : 'Payment Pending'}
            </Text>
          </View>
        </View>

        {/* Inspection Date & Time */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Inspection Schedule</Text>
          <View style={styles.card}>
            <View style={styles.scheduleRow}>
              <Ionicons name="calendar" size={24} color="#007AFF" />
              <View style={styles.scheduleInfo}>
                <Text style={styles.scheduleLabel}>Date</Text>
                <Text style={styles.scheduleValue}>
                  {format(new Date(inspection.inspection_date), 'EEEE, MMMM dd, yyyy')}
                </Text>
              </View>
            </View>
            <View style={styles.divider} />
            <View style={styles.scheduleRow}>
              <Ionicons name="time" size={24} color="#007AFF" />
              <View style={styles.scheduleInfo}>
                <Text style={styles.scheduleLabel}>Time</Text>
                <Text style={styles.scheduleValue}>{inspection.inspection_time}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Property Details */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Property Information</Text>
          <View style={styles.card}>
            <Text style={styles.propertyAddress}>{inspection.quote.street_address}</Text>
            <Text style={styles.propertyCity}>
              {inspection.quote.city}, {inspection.quote.state} {inspection.quote.zip_code}
            </Text>
            <View style={styles.divider} />
            <View style={styles.propertyGrid}>
              <View style={styles.propertyItem}>
                <Text style={styles.propertyLabel}>Type</Text>
                <Text style={styles.propertyValue}>{inspection.quote.inspection_type}</Text>
              </View>
              <View style={styles.propertyItem}>
                <Text style={styles.propertyLabel}>Size</Text>
                <Text style={styles.propertyValue}>
                  {inspection.quote.square_footage.toLocaleString()} sq ft
                </Text>
              </View>
              <View style={styles.propertyItem}>
                <Text style={styles.propertyLabel}>Year Built</Text>
                <Text style={styles.propertyValue}>{inspection.quote.year_built}</Text>
              </View>
              <View style={styles.propertyItem}>
                <Text style={styles.propertyLabel}>Foundation</Text>
                <Text style={styles.propertyValue}>{inspection.quote.foundation_type}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Customer/Client Details */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Customer Information</Text>
          <View style={styles.card}>
            <View style={styles.contactRow}>
              <Ionicons name="person" size={20} color="#007AFF" />
              <View style={styles.contactInfo}>
                <Text style={styles.contactLabel}>Name</Text>
                <Text style={styles.contactValue}>{inspection.customer.name}</Text>
              </View>
            </View>
            <View style={styles.contactRow}>
              <TouchableOpacity onPress={() => handleEmail(inspection.customer.email)} style={styles.contactButton}>
                <Ionicons name="mail" size={20} color="#007AFF" />
              </TouchableOpacity>
              <View style={styles.contactInfo}>
                <Text style={styles.contactLabel}>Email</Text>
                <Text style={styles.contactValue}>{inspection.customer.email}</Text>
              </View>
            </View>
            <View style={styles.contactRow}>
              <TouchableOpacity onPress={() => handleCall(inspection.customer.phone)} style={styles.contactButton}>
                <Ionicons name="call" size={20} color="#007AFF" />
              </TouchableOpacity>
              <View style={styles.contactInfo}>
                <Text style={styles.contactLabel}>Phone</Text>
                <Text style={styles.contactValue}>{inspection.customer.phone}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Agent Details (if applicable) */}
        {inspection.agent_name && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Agent Information</Text>
            <View style={styles.card}>
              <View style={styles.contactRow}>
                <Ionicons name="briefcase" size={20} color="#007AFF" />
                <View style={styles.contactInfo}>
                  <Text style={styles.contactLabel}>Agent Name</Text>
                  <Text style={styles.contactValue}>{inspection.agent_name}</Text>
                </View>
              </View>
              {inspection.agent_email && (
                <View style={styles.contactRow}>
                  <TouchableOpacity onPress={() => handleEmail(inspection.agent_email!)} style={styles.contactButton}>
                    <Ionicons name="mail" size={20} color="#007AFF" />
                  </TouchableOpacity>
                  <View style={styles.contactInfo}>
                    <Text style={styles.contactLabel}>Email</Text>
                    <Text style={styles.contactValue}>{inspection.agent_email}</Text>
                  </View>
                </View>
              )}
              {inspection.agent_phone && (
                <View style={styles.contactRow}>
                  <TouchableOpacity onPress={() => handleCall(inspection.agent_phone!)} style={styles.contactButton}>
                    <Ionicons name="call" size={20} color="#007AFF" />
                  </TouchableOpacity>
                  <View style={styles.contactInfo}>
                    <Text style={styles.contactLabel}>Phone</Text>
                    <Text style={styles.contactValue}>{inspection.agent_phone}</Text>
                  </View>
                </View>
              )}
            </View>
          </View>
        )}

        {/* Additional Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Additional Information</Text>
          <View style={styles.card}>
            {inspection.report_name && (
              <>
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Report Name</Text>
                  <Text style={styles.infoValue}>{inspection.report_name}</Text>
                </View>
                <View style={styles.divider} />
              </>
            )}
            {inspection.realtor_name && (
              <>
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Realtor</Text>
                  <Text style={styles.infoValue}>{inspection.realtor_name}</Text>
                </View>
                <View style={styles.divider} />
              </>
            )}
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Total Amount</Text>
              <Text style={styles.infoValuePrice}>${inspection.total_amount.toFixed(2)}</Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Agreement Signed</Text>
              <View style={styles.statusIndicator}>
                <Ionicons 
                  name={inspection.agreement_signed ? 'checkmark-circle' : 'close-circle'} 
                  size={20} 
                  color={inspection.agreement_signed ? '#34C759' : '#FF3B30'} 
                />
                <Text style={styles.infoValue}>
                  {inspection.agreement_signed ? 'Yes' : 'No'}
                </Text>
              </View>
            </View>
          </View>
        </View>
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
  scrollContent: {
    padding: 16,
  },
  statusBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
    gap: 12,
  },
  statusInfo: {
    flex: 1,
  },
  statusTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 2,
  },
  statusSubtitle: {
    fontSize: 14,
    color: '#fff',
    opacity: 0.9,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1C1C1E',
    marginBottom: 12,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
  },
  scheduleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    paddingVertical: 8,
  },
  scheduleInfo: {
    flex: 1,
  },
  scheduleLabel: {
    fontSize: 14,
    color: '#8E8E93',
    marginBottom: 4,
  },
  scheduleValue: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1C1C1E',
  },
  divider: {
    height: 1,
    backgroundColor: '#E5E5EA',
    marginVertical: 12,
  },
  propertyAddress: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1C1C1E',
    marginBottom: 4,
  },
  propertyCity: {
    fontSize: 14,
    color: '#8E8E93',
    marginBottom: 12,
  },
  propertyGrid: {
    gap: 12,
  },
  propertyItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  propertyLabel: {
    fontSize: 14,
    color: '#8E8E93',
  },
  propertyValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1C1C1E',
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  contactButton: {
    width: 20,
  },
  contactInfo: {
    flex: 1,
  },
  contactLabel: {
    fontSize: 12,
    color: '#8E8E93',
    marginBottom: 2,
  },
  contactValue: {
    fontSize: 14,
    color: '#1C1C1E',
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  infoLabel: {
    fontSize: 14,
    color: '#8E8E93',
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1C1C1E',
  },
  infoValuePrice: {
    fontSize: 18,
    fontWeight: '600',
    color: '#007AFF',
  },
  statusIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
});
