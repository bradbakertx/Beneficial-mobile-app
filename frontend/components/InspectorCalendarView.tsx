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

  // Generate hourly time labels from 8 AM to 4 PM
  const getTimeSlots = () => {
    const slots = [];
    for (let hour = 8; hour <= 16; hour++) {
      slots.push({
        hour: hour,
        label: format(new Date().setHours(hour, 0), 'h:00 a'),
      });
    }
    return slots;
  };

  // Define the actual inspection blocks: 8-10, 11-2, 2-4
  const getInspectionBlockForTime = (scheduledTime: string) => {
    const timeStr = scheduledTime.toLowerCase();
    const match = timeStr.match(/(\d+)(am|pm)/);
    
    if (!match) return null;
    
    let parsedHour = parseInt(match[1]);
    const period = match[2];
    
    // Convert to 24-hour format
    let hour24 = parsedHour;
    if (period === 'pm' && parsedHour !== 12) {
      hour24 = parsedHour + 12;
    } else if (period === 'am' && parsedHour === 12) {
      hour24 = 0;
    }
    
    // Map to inspection blocks
    if (hour24 === 8) {
      return { start: 8, end: 10, label: '8-10 AM' };
    } else if (hour24 === 11) {
      return { start: 11, end: 14, label: '11 AM-2 PM' };
    } else if (hour24 === 14) {
      return { start: 14, end: 16, label: '2-4 PM' };
    }
    
    return null;
  };

  // Find inspection for a specific day that should be displayed at this hour
  const getInspectionForSlot = (day: Date, hour: number) => {
    return inspections.find((inspection) => {
      const inspectionDate = parseISO(inspection.scheduled_date);
      
      if (!isSameDay(inspectionDate, day)) return false;
      
      const block = getInspectionBlockForTime(inspection.scheduled_time);
      
      if (!block) return false;
      
      // Show the inspection at its start hour only
      return hour === block.start;
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
                const inspection = getInspectionForSlot(day, slot.hour);
                
                // Calculate block height based on inspection duration
                let blockHeight = 60; // Default single hour height
                if (inspection) {
                  const block = getInspectionBlockForTime(inspection.scheduled_time);
                  if (block) {
                    const durationHours = block.end - block.start;
                    blockHeight = durationHours * 60; // 60px per hour
                  }
                }
                
                return (
                  <View 
                    key={dayIndex} 
                    style={[
                      styles.timeCell,
                      { width: dayColumnWidth }
                    ]}
                  >
                    {inspection && (
                      <View style={[styles.inspectionBlock, { height: blockHeight }]}>
                        <Text style={styles.inspectionAddress} numberOfLines={2}>
                          {inspection.property_address}
                        </Text>
                        <Text style={styles.inspectionTime}>
                          {getInspectionBlockForTime(inspection.scheduled_time)?.label}
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
    height: 60,
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
    height: 60,
    borderLeftWidth: 1,
    borderLeftColor: '#F2F2F7',
    padding: 4,
  },
  inspectionBlock: {
    backgroundColor: '#007AFF',
    borderRadius: 6,
    padding: 8,
    justifyContent: 'center',
    position: 'absolute',
    left: 4,
    right: 4,
    top: 4,
    zIndex: 10,
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
