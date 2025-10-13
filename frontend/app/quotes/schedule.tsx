import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, addMonths, subMonths } from 'date-fns';
import api from '../../services/api';
import { formatDateLocal } from '../../utils/dateUtils';

const DAYS_OF_WEEK = [
  { label: 'Monday', value: 'Mon' },
  { label: 'Tuesday', value: 'Tue' },
  { label: 'Wednesday', value: 'Wed' },
  { label: 'Thursday', value: 'Thu' },
  { label: 'Friday', value: 'Fri' },
  { label: 'Saturday*', value: 'Sat' },
];

export default function ScheduleInspectionScreen() {
  const router = useRouter();
  const { quoteId } = useLocalSearchParams();
  const [loading, setLoading] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [optionPeriodUnsure, setOptionPeriodUnsure] = useState(false);
  const [selectedDays, setSelectedDays] = useState<string[]>([]);

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });

  // Group days by week
  const weeks: Date[][] = [];
  let currentWeek: Date[] = [];
  
  // Add empty cells for days before the first day of the month
  const firstDayOfWeek = monthStart.getDay();
  for (let i = 0; i < firstDayOfWeek; i++) {
    currentWeek.push(null as any);
  }

  daysInMonth.forEach((day, index) => {
    currentWeek.push(day);
    if (currentWeek.length === 7 || index === daysInMonth.length - 1) {
      // Fill remaining cells in the last week
      while (currentWeek.length < 7) {
        currentWeek.push(null as any);
      }
      weeks.push(currentWeek);
      currentWeek = [];
    }
  });

  const handleDateSelect = (date: Date | null) => {
    if (!date) return;
    setSelectedDate(date);
    setOptionPeriodUnsure(false); // Uncheck "unsure" if date is selected
  };

  const toggleDayOfWeek = (day: string) => {
    if (selectedDays.includes(day)) {
      setSelectedDays(selectedDays.filter(d => d !== day));
    } else {
      setSelectedDays([...selectedDays, day]);
    }
  };

  const handleSubmit = async () => {
    // Validation
    if (!optionPeriodUnsure && !selectedDate) {
      if (Platform.OS === 'web') {
        window.alert('Please select your option period end date or check "I am unsure"');
      }
      return;
    }

    if (selectedDays.length === 0) {
      if (Platform.OS === 'web') {
        window.alert('Please select at least one preferred day of the week');
      }
      return;
    }

    setLoading(true);
    try {
      const payload = {
        quote_id: quoteId,
        option_period_end_date: optionPeriodUnsure ? null : (selectedDate ? format(selectedDate, 'yyyy-MM-dd') : null),
        option_period_unsure: optionPeriodUnsure,
        preferred_days_of_week: selectedDays,
      };

      console.log('Submitting scheduling request:', payload);
      const response = await api.post('/inspections', payload);
      console.log('Inspection scheduled:', response.data);

      // Navigate to dashboard
      router.replace('/(tabs)');

      // Show success message
      setTimeout(() => {
        if (Platform.OS === 'web') {
          window.alert('Your scheduling request has been submitted! The inspector will offer available time slots.');
        }
      }, 500);

    } catch (error: any) {
      console.error('Error submitting scheduling request:', error);
      setLoading(false);
      
      if (Platform.OS === 'web') {
        window.alert(error.response?.data?.detail || 'Failed to submit scheduling request. Please try again.');
      }
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#007AFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Schedule Inspection</Text>
          <View style={styles.placeholder} />
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Option Period Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>When is your option period over?</Text>
            
            {/* Calendar */}
            <View style={styles.calendarCard}>
              <View style={styles.calendarHeader}>
                <TouchableOpacity onPress={() => setCurrentMonth(subMonths(currentMonth, 1))}>
                  <Ionicons name="chevron-back" size={24} color="#007AFF" />
                </TouchableOpacity>
                <Text style={styles.calendarMonthYear}>
                  {format(currentMonth, 'MMMM yyyy')}
                </Text>
                <TouchableOpacity onPress={() => setCurrentMonth(addMonths(currentMonth, 1))}>
                  <Ionicons name="chevron-forward" size={24} color="#007AFF" />
                </TouchableOpacity>
              </View>

              {/* Day headers */}
              <View style={styles.dayNamesRow}>
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                  <Text key={day} style={styles.dayName}>{day}</Text>
                ))}
              </View>

              {/* Calendar days */}
              {weeks.map((week, weekIndex) => (
                <View key={weekIndex} style={styles.weekRow}>
                  {week.map((day, dayIndex) => {
                    const isSelected = day && selectedDate && 
                      day.getDate() === selectedDate.getDate() &&
                      day.getMonth() === selectedDate.getMonth();
                    
                    return (
                      <TouchableOpacity
                        key={dayIndex}
                        style={[
                          styles.dayCell,
                          isSelected && styles.selectedDayCell,
                        ]}
                        onPress={() => handleDateSelect(day)}
                        disabled={!day || optionPeriodUnsure}
                      >
                        {day && (
                          <Text style={[
                            styles.dayText,
                            isSelected && styles.selectedDayText,
                            optionPeriodUnsure && styles.disabledDayText,
                          ]}>
                            {day.getDate()}
                          </Text>
                        )}
                      </TouchableOpacity>
                    );
                  })}
                </View>
              ))}
            </View>

            {/* Unsure checkbox */}
            <TouchableOpacity
              style={styles.checkboxRow}
              onPress={() => {
                setOptionPeriodUnsure(!optionPeriodUnsure);
                if (!optionPeriodUnsure) {
                  setSelectedDate(null); // Clear date if checking unsure
                }
              }}
            >
              <View style={[styles.checkbox, optionPeriodUnsure && styles.checkboxChecked]}>
                {optionPeriodUnsure && <Ionicons name="checkmark" size={18} color="#fff" />}
              </View>
              <Text style={styles.checkboxLabel}>I am unsure when my option period is over</Text>
            </TouchableOpacity>
          </View>

          {/* Preferred Days Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              If you plan on attending the inspection, what days of the week work best for you?
            </Text>

            <View style={styles.daysCard}>
              {DAYS_OF_WEEK.map(day => (
                <TouchableOpacity
                  key={day.value}
                  style={styles.dayCheckboxRow}
                  onPress={() => toggleDayOfWeek(day.value)}
                >
                  <View style={[styles.checkbox, selectedDays.includes(day.value) && styles.checkboxChecked]}>
                    {selectedDays.includes(day.value) && (
                      <Ionicons name="checkmark" size={18} color="#fff" />
                    )}
                  </View>
                  <Text style={styles.dayCheckboxLabel}>{day.label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.noteCard}>
              <Ionicons name="information-circle" size={20} color="#007AFF" />
              <Text style={styles.noteText}>
                Normal operating days are Mon-Fri, however sometimes Saturdays are available.
              </Text>
            </View>
          </View>
        </ScrollView>

        {/* Submit Button */}
        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.submitButton, loading && styles.submitButtonDisabled]}
            onPress={handleSubmit}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Ionicons name="checkmark-circle" size={20} color="#fff" />
                <Text style={styles.submitButtonText}>Submit Schedule Request</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  keyboardView: {
    flex: 1,
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
  section: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1C1C1E',
    marginBottom: 16,
  },
  calendarCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  calendarHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  calendarMonthYear: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1C1C1E',
  },
  dayNamesRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  dayName: {
    flex: 1,
    textAlign: 'center',
    fontSize: 12,
    fontWeight: '600',
    color: '#8E8E93',
  },
  weekRow: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  dayCell: {
    flex: 1,
    aspectRatio: 1,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
  },
  selectedDayCell: {
    backgroundColor: '#007AFF',
  },
  dayText: {
    fontSize: 16,
    color: '#1C1C1E',
  },
  selectedDayText: {
    color: '#fff',
    fontWeight: '600',
  },
  disabledDayText: {
    color: '#C7C7CC',
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    gap: 12,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#C7C7CC',
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxChecked: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  checkboxLabel: {
    fontSize: 16,
    color: '#1C1C1E',
    flex: 1,
  },
  daysCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 8,
    marginBottom: 16,
  },
  dayCheckboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    gap: 12,
  },
  dayCheckboxLabel: {
    fontSize: 16,
    color: '#1C1C1E',
    flex: 1,
  },
  noteCard: {
    flexDirection: 'row',
    backgroundColor: '#E3F2FD',
    padding: 12,
    borderRadius: 12,
    gap: 12,
    alignItems: 'flex-start',
  },
  noteText: {
    flex: 1,
    fontSize: 14,
    color: '#1C1C1E',
    lineHeight: 20,
  },
  footer: {
    padding: 16,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#E5E5EA',
  },
  submitButton: {
    backgroundColor: '#007AFF',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
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
