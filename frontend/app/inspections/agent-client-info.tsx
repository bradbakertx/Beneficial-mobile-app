import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import api from '../../services/api';

export default function AgentClientInfoScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams(); // inspection_id
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    client_name: '',
    client_email: '',
    client_phone: '',
  });

  const handleSubmit = async () => {
    // Validation
    if (!formData.client_name.trim()) {
      Alert.alert('Error', 'Please enter client name');
      return;
    }
    if (!formData.client_email.trim()) {
      Alert.alert('Error', 'Please enter client email');
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.client_email.trim())) {
      Alert.alert('Error', 'Please enter a valid email address');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        client_name: formData.client_name.trim(),
        client_email: formData.client_email.trim().toLowerCase(),
        client_phone: formData.client_phone.trim() || null,
      };

      console.log('Submitting client info:', payload);
      await api.patch(`/inspections/${id}/client-info`, payload);

      // Navigate to dashboard
      router.replace('/(tabs)');
      
      // Show success message
      setTimeout(() => {
        if (Platform.OS === 'web') {
          window.alert('Client information saved! An invitation email has been sent to the client to login and sign the agreement.');
        } else {
          Alert.alert('Success', 'Client information saved! An invitation email has been sent to the client to login and sign the agreement.');
        }
      }, 500);
      
    } catch (error: any) {
      console.error('Error saving client info:', error);
      console.error('Error response:', error.response?.data);
      setLoading(false);
      
      if (Platform.OS === 'web') {
        window.alert(error.response?.data?.detail || 'Failed to save client information. Please try again.');
      } else {
        Alert.alert(
          'Error',
          error.response?.data?.detail || 'Failed to save client information. Please try again.'
        );
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
          <Text style={styles.headerTitle}>Enter Client Information</Text>
          <View style={styles.placeholder} />
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.infoBox}>
            <Ionicons name="information-circle" size={24} color="#007AFF" />
            <Text style={styles.infoText}>
              Please provide your client's information. They will receive an invitation email to login and sign the Pre-Inspection Agreement.
            </Text>
          </View>

          <View style={styles.section}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>
                Client Name <Text style={styles.required}>*</Text>
              </Text>
              <TextInput
                style={styles.input}
                value={formData.client_name}
                onChangeText={(text) => setFormData({ ...formData, client_name: text })}
                placeholder="Enter client's full name"
                placeholderTextColor="#C7C7CC"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>
                Client Email <Text style={styles.required}>*</Text>
              </Text>
              <TextInput
                style={styles.input}
                value={formData.client_email}
                onChangeText={(text) => setFormData({ ...formData, client_email: text })}
                placeholder="client@example.com"
                placeholderTextColor="#C7C7CC"
                keyboardType="email-address"
                autoCapitalize="none"
              />
              <Text style={styles.helperText}>
                An invitation to login/register will be sent to this email
              </Text>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Client Phone (Optional)</Text>
              <TextInput
                style={styles.input}
                value={formData.client_phone}
                onChangeText={(text) => setFormData({ ...formData, client_phone: text })}
                placeholder="(555) 123-4567"
                placeholderTextColor="#C7C7CC"
                keyboardType="phone-pad"
              />
            </View>
          </View>
        </ScrollView>

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
                <Text style={styles.submitButtonText}>Save Client Information</Text>
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
    zIndex: 10,
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
  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#E3F2FD',
    padding: 16,
    margin: 16,
    borderRadius: 12,
    gap: 12,
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    color: '#1976D2',
    lineHeight: 20,
  },
  section: {
    padding: 16,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1C1C1E',
    marginBottom: 8,
  },
  required: {
    color: '#FF3B30',
  },
  input: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    fontSize: 16,
    color: '#1C1C1E',
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  helperText: {
    fontSize: 12,
    color: '#8E8E93',
    marginTop: 4,
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
