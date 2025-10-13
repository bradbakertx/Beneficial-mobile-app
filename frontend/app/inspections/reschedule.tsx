import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import CalendarPicker from '../../components/CalendarPicker';
import api from '../../services/api';
import { format } from 'date-fns';

export default function RescheduleInspectionScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const inspectionId = params.id as string;
  const currentDate = params.currentDate as string;
  const currentTime = params.currentTime as string;
  const address = params.address as string;

  // Initialize with current date or today
  const initialDate = currentDate ? new Date(currentDate) : new Date();
  const [selectedDate, setSelectedDate] = useState<Date>(initialDate);
  const [selectedTime, setSelectedTime] = useState<string>(currentTime || '');
  const [submitting, setSubmitting] = useState(false);

  const timeOptions = [
    { value: '08:00 AM', label: '8:00 AM', icon: 'sunny-outline' },
    { value: '11:00 AM', label: '11:00 AM', icon: 'partly-sunny-outline' },
    { value: '02:00 PM', label: '2:00 PM', icon: 'partly-sunny-outline' },
  ];

  const handleDateSelect = (date: Date) => {
    setSelectedDate(date);
  };

  const handleSubmit = async () => {
    if (!selectedDate || !selectedTime) {
      Alert.alert('Missing Information', 'Please select both a date and time');
      return;
    }

    // Format date as YYYY-MM-DD
    const formattedDate = format(selectedDate, 'yyyy-MM-dd');

    setSubmitting(true);
    try {
      console.log('Rescheduling inspection:', inspectionId);
      console.log('New date:', formattedDate);
      console.log('New time:', selectedTime);

      const response = await api.patch(`/admin/inspections/${inspectionId}/reschedule`, {
        scheduled_date: formattedDate,
        scheduled_time: selectedTime,
      });

      console.log('Reschedule response:', response.data);

      Alert.alert(
        'Success',
        'Inspection rescheduled successfully. Calendar invites and notifications have been sent to all parties.',
        [
          {
            text: 'OK',
            onPress: () => router.push('/inspections/active'),
          },
        ]
      );
    } catch (error: any) {
      console.error('Error rescheduling inspection:', error);
      console.error('Error response:', error.response?.data);

      const errorMessage = error.response?.data?.detail || 'Failed to reschedule inspection';
      Alert.alert('Error', errorMessage);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#007AFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Reschedule Inspection</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.scrollContent}>
        <View style={styles.section}>
          <View style={styles.infoCard}>
            <Ionicons name="home-outline" size={24} color="#007AFF" />
            <Text style={styles.addressText}>{address}</Text>
          </View>

          <View style={styles.currentSchedule}>
            <Text style={styles.currentScheduleLabel}>Current Schedule:</Text>
            <Text style={styles.currentScheduleText}>
              {currentDate} at {currentTime}
            </Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Select New Date</Text>
          <CalendarPicker
            selectedDate={selectedDate}
            onDateSelect={handleDateSelect}
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Select New Time</Text>
          <View style={styles.timeOptions}>
            {timeOptions.map((option) => (
              <TouchableOpacity
                key={option.value}
                style={[
                  styles.timeOption,
                  selectedTime === option.value && styles.timeOptionSelected,
                ]}
                onPress={() => setSelectedTime(option.value)}
              >
                <Ionicons
                  name={option.icon as any}
                  size={28}
                  color={selectedTime === option.value ? '#007AFF' : '#8E8E93'}
                />
                <Text
                  style={[
                    styles.timeOptionText,
                    selectedTime === option.value && styles.timeOptionTextSelected,
                  ]}
                >
                  {option.label}
                </Text>
                {selectedTime === option.value && (
                  <View style={styles.checkmark}>
                    <Ionicons name="checkmark-circle" size={24} color="#007AFF" />
                  </View>
                )}
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {selectedDate && selectedTime && (
          <View style={styles.summaryCard}>
            <Ionicons name="calendar-outline" size={24} color="#34C759" />
            <View style={styles.summaryText}>
              <Text style={styles.summaryLabel}>New Schedule:</Text>
              <Text style={styles.summaryValue}>
                {format(selectedDate, 'MMMM dd, yyyy')} at {selectedTime}
              </Text>
            </View>
          </View>
        )}
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.submitButton, submitting && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={submitting || !selectedDate || !selectedTime}
        >
          {submitting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Ionicons name="calendar-outline" size={20} color="#fff" />
              <Text style={styles.submitButtonText}>Confirm Reschedule</Text>
            </>
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
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 100,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#1C1C1E',
    marginBottom: 12,
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    gap: 12,
  },
  addressText: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
    color: '#1C1C1E',
  },
  currentSchedule: {
    backgroundColor: '#FFF3CD',
    padding: 12,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#FF9500',
  },
  currentScheduleLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#856404',
    marginBottom: 4,
  },
  currentScheduleText: {
    fontSize: 15,
    color: '#856404',
  },
  timeOptions: {
    gap: 12,
  },
  timeOption: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#E5E5EA',
    gap: 12,
  },
  timeOptionSelected: {
    borderColor: '#007AFF',
    backgroundColor: '#F0F8FF',
  },
  timeOptionText: {
    flex: 1,
    fontSize: 17,
    fontWeight: '500',
    color: '#1C1C1E',
  },
  timeOptionTextSelected: {
    color: '#007AFF',
    fontWeight: '600',
  },
  checkmark: {
    marginLeft: 'auto',
  },
  summaryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F5E9',
    padding: 16,
    borderRadius: 12,
    gap: 12,
    marginTop: 8,
  },
  summaryText: {
    flex: 1,
  },
  summaryLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2E7D32',
    marginBottom: 4,
  },
  summaryValue: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1B5E20',
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#E5E5EA',
  },
  submitButton: {
    flexDirection: 'row',
    backgroundColor: '#007AFF',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: '#007AFF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  submitButtonDisabled: {
    backgroundColor: '#C7C7CC',
    shadowOpacity: 0,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '600',
  },
});
