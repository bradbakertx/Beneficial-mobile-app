import React, { useState, useEffect } from 'react';
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

interface Quote {
  id: string;
  street_address: string;
  city: string;
  state: string;
  zip_code: string;
  quote_amount: number;
  inspection_type: string;
}

const DAYS_OF_WEEK = [
  { name: 'Monday', value: 'Monday' },
  { name: 'Tuesday', value: 'Tuesday' },
  { name: 'Wednesday', value: 'Wednesday' },
  { name: 'Thursday', value: 'Thursday' },
  { name: 'Friday', value: 'Friday' },
  { name: 'Saturday', value: 'Saturday' },
  { name: 'Sunday', value: 'Sunday' },
];

export default function ScheduleInspectionScreen() {
  const router = useRouter();
  const { quote_id } = useLocalSearchParams();
  const [quote, setQuote] = useState<Quote | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  
  const [optionPeriodEnd, setOptionPeriodEnd] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [selectedDays, setSelectedDays] = useState<string[]>([]);

  useEffect(() => {
    fetchQuoteDetails();
  }, [quote_id]);

  const fetchQuoteDetails = async () => {
    try {
      const response = await api.get('/quotes');
      const allQuotes = response.data;
      const foundQuote = allQuotes.find((q: Quote) => q.id === quote_id);
      
      if (foundQuote) {
        setQuote(foundQuote);
      } else {
        Alert.alert('Error', 'Quote not found');
        router.back();
      }
    } catch (error) {
      console.error('Error fetching quote:', error);
      Alert.alert('Error', 'Failed to fetch quote details');
      router.back();
    } finally {
      setLoading(false);
    }
  };

  const toggleDay = (day: string) => {
    if (selectedDays.includes(day)) {
      setSelectedDays(selectedDays.filter(d => d !== day));
    } else {
      setSelectedDays([...selectedDays, day]);
    }
  };

  const handleSubmitRequest = async () => {
    if (selectedDays.length === 0) {
      Alert.alert('Error', 'Please select at least one preferred day');
      return;
    }

    setSubmitting(true);
    try {
      const inspectionDate = format(optionPeriodEnd, 'yyyy-MM-dd');
      const bestDays = selectedDays.join(',');
      
      console.log('Submitting inspection request:', {
        quote_id,
        inspection_date: inspectionDate,
        best_days: bestDays
      });

      const response = await api.post('/inspections', null, {
        params: {
          quote_id,
          inspection_date: inspectionDate,
          best_days: bestDays
        }
      });

      console.log('Inspection request submitted:', response.data);

      Alert.alert(
        'Success',
        'Your inspection request has been submitted! The owner will review and schedule your inspection.',
        [
          {
            text: 'OK',
            onPress: () => router.replace('/(tabs)')
          }
        ]
      );
    } catch (error: any) {
      console.error('Error submitting inspection request:', error);
      console.error('Error response:', error.response?.data);
      Alert.alert(
        'Error',
        error.response?.data?.detail || 'Failed to submit inspection request. Please try again.'
      );
      setSubmitting(false);
    }
  };

  const onDateChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(Platform.OS === 'ios');
    if (selectedDate) {
      setOptionPeriodEnd(selectedDate);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  if (!quote) {
    return null;
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#007AFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Schedule Inspection</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Quote Summary */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Inspection Details</Text>
          <View style={styles.card}>
            <View style={styles.infoRow}>
              <Text style={styles.label}>Property</Text>
              <Text style={styles.value}>{quote.street_address}</Text>
              <Text style={styles.value}>{quote.city}, {quote.state} {quote.zip_code}</Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.infoRow}>
              <Text style={styles.label}>Inspection Type</Text>
              <Text style={styles.value}>{quote.inspection_type}</Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.infoRow}>
              <Text style={styles.label}>Quote Amount</Text>
              <Text style={styles.priceValue}>${quote.quote_amount.toFixed(2)}</Text>
            </View>
          </View>
        </View>

        {/* Option Period End Date */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Option Period End Date</Text>
          <Text style={styles.sectionDescription}>
            Select the last day of your option period. The inspection should be completed before this date.
          </Text>
          <TouchableOpacity
            style={styles.datePickerButton}
            onPress={() => setShowDatePicker(true)}
          >
            <Ionicons name="calendar-outline" size={24} color="#007AFF" />
            <Text style={styles.datePickerText}>
              {format(optionPeriodEnd, 'MMMM dd, yyyy')}
            </Text>
            <Ionicons name="chevron-forward" size={20} color="#C7C7CC" />
          </TouchableOpacity>
          
          {showDatePicker && (
            <DateTimePicker
              value={optionPeriodEnd}
              mode="date"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={onDateChange}
              minimumDate={new Date()}
            />
          )}
        </View>

        {/* Best Days Selection */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Preferred Days</Text>
          <Text style={styles.sectionDescription}>
            Select which days of the week work best for you. We'll try to schedule on one of these days.
          </Text>
          <View style={styles.daysContainer}>
            {DAYS_OF_WEEK.map((day) => (
              <TouchableOpacity
                key={day.value}
                style={[
                  styles.dayButton,
                  selectedDays.includes(day.value) && styles.dayButtonSelected
                ]}
                onPress={() => toggleDay(day.value)}
              >
                <Text
                  style={[
                    styles.dayButtonText,
                    selectedDays.includes(day.value) && styles.dayButtonTextSelected
                  ]}
                >
                  {day.name}
                </Text>
                {selectedDays.includes(day.value) && (
                  <Ionicons name="checkmark-circle" size={20} color="#fff" style={styles.checkIcon} />
                )}
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Note */}
        <View style={styles.noteContainer}>
          <Ionicons name="information-circle-outline" size={24} color="#007AFF" />
          <Text style={styles.noteText}>
            After submitting, the owner will review your preferences and schedule a specific date and time for your inspection.
          </Text>
        </View>
      </ScrollView>

      {/* Submit Button */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.submitButton, submitting && styles.submitButtonDisabled]}
          onPress={handleSubmitRequest}
          disabled={submitting}
        >
          {submitting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.submitButtonText}>Submit Request</Text>
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
  sectionDescription: {
    fontSize: 14,
    color: '#8E8E93',
    marginBottom: 12,
    lineHeight: 20,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
  },
  infoRow: {
    paddingVertical: 8,
  },
  label: {
    fontSize: 14,
    color: '#8E8E93',
    marginBottom: 4,
  },
  value: {
    fontSize: 16,
    color: '#1C1C1E',
  },
  priceValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#007AFF',
  },
  divider: {
    height: 1,
    backgroundColor: '#E5E5EA',
    marginVertical: 8,
  },
  datePickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    gap: 12,
  },
  datePickerText: {
    flex: 1,
    fontSize: 16,
    color: '#1C1C1E',
  },
  daysContainer: {
    gap: 12,
  },
  dayButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#E5E5EA',
  },
  dayButtonSelected: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  dayButtonText: {
    fontSize: 16,
    color: '#1C1C1E',
    fontWeight: '500',
  },
  dayButtonTextSelected: {
    color: '#fff',
  },
  checkIcon: {
    marginLeft: 8,
  },
  noteContainer: {
    flexDirection: 'row',
    backgroundColor: '#E3F2FD',
    padding: 16,
    borderRadius: 12,
    gap: 12,
  },
  noteText: {
    flex: 1,
    fontSize: 14,
    color: '#1565C0',
    lineHeight: 20,
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
