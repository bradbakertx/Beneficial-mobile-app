import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { 
  startOfMonth, 
  endOfMonth, 
  eachDayOfInterval, 
  format, 
  isSameDay, 
  addMonths, 
  subMonths,
  startOfWeek,
  endOfWeek,
  isAfter,
  isBefore
} from 'date-fns';

interface CalendarPickerProps {
  selectedDate: Date;
  onDateSelect: (date: Date) => void;
  minDate?: Date;
  maxDate?: Date;
  preferredDays?: string[];
}

export default function CalendarPicker({ 
  selectedDate, 
  onDateSelect,
  minDate,
  maxDate,
  preferredDays = []
}: CalendarPickerProps) {
  const [currentMonth, setCurrentMonth] = useState(selectedDate);

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calendarStart = startOfWeek(monthStart);
  const calendarEnd = endOfWeek(monthEnd);
  
  const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd });
  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  const isDateDisabled = (date: Date) => {
    if (minDate && isBefore(date, minDate)) return true;
    if (maxDate && isAfter(date, maxDate)) return true;
    return false;
  };

  const isPreferredDay = (date: Date) => {
    const dayName = format(date, 'EEEE');
    return preferredDays.includes(dayName);
  };

  const handlePrevMonth = () => {
    setCurrentMonth(subMonths(currentMonth, 1));
  };

  const handleNextMonth = () => {
    setCurrentMonth(addMonths(currentMonth, 1));
  };

  const handleDatePress = (date: Date) => {
    if (!isDateDisabled(date)) {
      onDateSelect(date);
    }
  };

  return (
    <View style={styles.container}>
      {/* Month Navigation */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handlePrevMonth} style={styles.navButton}>
          <Ionicons name="chevron-back" size={24} color="#007AFF" />
        </TouchableOpacity>
        <Text style={styles.monthTitle}>
          {format(currentMonth, 'MMMM yyyy')}
        </Text>
        <TouchableOpacity onPress={handleNextMonth} style={styles.navButton}>
          <Ionicons name="chevron-forward" size={24} color="#007AFF" />
        </TouchableOpacity>
      </View>

      {/* Week Day Headers */}
      <View style={styles.weekDaysContainer}>
        {weekDays.map((day) => (
          <View key={day} style={styles.weekDayCell}>
            <Text style={styles.weekDayText}>{day}</Text>
          </View>
        ))}
      </View>

      {/* Calendar Grid */}
      <View style={styles.daysContainer}>
        {days.map((day, index) => {
          const isSelected = isSameDay(day, selectedDate);
          const isDisabled = isDateDisabled(day);
          const isCurrentMonth = format(day, 'M') === format(currentMonth, 'M');
          const isPreferred = isPreferredDay(day);

          return (
            <TouchableOpacity
              key={index}
              style={[
                styles.dayCell,
                isSelected && styles.selectedDay,
                isDisabled && styles.disabledDay,
                isPreferred && !isDisabled && !isSelected && styles.preferredDay
              ]}
              onPress={() => handleDatePress(day)}
              disabled={isDisabled}
            >
              <Text
                style={[
                  styles.dayText,
                  !isCurrentMonth && styles.otherMonthText,
                  isSelected && styles.selectedDayText,
                  isDisabled && styles.disabledDayText,
                  isPreferred && !isDisabled && !isSelected && styles.preferredDayText
                ]}
              >
                {format(day, 'd')}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Legend */}
      {preferredDays.length > 0 && (
        <View style={styles.legend}>
          <View style={styles.legendItem}>
            <View style={[styles.legendBox, styles.preferredDay]} />
            <Text style={styles.legendText}>Customer Preferred Days</Text>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginTop: 12,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  navButton: {
    padding: 8,
  },
  monthTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1C1C1E',
  },
  weekDaysContainer: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  weekDayCell: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
  },
  weekDayText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#8E8E93',
  },
  daysContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  dayCell: {
    width: '14.28%',
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
  },
  selectedDay: {
    backgroundColor: '#007AFF',
  },
  disabledDay: {
    opacity: 0.3,
  },
  preferredDay: {
    backgroundColor: '#E3F2FD',
    borderWidth: 1,
    borderColor: '#007AFF',
  },
  dayText: {
    fontSize: 16,
    color: '#1C1C1E',
  },
  otherMonthText: {
    color: '#C7C7CC',
  },
  selectedDayText: {
    color: '#fff',
    fontWeight: '600',
  },
  disabledDayText: {
    color: '#C7C7CC',
  },
  preferredDayText: {
    color: '#007AFF',
    fontWeight: '500',
  },
  legend: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E5EA',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
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
});
