import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  TextInput,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Picker } from '@react-native-picker/picker';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, addMonths, subMonths, isSameDay } from 'date-fns';
import api from '../../services/api';
import { formatDateLocal, parseDateLocal } from '../../utils/dateUtils';
import CalendarWeekView from '../../components/CalendarWeekView';

const TIME_SLOTS = ['8am', '11am', '2pm'];

interface Inspector {
  id: string;
  name: string;
  email: string;
  role: string;
  license_number?: string;
  phone?: string;
}

interface TimeSlotOffer {
  date: string;
  time: string;
  inspector: string;  // Inspector name
  inspectorLicense: string;
  inspectorPhone: string;
}

export default function OfferTimeSlotsScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [inspection, setInspection] = useState<any>(null);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDates, setSelectedDates] = useState<Date[]>([]);
  // New structure: Track inspector for each date+time slot
  const [timeSlotInspectors, setTimeSlotInspectors] = useState<{ [key: string]: number }>({}); // key format: "2025-10-21-8am" -> inspectorIndex
  const [inspectionFee, setInspectionFee] = useState(''); // For direct schedule inspections
  const [inspectors, setInspectors] = useState<Inspector[]>([]);
  const [loadingInspectors, setLoadingInspectors] = useState(true);

  useEffect(() => {
    fetchInspection();
    fetchInspectors();
  }, [id]);

  const fetchInspectors = async () => {
    try {
      setLoadingInspectors(true);
      const response = await api.get('/users/inspectors');
      setInspectors(response.data.inspectors || []);
    } catch (error) {
      console.error('Error fetching inspectors:', error);
      Alert.alert('Error', 'Failed to load inspectors list');
    } finally {
      setLoadingInspectors(false);
    }
  };

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
      // Remove date and all its time slot inspector assignments
      setSelectedDates(selectedDates.filter(d => !isSameDay(d, date)));
      const dateKey = format(date, 'yyyy-MM-dd');
      // Remove all time slot assignments for this date
      const newInspectors = { ...timeSlotInspectors };
      Object.keys(newInspectors).forEach(key => {
        if (key.startsWith(dateKey)) {
          delete newInspectors[key];
        }
      });
      setTimeSlotInspectors(newInspectors);
    } else {
      // Add date
      setSelectedDates([...selectedDates, date]);
    }
  };

  const handleSubmit = async () => {
    // Validation
    if (selectedDates.length === 0) {
      Alert.alert('Error', 'Please select at least one date to offer');
      return;
    }

    // Check that we have at least one time slot with inspector assigned
    if (Object.keys(timeSlotInspectors).length === 0) {
      Alert.alert('Error', 'Please select at least one time slot and assign an inspector');
      return;
    }

    // Validate inspection fee for direct schedule (no quote)
    if (!inspection.quote_id) {
      if (!inspectionFee || parseFloat(inspectionFee) <= 0) {
        Alert.alert('Error', 'Please enter a valid inspection fee amount');
        return;
      }
    }

    setSubmitting(true);
    try {
      // Build offered time slots array from timeSlotInspectors
      // Format: { date: "2025-10-21", time: "8am", inspector: "Brad Baker", inspectorLicense: "TREC #7522", inspectorPhone: "(210) 562-0673" }
      const offeredTimeSlots: TimeSlotOffer[] = Object.keys(timeSlotInspectors).map(slotKey => {
        const parts = slotKey.split('-');
        const time = parts[parts.length - 1];
        const dateStr = parts.slice(0, 3).join('-'); // yyyy-MM-dd
        const inspectorIndex = timeSlotInspectors[slotKey];
        const inspector = inspectors[inspectorIndex];
        
        return {
          date: dateStr,
          time: time,
          inspector: inspector.name,
          inspectorLicense: inspector.license_number || '',
          inspectorPhone: inspector.phone || ''
        };
      });

      console.log('Submitting time slot offers with inspectors:', offeredTimeSlots);
      
      // Prepare request payload
      const payload: any = {
        offered_time_slots: offeredTimeSlots
      };

      // Include inspection fee for direct schedule (no quote)
      if (!inspection.quote_id && inspectionFee) {
        payload.inspection_fee = parseFloat(inspectionFee);
      }

      const response = await api.patch(`/admin/inspections/${id}/offer-times`, payload);
      
      console.log('Time slots offered:', response.data);

      // Navigate back to dashboard
      router.replace('/(tabs)');

      // Show success message
      setTimeout(() => {
        Alert.alert('Success', 'Time slots offered successfully! The customer will be notified.');
      }, 500);

    } catch (error: any) {
      console.error('Error offering time slots:', error);
      setSubmitting(false);
      Alert.alert('Error', error.response?.data?.detail || 'Failed to offer time slots. Please try again.');
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
                  inspection.option_period_end_date ? format(parseDateLocal(inspection.option_period_end_date), 'MMM dd, yyyy') : 'Not specified'}
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

        {/* Inspection Fee - Only for direct schedule (no quote) */}
        {!inspection.quote_id && (
          <View style={styles.feeCard}>
            <Text style={styles.feeTitle}>Inspection Fee: *</Text>
            <Text style={styles.feeSubtext}>Enter the inspection fee amount</Text>
            <View style={styles.feeInputContainer}>
              <Text style={styles.dollarSign}>$</Text>
              <TextInput
                style={styles.feeInput}
                value={inspectionFee}
                onChangeText={setInspectionFee}
                keyboardType="decimal-pad"
                maxLength={10}
              />
            </View>
            <Text style={styles.feeNote}>
              This fee will appear on the pre-inspection agreement
            </Text>
          </View>
        )}

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

        {/* Google Calendar View */}
        <View style={styles.googleCalendarSection}>
          <Text style={styles.sectionTitle}>Your Google Calendar:</Text>
          <Text style={styles.sectionSubtitle}>
            View your existing appointments to find available time slots
          </Text>
          <CalendarWeekView />
        </View>

        {/* Time Slot Selection for Selected Dates */}
        {selectedDates.length > 0 && (
          <View style={styles.timeSlotSection}>
            <Text style={styles.sectionTitle}>Select Time Slots and Assign Inspectors:</Text>
            {selectedDates.sort((a, b) => a.getTime() - b.getTime()).map(date => {
              const dateKey = format(date, 'yyyy-MM-dd');
              
              return (
                <View key={dateKey} style={styles.dateTimeCard}>
                  <Text style={styles.dateTimeCardTitle}>
                    {format(date, 'EEEE, MMMM dd, yyyy')}
                  </Text>
                  {TIME_SLOTS.map(time => {
                    const slotKey = `${dateKey}-${time}`;
                    const inspectorIndex = timeSlotInspectors[slotKey];
                    const hasInspector = inspectorIndex !== undefined;
                    
                    return (
                      <View key={time} style={styles.timeSlotRow}>
                        <Text style={styles.timeLabel}>{time}</Text>
                        <View style={styles.timeSlotPickerContainer}>
                          <Picker
                            selectedValue={hasInspector ? inspectorIndex : -1}
                            onValueChange={(value) => {
                              if (value === -1) {
                                // Remove slot
                                const newSlots = {...timeSlotInspectors};
                                delete newSlots[slotKey];
                                setTimeSlotInspectors(newSlots);
                              } else {
                                // Add/update slot
                                setTimeSlotInspectors({...timeSlotInspectors, [slotKey]: value});
                              }
                            }}
                            style={styles.timeSlotPicker}
                          >
                            <Picker.Item label="-- Select Inspector --" value={-1} />
                            {inspectors.map((insp, idx) => (
                              <Picker.Item 
                                key={idx} 
                                label={`${insp.name}${insp.license_number ? ' - ' + insp.license_number : ''}`} 
                                value={idx} 
                              />
                            ))}
                          </Picker>
                        </View>
                      </View>
                    );
                  })}
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
  inspectorCard: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  inspectorTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1C1C1E',
    marginBottom: 12,
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: '#E5E5EA',
    borderRadius: 8,
    marginBottom: 8,
    overflow: 'hidden',
  },
  picker: {
    height: 50,
  },
  inspectorInfo: {
    fontSize: 14,
    color: '#8E8E93',
    marginTop: 4,
  },
  feeCard: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginHorizontal: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  feeTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1C1C1E',
    marginBottom: 4,
  },
  feeSubtext: {
    fontSize: 14,
    color: '#8E8E93',
    marginBottom: 12,
  },
  feeInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E5EA',
    borderRadius: 8,
    paddingHorizontal: 12,
    backgroundColor: '#F9F9F9',
    marginBottom: 8,
  },
  dollarSign: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1C1C1E',
    marginRight: 4,
  },
  feeInput: {
    flex: 1,
    fontSize: 18,
    fontWeight: '600',
    color: '#1C1C1E',
    paddingVertical: 12,
    textAlign: 'left',
  },
  feeNote: {
    fontSize: 12,
    color: '#8E8E93',
    fontStyle: 'italic',
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
  googleCalendarSection: {
    padding: 16,
    paddingTop: 0,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#8E8E93',
    marginBottom: 16,
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
  timeSlotRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F2F2F7',
  },
  timeLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1C1C1E',
    width: 70,
  },
  timeSlotPickerContainer: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E5EA',
    overflow: 'hidden',
  },
  timeSlotPicker: {
    height: 50,
  },
});
