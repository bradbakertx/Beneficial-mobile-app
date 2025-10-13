import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  Linking,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import api from '../services/api';
import { format, startOfWeek, addDays, parseISO, isSameDay } from 'date-fns';

interface CalendarEvent {
  id: string;
  title: string;
  start: string;
  end: string;
  description?: string;
  location?: string;
  all_day: boolean;
}

export default function CalendarWeekView() {
  const [loading, setLoading] = useState(true);
  const [connected, setConnected] = useState(false);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [currentWeekStart, setCurrentWeekStart] = useState(startOfWeek(new Date(), { weekStartsOn: 0 })); // Sunday

  useEffect(() => {
    checkConnection();
  }, []);

  useEffect(() => {
    if (connected) {
      fetchEvents();
    }
  }, [connected, currentWeekStart]);

  const checkConnection = async () => {
    try {
      const response = await api.get('/calendar/status');
      setConnected(response.data.connected);
      setLoading(false);
    } catch (error) {
      console.error('Error checking calendar connection:', error);
      setConnected(false);
      setLoading(false);
    }
  };

  const connectGoogleCalendar = async () => {
    try {
      const response = await api.get('/auth/google/login');
      const authUrl = response.data.auth_url;
      
      // Open Google OAuth in browser
      const canOpen = await Linking.canOpenURL(authUrl);
      if (canOpen) {
        await Linking.openURL(authUrl);
      } else {
        Alert.alert('Error', 'Unable to open Google Calendar authorization');
      }
    } catch (error) {
      console.error('Error connecting Google Calendar:', error);
      Alert.alert('Error', 'Failed to connect Google Calendar');
    }
  };

  const fetchEvents = async () => {
    try {
      const start = currentWeekStart.toISOString();
      const end = addDays(currentWeekStart, 7).toISOString();
      
      const response = await api.get(`/calendar/events?start_date=${start}&end_date=${end}`);
      setEvents(response.data.events || []);
      
      // Check if there's a message from the backend (e.g., calendar not connected properly)
      if (response.data.message) {
        setErrorMessage(response.data.message);
      } else {
        setErrorMessage('');
      }
    } catch (error: any) {
      console.error('Error fetching events:', error);
      if (error.response?.status === 401) {
        setConnected(false);
      }
    }
  };

  const getWeekDays = () => {
    const days = [];
    for (let i = 0; i < 7; i++) {
      days.push(addDays(currentWeekStart, i));
    }
    return days;
  };

  const getEventsForDay = (day: Date) => {
    return events.filter(event => {
      const eventStart = parseISO(event.start);
      return isSameDay(eventStart, day);
    });
  };

  const renderHourSlots = () => {
    const hours = [];
    for (let i = 8; i <= 18; i++) { // 8 AM to 6 PM
      hours.push(i);
    }
    return hours;
  };

  const getEventPosition = (event: CalendarEvent) => {
    const start = parseISO(event.start);
    const hour = start.getHours();
    const minute = start.getMinutes();
    return ((hour - 8) * 60 + minute) / 60; // Relative to 8 AM
  };

  const getEventDuration = (event: CalendarEvent) => {
    const start = parseISO(event.start);
    const end = parseISO(event.end);
    const durationMs = end.getTime() - start.getTime();
    return durationMs / (1000 * 60 * 60); // Hours
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  if (!connected) {
    return (
      <View style={styles.disconnectedContainer}>
        <Ionicons name="calendar-outline" size={64} color="#C7C7CC" />
        <Text style={styles.disconnectedTitle}>Connect Google Calendar</Text>
        <Text style={styles.disconnectedText}>
          Connect your Google Calendar to view your schedule
        </Text>
        <TouchableOpacity style={styles.connectButton} onPress={connectGoogleCalendar}>
          <Ionicons name="logo-google" size={20} color="#fff" />
          <Text style={styles.connectButtonText}>Connect Calendar</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const weekDays = getWeekDays();

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => setCurrentWeekStart(addDays(currentWeekStart, -7))}>
          <Ionicons name="chevron-back" size={24} color="#007AFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {format(currentWeekStart, 'MMM d')} - {format(addDays(currentWeekStart, 6), 'MMM d, yyyy')}
        </Text>
        <TouchableOpacity onPress={() => setCurrentWeekStart(addDays(currentWeekStart, 7))}>
          <Ionicons name="chevron-forward" size={24} color="#007AFF" />
        </TouchableOpacity>
      </View>

      {errorMessage && (
        <View style={styles.errorBanner}>
          <Ionicons name="information-circle" size={20} color="#FF9500" />
          <Text style={styles.errorText}>{errorMessage}</Text>
          <TouchableOpacity onPress={connectGoogleCalendar} style={styles.reconnectButton}>
            <Text style={styles.reconnectText}>Reconnect</Text>
          </TouchableOpacity>
        </View>
      )}

      {events.length === 0 && !errorMessage ? (
        <View style={styles.emptyState}>
          <Ionicons name="calendar-outline" size={48} color="#C7C7CC" />
          <Text style={styles.emptyStateText}>No events this week</Text>
        </View>
      ) : (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.calendarScroll}>
        <View>
          {/* Day headers */}
          <View style={styles.dayHeadersRow}>
            <View style={styles.timeColumn} />
            {weekDays.map((day, index) => (
              <View key={index} style={styles.dayHeader}>
                <Text style={styles.dayName}>{format(day, 'EEE')}</Text>
                <Text style={[
                  styles.dayNumber,
                  isSameDay(day, new Date()) && styles.today
                ]}>
                  {format(day, 'd')}
                </Text>
              </View>
            ))}
          </View>

          {/* Calendar grid */}
          <ScrollView showsVerticalScrollIndicator={false}>
            {renderHourSlots().map((hour) => (
              <View key={hour} style={styles.timeRow}>
                <View style={styles.timeColumn}>
                  <Text style={styles.timeText}>{hour % 12 || 12} {hour < 12 ? 'AM' : 'PM'}</Text>
                </View>
                {weekDays.map((day, dayIndex) => {
                  const dayEvents = getEventsForDay(day);
                  const hourEvents = dayEvents.filter(event => {
                    const eventStart = parseISO(event.start);
                    return eventStart.getHours() === hour;
                  });

                  return (
                    <View key={dayIndex} style={styles.dayColumn}>
                      {hourEvents.map((event) => (
                        <View
                          key={event.id}
                          style={[
                            styles.event,
                            {
                              height: Math.max(getEventDuration(event) * 60, 40),
                            }
                          ]}
                        >
                          <Text style={styles.eventTitle} numberOfLines={1}>
                            {event.title}
                          </Text>
                          <Text style={styles.eventTime} numberOfLines={1}>
                            {format(parseISO(event.start), 'h:mm a')}
                          </Text>
                        </View>
                      ))}
                    </View>
                  );
                })}
              </View>
            ))}
          </ScrollView>
        </View>
      </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    borderRadius: 12,
    overflow: 'hidden',
  },
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  disconnectedContainer: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F9F9F9',
    borderRadius: 12,
  },
  disconnectedTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1C1C1E',
    marginTop: 16,
  },
  disconnectedText: {
    fontSize: 14,
    color: '#8E8E93',
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 24,
  },
  connectButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#007AFF',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
  },
  connectButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1C1C1E',
  },
  calendarScroll: {
    maxHeight: 400,
  },
  dayHeadersRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  timeColumn: {
    width: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayHeader: {
    width: 80,
    padding: 12,
    alignItems: 'center',
  },
  dayName: {
    fontSize: 12,
    color: '#8E8E93',
    fontWeight: '500',
  },
  dayNumber: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1C1C1E',
    marginTop: 4,
  },
  today: {
    color: '#007AFF',
  },
  timeRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#F2F2F7',
  },
  timeText: {
    fontSize: 11,
    color: '#8E8E93',
  },
  dayColumn: {
    width: 80,
    height: 60,
    borderRightWidth: 1,
    borderRightColor: '#F2F2F7',
    padding: 2,
  },
  event: {
    backgroundColor: '#007AFF',
    borderRadius: 4,
    padding: 4,
    marginBottom: 2,
  },
  eventTitle: {
    fontSize: 11,
    fontWeight: '600',
    color: '#fff',
  },
  eventTime: {
    fontSize: 9,
    color: '#fff',
    opacity: 0.8,
  },
});
