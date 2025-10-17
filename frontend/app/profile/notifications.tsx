import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Switch,
  ScrollView,
  Alert,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import api from '../../services/api';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface NotificationPreferences {
  new_quotes: boolean;
  scheduling_updates: boolean;
  chat_messages: boolean;
  report_uploads: boolean;
}

export default function NotificationsScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [preferences, setPreferences] = useState<NotificationPreferences>({
    new_quotes: true,
    scheduling_updates: true,
    chat_messages: true,
    report_uploads: true,
  });

  useEffect(() => {
    loadPreferences();
  }, []);

  const loadPreferences = async () => {
    try {
      setLoading(true);
      
      // Try to load from backend first
      try {
        const response = await api.get('/users/notification-preferences');
        if (response.data) {
          setPreferences(response.data);
        }
      } catch (backendError) {
        // If backend fails, load from AsyncStorage
        const stored = await AsyncStorage.getItem('notification_preferences');
        if (stored) {
          setPreferences(JSON.parse(stored));
        }
      }
    } catch (error) {
      console.error('Error loading notification preferences:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = async (key: keyof NotificationPreferences) => {
    const newPreferences = {
      ...preferences,
      [key]: !preferences[key],
    };

    // Update UI immediately
    setPreferences(newPreferences);

    // Save to both backend and local storage
    try {
      setSaving(true);

      // Save to backend
      await api.put('/users/notification-preferences', newPreferences);

      // Also save to AsyncStorage as backup
      await AsyncStorage.setItem(
        'notification_preferences',
        JSON.stringify(newPreferences)
      );
    } catch (error: any) {
      console.error('Error saving notification preferences:', error);
      
      // Revert on error
      setPreferences(preferences);
      
      Alert.alert(
        'Error',
        error.response?.data?.detail || 'Failed to save notification preferences'
      );
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#007AFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Notifications</Text>
          <View style={styles.placeholder} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#007AFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Notifications</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.description}>
          Choose what notifications you'd like to receive
        </Text>

        <View style={styles.section}>
          <View style={styles.notificationItem}>
            <View style={styles.notificationInfo}>
              <View style={styles.iconContainer}>
                <Ionicons name="document-text-outline" size={20} color="#007AFF" />
              </View>
              <View style={styles.textContainer}>
                <Text style={styles.notificationTitle}>New Quotes</Text>
                <Text style={styles.notificationDescription}>
                  Get notified when you receive new quote requests
                </Text>
              </View>
            </View>
            <Switch
              value={preferences.new_quotes}
              onValueChange={() => handleToggle('new_quotes')}
              disabled={saving}
              trackColor={{ false: '#E5E5EA', true: '#34C759' }}
              thumbColor="#fff"
            />
          </View>

          <View style={styles.notificationItem}>
            <View style={styles.notificationInfo}>
              <View style={styles.iconContainer}>
                <Ionicons name="calendar-outline" size={20} color="#007AFF" />
              </View>
              <View style={styles.textContainer}>
                <Text style={styles.notificationTitle}>Scheduling Updates</Text>
                <Text style={styles.notificationDescription}>
                  Get notified about inspection scheduling changes
                </Text>
              </View>
            </View>
            <Switch
              value={preferences.scheduling_updates}
              onValueChange={() => handleToggle('scheduling_updates')}
              disabled={saving}
              trackColor={{ false: '#E5E5EA', true: '#34C759' }}
              thumbColor="#fff"
            />
          </View>

          <View style={styles.notificationItem}>
            <View style={styles.notificationInfo}>
              <View style={styles.iconContainer}>
                <Ionicons name="chatbubble-outline" size={20} color="#007AFF" />
              </View>
              <View style={styles.textContainer}>
                <Text style={styles.notificationTitle}>Chat Messages</Text>
                <Text style={styles.notificationDescription}>
                  Get notified when you receive new chat messages
                </Text>
              </View>
            </View>
            <Switch
              value={preferences.chat_messages}
              onValueChange={() => handleToggle('chat_messages')}
              disabled={saving}
              trackColor={{ false: '#E5E5EA', true: '#34C759' }}
              thumbColor="#fff"
            />
          </View>

          <View style={styles.notificationItem}>
            <View style={styles.notificationInfo}>
              <View style={styles.iconContainer}>
                <Ionicons name="cloud-upload-outline" size={20} color="#007AFF" />
              </View>
              <View style={styles.textContainer}>
                <Text style={styles.notificationTitle}>Report Uploads</Text>
                <Text style={styles.notificationDescription}>
                  Get notified when inspection reports are uploaded
                </Text>
              </View>
            </View>
            <Switch
              value={preferences.report_uploads}
              onValueChange={() => handleToggle('report_uploads')}
              disabled={saving}
              trackColor={{ false: '#E5E5EA', true: '#34C759' }}
              thumbColor="#fff"
            />
          </View>
        </View>

        {saving && (
          <View style={styles.savingIndicator}>
            <ActivityIndicator size="small" color="#007AFF" />
            <Text style={styles.savingText}>Saving...</Text>
          </View>
        )}
      </ScrollView>
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    padding: 16,
  },
  description: {
    fontSize: 14,
    color: '#8E8E93',
    marginBottom: 24,
    textAlign: 'center',
  },
  section: {
    backgroundColor: '#fff',
    borderRadius: 12,
    overflow: 'hidden',
  },
  notificationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F2F2F7',
  },
  notificationInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 16,
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F2F2F7',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  textContainer: {
    flex: 1,
  },
  notificationTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1C1C1E',
    marginBottom: 4,
  },
  notificationDescription: {
    fontSize: 13,
    color: '#8E8E93',
  },
  savingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
    padding: 12,
    backgroundColor: '#fff',
    borderRadius: 12,
  },
  savingText: {
    fontSize: 14,
    color: '#8E8E93',
    marginLeft: 8,
  },
});
