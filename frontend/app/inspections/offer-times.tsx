import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, addMonths, subMonths, isSameDay } from 'date-fns';
import api from '../../services/api';
import { formatDateLocal, parseDateLocal } from '../../utils/dateUtils';

const TIME_SLOTS = ['8am', '11am', '2pm'];

interface TimeSlotOffer {
  date: string;
  times: string[];
}

export default function OfferTimeSlotsScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [inspection, setInspection] = useState<any>(null);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDates, setSelectedDates] = useState<Date[]>([]);
  const [timeSlotSelections, setTimeSlotSelections] = useState<{ [key: string]: string[] }>({});

  useEffect(() => {
    fetchInspection();
  }, [id]);

  const fetchInspection = async () => {
    try {
      const response = await api.get('/admin/inspections/pending-scheduling');
      const found = response.data.find((i: any) => i.id === id);
      if (found) {
        setInspection(found);
      } else {
        if (Platform.OS === 'web') {
          window.alert('Inspection not found');
        }
        router.back();
      }
    } catch (error) {
      console.error('Error fetching inspection:', error);
      if (Platform.OS === 'web') {
        window.alert('Failed to fetch inspection details');
      }
      router.back();
    } finally {
      setLoading(false);
    }
  };

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });

  // Group days by week
  const weeks: Date[][] = [];
  let currentWeek: Date[] = [];
  
  const firstDayOfWeek = monthStart.getDay();
  for (let i = 0; i < firstDayOfWeek; i++) {
    currentWeek.push(null as any);
  }

  daysInMonth.forEach((day, index) => {
    currentWeek.push(day);
    if (currentWeek.length === 7 || index === daysInMonth.length - 1) {
      while (currentWeek.length < 7) {
        currentWeek.push(null as any);
      }
      weeks.push(currentWeek);
      currentWeek = [];
    }
  });

  const handleDateToggle = (date: Date | null) => {
    if (!date) return;
    
    const isSelected = selectedDates.some(d => isSameDay(d, date));
    
    if (isSelected) {
      // Remove date and its time selections
      setSelectedDates(selectedDates.filter(d => !isSameDay(d, date)));
      const dateKey = format(date, 'yyyy-MM-dd');
      const newSelections = { ...timeSlotSelections };
      delete newSelections[dateKey];
      setTimeSlotSelections(newSelections);
    } else {
      // Add date
      setSelectedDates([...selectedDates, date]);
    }
  };

  const handleTimeSlotToggle = (date: Date, time: string) => {
    const dateKey = format(date, 'yyyy-MM-dd');
    const currentTimes = timeSlotSelections[dateKey] || [];
    
    if (currentTimes.includes(time)) {
      setTimeSlotSelections({
        ...timeSlotSelections,
        [dateKey]: currentTimes.filter(t => t !== time)
      });
    } else {
      setTimeSlotSelections({
        ...timeSlotSelections,
        [dateKey]: [...currentTimes, time]
      });
    }
  };

  const handleSubmit = async () => {
    // Validation
    if (selectedDates.length === 0) {
      if (Platform.OS === 'web') {
        window.alert('Please select at least one date to offer');
      }
      return;
    }

    // Check that all selected dates have at least one time slot
    for (const date of selectedDates) {
      const dateKey = format(date, 'yyyy-MM-dd');
      const times = timeSlotSelections[dateKey] || [];
      if (times.length === 0) {
        if (Platform.OS === 'web') {
          window.alert(`Please select at least one time slot for ${format(date, 'MMM dd, yyyy')}`);
        }
        return;
      }
    }

    setSubmitting(true);
    try {
      // Build offered time slots array
      // Use formatDateLocal utility to avoid timezone issues
      const offeredTimeSlots: TimeSlotOffer[] = selectedDates.map(date => {
        const dateString = formatDateLocal(date);
        
        return {
          date: dateString,
          times: timeSlotSelections[format(date, 'yyyy-MM-dd')] || []
        };
      });

      console.log('Submitting time slot offers:', offeredTimeSlots);
      
      const response = await api.patch(`/admin/inspections/${id}/offer-times`, {
        offered_time_slots: offeredTimeSlots
      });
      
      console.log('Time slots offered:', response.data);

      // Navigate back to dashboard
      router.replace('/(tabs)');

      // Show success message
      setTimeout(() => {
        if (Platform.OS === 'web') {
          window.alert('Time slots offered successfully! The customer will be notified.');
        }
      }, 500);

    } catch (error: any) {
      console.error('Error offering time slots:', error);
      setSubmitting(false);
      
      if (Platform.OS === 'web') {
        window.alert(error.response?.data?.detail || 'Failed to offer time slots. Please try again.');
      }
    }
  };

  const isOptionPeriodDate = (date: Date) => {
    if (!inspection?.option_period_end_date) return false;
    const optionDate = parseDateLocal(inspection.option_period_end_date);
    return isSameDay(date, optionDate);
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
        <Text style={styles.headerTitle}>Offer Time Slots</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Customer Info */}
        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>{inspection.customer_name}</Text>
          <Text style={styles.infoSubtitle}>{inspection.property_address}</Text>
          
          <View style={styles.preferencesBox}>
            <View style={styles.preferenceRow}>
              <Ionicons name="calendar" size={16} color="#FF9500" />
              <Text style={styles.preferenceText}>
                Option Period End: {inspection.option_period_unsure ? 'Unsure' : 
                  inspection.option_period_end_date ? format(new Date(inspection.option_period_end_date), 'MMM dd, yyyy') : 'Not specified'}
              </Text>
            </View>
            <View style={styles.preferenceRow}>
              <Ionicons name="time" size={16} color="#34C759" />
              <Text style={styles.preferenceText}>
                Preferred Days: {inspection.preferred_days_of_week.join(', ')}
              </Text>
            </View>
          </View>
        </View>

        {/* Instructions */}
        <View style={styles.instructionsCard}>
          <Text style={styles.instructionsTitle}>Select Dates & Times to Offer:</Text>
          <Text style={styles.instructionsText}>
            1. Tap dates on the calendar to select them
          </Text>
          <Text style={styles.instructionsText}>
            2. For each selected date, choose time slots to offer
          </Text>
          <Text style={styles.instructionsText}>
            3. Submit your availability to the customer
          </Text>
        </View>

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
                const isSelected = day && selectedDates.some(d => isSameDay(d, day));
                const isOptionDay = day && isOptionPeriodDate(day);
                
                return (
                  <TouchableOpacity
                    key={dayIndex}
                    style={[
                      styles.dayCell,
                      isSelected && styles.selectedDayCell,
                      isOptionDay && styles.optionPeriodDayCell,
                    ]}
                    onPress={() => handleDateToggle(day)}
                    disabled={!day}
                  >
                    {day && (
                      <Text style={[
                        styles.dayText,
                        isSelected && styles.selectedDayText,
                        isOptionDay && styles.optionPeriodDayText,
                      ]}>
                        {day.getDate()}
                      </Text>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          ))}

          {inspection.option_period_end_date && (
            <View style={styles.legendRow}>
              <View style={[styles.legendBox, { backgroundColor: '#FF9500' }]} />
              <Text style={styles.legendText}>= Option Period End Date</Text>
            </View>
          )}
        </View>

        {/* Time Slot Selection for Selected Dates */}
        {selectedDates.length > 0 && (
          <View style={styles.timeSlotSection}>
            <Text style={styles.sectionTitle}>Select Time Slots for Each Date:</Text>
            {selectedDates.sort((a, b) => a.getTime() - b.getTime()).map(date => {
              const dateKey = format(date, 'yyyy-MM-dd');
              const selectedTimes = timeSlotSelections[dateKey] || [];
              
              return (
                <View key={dateKey} style={styles.dateTimeCard}>
                  <Text style={styles.dateTimeCardTitle}>
                    {format(date, 'EEEE, MMMM dd, yyyy')}
                  </Text>
                  <View style={styles.timeSlotButtons}>
                    {TIME_SLOTS.map(time => (
                      <TouchableOpacity
                        key={time}
                        style={[
                          styles.timeSlotButton,
                          selectedTimes.includes(time) && styles.timeSlotButtonSelected
                        ]}
                        onPress={() => handleTimeSlotToggle(date, time)}
                      >
                        <Text style={[
                          styles.timeSlotButtonText,
                          selectedTimes.includes(time) && styles.timeSlotButtonTextSelected
                        ]}>
                          {time}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              );
            })}
          </View>
        )}
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
            <>
              <Ionicons name="checkmark-circle" size={20} color="#fff" />
              <Text style={styles.submitButtonText}>Submit Time Slot Offers</Text>
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
  content: {
    flex: 1,
  },
  infoCard: {
    backgroundColor: '#fff',
    padding: 16,
    marginBottom: 8,
  },
  infoTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1C1C1E',
    marginBottom: 4,
  },
  infoSubtitle: {
    fontSize: 14,
    color: '#8E8E93',
    marginBottom: 12,
  },
  preferencesBox: {
    backgroundColor: '#F9F9F9',
    padding: 12,
    borderRadius: 8,
    gap: 8,
  },
  preferenceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  preferenceText: {
    fontSize: 14,
    color: '#1C1C1E',
    flex: 1,
  },
  instructionsCard: {
    backgroundColor: '#E3F2FD',
    padding: 16,
    marginBottom: 16,
  },
  instructionsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1C1C1E',
    marginBottom: 8,
  },
  instructionsText: {
    fontSize: 14,
    color: '#1C1C1E',
    marginBottom: 4,
  },
  calendarCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 16,
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
  optionPeriodDayCell: {
    backgroundColor: '#FF9500',
  },
  dayText: {
    fontSize: 16,
    color: '#1C1C1E',
  },
  selectedDayText: {
    color: '#fff',
    fontWeight: '600',
  },
  optionPeriodDayText: {
    color: '#fff',
    fontWeight: '600',
  },
  legendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    gap: 8,
  },
  legendBox: {
    width: 20,
    height: 20,
    borderRadius: 4,
  },
  legendText: {
    fontSize: 12,
    color: '#8E8E93',
  },
  timeSlotSection: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1C1C1E',
    marginBottom: 12,
  },
  dateTimeCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  dateTimeCardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1C1C1E',
    marginBottom: 12,
  },
  timeSlotButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  timeSlotButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#007AFF',
    alignItems: 'center',
  },
  timeSlotButtonSelected: {
    backgroundColor: '#007AFF',
  },
  timeSlotButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#007AFF',
  },
  timeSlotButtonTextSelected: {
    color: '#fff',
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
