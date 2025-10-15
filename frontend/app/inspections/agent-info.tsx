import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import api from '../../services/api';

export default function AgentInfoScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const inspectionId = params.inspectionId as string;

  const [workingWithAgent, setWorkingWithAgent] = useState<boolean | null>(null);
  const [agentName, setAgentName] = useState('');
  const [agentEmail, setAgentEmail] = useState('');
  const [agentPhone, setAgentPhone] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    console.log('handleSubmit called, workingWithAgent:', workingWithAgent);
    
    // If not working with agent, just proceed
    if (workingWithAgent === false) {
      console.log('Not working with agent, navigating to tabs');
      router.replace('/(tabs)');
      return;
    }

    // Validate agent info if working with agent
    if (!agentName.trim() || !agentEmail.trim() || !agentPhone.trim()) {
      Alert.alert('Error', 'Please fill in all agent information fields');
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(agentEmail)) {
      Alert.alert('Error', 'Please enter a valid email address');
      return;
    }

    setLoading(true);
    try {
      console.log('Saving agent info for inspection:', inspectionId);
      await api.patch(`/inspections/${inspectionId}/agent-info`, {
        agent_name: agentName,
        agent_email: agentEmail,
        agent_phone: agentPhone,
      });

      console.log('Agent info saved successfully');
      Alert.alert(
        'Success',
        'Agent information saved successfully!',
        [{ text: 'OK', onPress: () => router.replace('/(tabs)') }]
      );
    } catch (error: any) {
      console.error('Error saving agent info:', error);
      console.error('Error response:', error.response?.data);
      Alert.alert(
        'Error',
        error.response?.data?.detail || 'Failed to save agent information'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.header}>
            <Ionicons name="people-outline" size={48} color="#007AFF" />
            <Text style={styles.title}>Agent Information</Text>
            <Text style={styles.subtitle}>
              Are you working with a real estate agent for this inspection?
            </Text>
          </View>

          {/* Yes/No Selection */}
          <View style={styles.selectionContainer}>
            <TouchableOpacity
              style={[
                styles.selectionButton,
                workingWithAgent === true && styles.selectionButtonActive,
              ]}
              onPress={() => setWorkingWithAgent(true)}
            >
              <Ionicons
                name={workingWithAgent === true ? 'checkmark-circle' : 'ellipse-outline'}
                size={24}
                color={workingWithAgent === true ? '#007AFF' : '#C7C7CC'}
              />
              <Text
                style={[
                  styles.selectionText,
                  workingWithAgent === true && styles.selectionTextActive,
                ]}
              >
                Yes, I'm working with an agent
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.selectionButton,
                workingWithAgent === false && styles.selectionButtonActive,
              ]}
              onPress={() => setWorkingWithAgent(false)}
            >
              <Ionicons
                name={workingWithAgent === false ? 'checkmark-circle' : 'ellipse-outline'}
                size={24}
                color={workingWithAgent === false ? '#007AFF' : '#C7C7CC'}
              />
              <Text
                style={[
                  styles.selectionText,
                  workingWithAgent === false && styles.selectionTextActive,
                ]}
              >
                No, I'm not working with an agent
              </Text>
            </TouchableOpacity>
          </View>

          {/* Agent Information Form - Only show if working with agent */}
          {workingWithAgent === true && (
            <View style={styles.formContainer}>
              <Text style={styles.formTitle}>Agent Contact Information</Text>

              <View style={styles.inputContainer}>
                <Text style={styles.label}>Agent Name *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="John Smith"
                  value={agentName}
                  onChangeText={setAgentName}
                  autoCapitalize="words"
                />
              </View>

              <View style={styles.inputContainer}>
                <Text style={styles.label}>Agent Email *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="agent@realty.com"
                  value={agentEmail}
                  onChangeText={setAgentEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </View>

              <View style={styles.inputContainer}>
                <Text style={styles.label}>Agent Phone *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="(210) 555-1234"
                  value={agentPhone}
                  onChangeText={setAgentPhone}
                  keyboardType="phone-pad"
                />
              </View>

              <View style={styles.infoBox}>
                <Ionicons name="information-circle" size={20} color="#007AFF" />
                <Text style={styles.infoText}>
                  Your agent will be able to view this inspection and participate in the group
                  chat when they log into the app.
                </Text>
              </View>
            </View>
          )}

          {/* Continue Button */}
          {workingWithAgent !== null && (
            <TouchableOpacity
              style={[styles.continueButton, loading && styles.continueButtonDisabled]}
              onPress={handleSubmit}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Text style={styles.continueButtonText}>Continue</Text>
                  <Ionicons name="arrow-forward" size={20} color="#fff" />
                </>
              )}
            </TouchableOpacity>
          )}
        </ScrollView>
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
  scrollContent: {
    padding: 20,
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1C1C1E',
    marginTop: 16,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#8E8E93',
    textAlign: 'center',
    lineHeight: 22,
  },
  selectionContainer: {
    marginBottom: 24,
  },
  selectionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  selectionButtonActive: {
    borderColor: '#007AFF',
    backgroundColor: '#F0F8FF',
  },
  selectionText: {
    fontSize: 16,
    color: '#8E8E93',
    marginLeft: 12,
    flex: 1,
  },
  selectionTextActive: {
    color: '#007AFF',
    fontWeight: '600',
  },
  formContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 24,
  },
  formTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1C1C1E',
    marginBottom: 20,
  },
  inputContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1C1C1E',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#F2F2F7',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#1C1C1E',
  },
  infoBox: {
    flexDirection: 'row',
    backgroundColor: '#F0F8FF',
    padding: 12,
    borderRadius: 8,
    marginTop: 4,
  },
  infoText: {
    fontSize: 13,
    color: '#007AFF',
    marginLeft: 8,
    flex: 1,
    lineHeight: 18,
  },
  continueButton: {
    backgroundColor: '#007AFF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    marginTop: 8,
  },
  continueButtonDisabled: {
    backgroundColor: '#C7C7CC',
  },
  continueButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    marginRight: 8,
  },
});
