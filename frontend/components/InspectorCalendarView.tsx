import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  useWindowDimensions,
} from 'react-native';
import { format, addDays, startOfDay, isSameDay, parseISO } from 'date-fns';
import api from '../services/api';

interface Inspection {
  id: string;
  property_address: string;
  scheduled_date: string;
  scheduled_time: string;
  inspector_name?: string;
  inspector_id?: string;
}

interface InspectorCalendarViewProps {
  userId: string;
}

export default function InspectorCalendarView({ userId }: InspectorCalendarViewProps) {
  const { width: windowWidth } = useWindowDimensions();
  const [loading, setLoading] = useState(true);
  const [inspections, setInspections] = useState<Inspection[]>([]);
  const [currentWeekStart, setCurrentWeekStart] = useState(new Date());

  // Calculate responsive column width
  const TIME_COLUMN_WIDTH = 60;
  const PADDING = 32;
  const availableWidth = windowWidth - TIME_COLUMN_WIDTH - PADDING;
  const dayColumnWidth = Math.floor(availableWidth / 7);

  useEffect(() => {
    fetchInspections();
  }, [userId]);

  const fetchInspections = async () => {
    try {
      setLoading(true);
      const response = await api.get('/inspections');
      
      // Filter inspections assigned to this inspector
      const inspectorInspections = response.data.filter((inspection: Inspection) => 
        inspection.inspector_id === userId && 
        inspection.scheduled_date && 
        inspection.scheduled_time
      );
      
      setInspections(inspectorInspections);
    } catch (error) {
      console.error('Error fetching inspector inspections:', error);
    } finally {
      setLoading(false);
    }
  };

  // Generate array of 7 days starting from current day
  const getWeekDays = () => {
    return Array.from({ length: 7 }, (_, i) => addDays(startOfDay(currentWeekStart), i));
  };

  // Generate time slots (8 AM to 4 PM in 2-hour blocks)
  const getTimeSlots = () => {
    const slots = [];
    for (let hour = 8; hour <= 14; hour += 2) {
      slots.push({
        start: hour,
        label: format(new Date().setHours(hour, 0), 'h:mm a'),
      });
    }
    return slots;
  };

  // Find inspection for a specific day and time slot
  const getInspectionForSlot = (day: Date, hour: number) => {
    return inspections.find((inspection) => {
      const inspectionDate = parseISO(inspection.scheduled_date);
      
      // Parse time from format like "8am", "11am", "2pm"
      const timeStr = inspection.scheduled_time.toLowerCase();
      let inspectionHour = 0;
      
      // Extract hour and am/pm
      const match = timeStr.match(/(\d+)(am|pm)/);
      if (match) {
        let parsedHour = parseInt(match[1]);
        const period = match[2];
        
        // Convert to 24-hour format
        if (period === 'pm' && parsedHour !== 12) {
          inspectionHour = parsedHour + 12;
        } else if (period === 'am' && parsedHour === 12) {
          inspectionHour = 0;
        } else {
          inspectionHour = parsedHour;
        }
      }
      
      // Check if inspection falls within this 2-hour time slot
      return isSameDay(inspectionDate, day) && 
             inspectionHour >= hour && 
             inspectionHour < hour + 2;
    });
  };

  const weekDays = getWeekDays();
  const timeSlots = getTimeSlots();

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  return (
    <ScrollView 
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.container}
    >
      <View style={styles.calendarContainer}>
        {/* Header Row with Days */}
        <View style={styles.headerRow}>
          <View style={[styles.timeColumn, { width: TIME_COLUMN_WIDTH }]} />
          {weekDays.map((day, index) => {
            const isToday = isSameDay(day, new Date());
            return (
              <View 
                key={index} 
                style={[
                  styles.dayHeader, 
                  { width: dayColumnWidth },
                  isToday && styles.todayHeader
                ]}
              >
                <Text style={[styles.dayName, isToday && styles.todayText]}>
                  {format(day, 'EEE')}
                </Text>
                <Text style={[styles.dayNumber, isToday && styles.todayText]}>
                  {format(day, 'd')}
                </Text>
              </View>
            );
          })}
        </View>

        {/* Time Slots and Inspections */}
        <ScrollView style={styles.bodyScrollView}>
          {timeSlots.map((slot, slotIndex) => (
            <View key={slotIndex} style={styles.timeRow}>
              <View style={[styles.timeLabel, { width: TIME_COLUMN_WIDTH }]}>
                <Text style={styles.timeLabelText}>{slot.label}</Text>
              </View>
              
              {weekDays.map((day, dayIndex) => {
                const inspection = getInspectionForSlot(day, slot.start);
                
                return (
                  <View 
                    key={dayIndex} 
                    style={[
                      styles.timeCell,
                      { width: dayColumnWidth }
                    ]}
                  >
                    {inspection && (
                      <View style={styles.inspectionBlock}>
                        <Text style={styles.inspectionAddress} numberOfLines={2}>
                          {inspection.property_address}
                        </Text>
                        <Text style={styles.inspectionTime}>
                          {inspection.scheduled_time}
                        </Text>
                      </View>
                    )}
                  </View>
                );
              })}
            </View>
          ))}
        </ScrollView>

        {inspections.length === 0 && (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>No scheduled inspections</Text>
          </View>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  calendarContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    overflow: 'hidden',
  },
  headerRow: {
    flexDirection: 'row',
    borderBottomWidth: 2,
    borderBottomColor: '#E5E5EA',
    backgroundColor: '#F9F9F9',
  },
  timeColumn: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 12,
  },
  dayHeader: {
    paddingVertical: 12,
    alignItems: 'center',
    borderLeftWidth: 1,
    borderLeftColor: '#E5E5EA',
  },
  todayHeader: {
    backgroundColor: '#E8F4FD',
  },
  dayName: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
    marginBottom: 4,
  },
  dayNumber: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1C1C1E',
  },
  todayText: {
    color: '#007AFF',
  },
  bodyScrollView: {
    maxHeight: 400,
  },
  timeRow: {
    flexDirection: 'row',
    minHeight: 80,
    borderBottomWidth: 1,
    borderBottomColor: '#F2F2F7',
  },
  timeLabel: {
    justifyContent: 'flex-start',
    alignItems: 'center',
    paddingTop: 8,
  },
  timeLabelText: {
    fontSize: 11,
    color: '#8E8E93',
    fontWeight: '500',
  },
  timeCell: {
    minHeight: 80,
    borderLeftWidth: 1,
    borderLeftColor: '#F2F2F7',
    padding: 4,
  },
  inspectionBlock: {
    backgroundColor: '#007AFF',
    borderRadius: 6,
    padding: 8,
    height: '100%',
    justifyContent: 'center',
  },
  inspectionAddress: {
    fontSize: 11,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 4,
  },
  inspectionTime: {
    fontSize: 10,
    color: '#E8F4FD',
    fontWeight: '500',
  },
  emptyState: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: '#8E8E93',
  },
});
