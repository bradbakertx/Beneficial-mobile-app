import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import api from '../../services/api';
import { format } from 'date-fns';
import DateTimePicker from '@react-native-community/datetimepicker';

interface InspectionDetail {
  id: string;
  option_period_end: string;
  best_days: string;
  total_amount: number;
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
    foundation_type: string;
  };
}

export default function SetDateTimeScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const [inspection, setInspection] = useState<InspectionDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedTime, setSelectedTime] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);

  useEffect(() => {
    fetchInspectionDetail();
  }, [id]);

  const fetchInspectionDetail = async () => {
    try {
      const response = await api.get('/admin/inspections/pending');
      const allInspections = response.data;
      const foundInspection = allInspections.find((i: InspectionDetail) => i.id === id);
      
      if (foundInspection) {
        setInspection(foundInspection);
        // Set default time to 9 AM
        const defaultTime = new Date();
        defaultTime.setHours(9, 0, 0, 0);
        setSelectedTime(defaultTime);
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

  const onDateChange = (event: any, selected?: Date) => {
    if (Platform.OS === 'android') {
      setShowDatePicker(false);
    }
    if (selected) {
      setSelectedDate(selected);
      if (Platform.OS === 'android') {
        setShowDatePicker(false);
      }
    }
  };

  const onTimeChange = (event: any, selected?: Date) => {
    if (Platform.OS === 'android') {
      setShowTimePicker(false);
    }
    if (selected) {
      setSelectedTime(selected);
      if (Platform.OS === 'android') {
        setShowTimePicker(false);
      }
    }
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const inspectionDate = format(selectedDate, 'yyyy-MM-dd');
      const inspectionTime = format(selectedTime, 'HH:mm');
      
      console.log('Setting inspection datetime:', {
        id,
        inspection_date: inspectionDate,
        inspection_time: inspectionTime
      });

      const response = await api.patch(`/admin/inspections/${id}/set-datetime`, null, {
        params: {
          inspection_date: inspectionDate,
          inspection_time: inspectionTime
        }
      });

      console.log('DateTime set successfully:', response.data);

      Alert.alert(
        'Success',
        'Inspection date and time has been set! The customer will be notified to confirm.',
        [
          {
            text: 'OK',
            onPress: () => router.replace('/(tabs)')
          }
        ]
      );
    } catch (error: any) {
      console.error('Error setting datetime:', error);
      console.error('Error response:', error.response?.data);
      Alert.alert(
        'Error',
        error.response?.data?.detail || 'Failed to set inspection date/time. Please try again.'
      );
      setSubmitting(false);
    }
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

  const preferredDays = inspection.best_days.split(',');

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#007AFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Set Date & Time</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Customer Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Customer</Text>
          <View style={styles.card}>
            <View style={styles.infoRow}>
              <Ionicons name="person" size={20} color="#007AFF" />
              <Text style={styles.infoText}>{inspection.customer.name}</Text>
            </View>
            <View style={styles.infoRow}>
              <Ionicons name="mail" size={20} color="#007AFF" />
              <Text style={styles.infoText}>{inspection.customer.email}</Text>
            </View>
            <View style={styles.infoRow}>
              <Ionicons name="call" size={20} color="#007AFF" />
              <Text style={styles.infoText}>{inspection.customer.phone}</Text>
            </View>
          </View>
        </View>

        {/* Property Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Property</Text>
          <View style={styles.card}>
            <Text style={styles.propertyAddress}>{inspection.quote.street_address}</Text>
            <Text style={styles.propertyCity}>
              {inspection.quote.city}, {inspection.quote.state} {inspection.quote.zip_code}
            </Text>
            <View style={styles.divider} />
            <View style={styles.propertyDetails}>
              <View style={styles.detailItem}>
                <Text style={styles.detailLabel}>Type</Text>
                <Text style={styles.detailValue}>{inspection.quote.inspection_type}</Text>
              </View>
              <View style={styles.detailItem}>
                <Text style={styles.detailLabel}>Size</Text>
                <Text style={styles.detailValue}>{inspection.quote.square_footage} sq ft</Text>
              </View>
              <View style={styles.detailItem}>
                <Text style={styles.detailLabel}>Foundation</Text>
                <Text style={styles.detailValue}>{inspection.quote.foundation_type}</Text>
              </View>
              <View style={styles.detailItem}>
                <Text style={styles.detailLabel}>Amount</Text>
                <Text style={styles.detailValuePrice}>${inspection.total_amount.toFixed(2)}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Customer Preferences */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Customer Preferences</Text>
          <View style={styles.card}>
            <View style={styles.preferenceRow}>
              <Ionicons name="calendar-outline" size={20} color="#FF9500" />
              <View style={styles.preferenceContent}>
                <Text style={styles.preferenceLabel}>Option Period Ends</Text>
                <Text style={styles.preferenceValue}>
                  {format(new Date(inspection.option_period_end), 'MMMM dd, yyyy')}
                </Text>
              </View>
            </View>
            <View style={styles.divider} />
            <View style={styles.preferenceRow}>
              <Ionicons name="time-outline" size={20} color="#FF9500" />
              <View style={styles.preferenceContent}>
                <Text style={styles.preferenceLabel}>Preferred Days</Text>
                <View style={styles.preferredDaysContainer}>
                  {preferredDays.map((day, index) => (
                    <View key={index} style={styles.dayChip}>
                      <Text style={styles.dayChipText}>{day.trim()}</Text>
                    </View>
                  ))}
                </View>
              </View>
            </View>
          </View>
        </View>

        {/* Date Selection */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Select Date</Text>
          <Text style={styles.sectionHint}>
            Try to schedule on one of the customer's preferred days
          </Text>
          <TouchableOpacity
            style={styles.pickerButton}
            onPress={() => setShowDatePicker(true)}
          >
            <Ionicons name="calendar" size={24} color="#007AFF" />
            <Text style={styles.pickerText}>
              {format(selectedDate, 'EEEE, MMMM dd, yyyy')}
            </Text>
            <Ionicons name="chevron-forward" size={20} color="#C7C7CC" />
          </TouchableOpacity>
          
          {showDatePicker && (
            <DateTimePicker
              value={selectedDate}
              mode="date"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={onDateChange}
              minimumDate={new Date()}
              maximumDate={new Date(inspection.option_period_end)}
            />
          )}
        </View>

        {/* Time Selection */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Select Time</Text>
          <TouchableOpacity
            style={styles.pickerButton}
            onPress={() => setShowTimePicker(true)}
          >
            <Ionicons name="time" size={24} color="#007AFF" />
            <Text style={styles.pickerText}>
              {format(selectedTime, 'h:mm a')}
            </Text>
            <Ionicons name="chevron-forward" size={20} color="#C7C7CC" />
          </TouchableOpacity>
          
          {showTimePicker && (
            <DateTimePicker
              value={selectedTime}
              mode="time"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={onTimeChange}
            />
          )}
        </View>
      </ScrollView>

      {/* Submit Button */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.submitButton, submitting && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={submitting}
        >
          {submitting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.submitButtonText}>Set Inspection Date & Time</Text>
          )}
        </TouchableOpacity>
      </View>
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
    paddingBottom: 100,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1C1C1E',
    marginBottom: 8,
  },
  sectionHint: {
    fontSize: 14,
    color: '#8E8E93',
    marginBottom: 12,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  infoText: {
    fontSize: 16,
    color: '#1C1C1E',
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
  divider: {
    height: 1,
    backgroundColor: '#E5E5EA',
    marginVertical: 12,
  },
  propertyDetails: {
    gap: 12,
  },
  detailItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  detailLabel: {
    fontSize: 14,
    color: '#8E8E93',
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1C1C1E',
  },
  detailValuePrice: {
    fontSize: 16,
    fontWeight: '600',
    color: '#007AFF',
  },
  preferenceRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 8,
  },
  preferenceContent: {
    flex: 1,
  },
  preferenceLabel: {
    fontSize: 14,
    color: '#8E8E93',
    marginBottom: 6,
  },
  preferenceValue: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1C1C1E',
  },
  preferredDaysContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  dayChip: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  dayChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#fff',
  },
  pickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    gap: 12,
  },
  pickerText: {
    flex: 1,
    fontSize: 16,
    color: '#1C1C1E',
    fontWeight: '500',
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E5EA',
  },
  submitButton: {
    backgroundColor: '#007AFF',
    borderRadius: 12,
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
