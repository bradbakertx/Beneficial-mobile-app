import React, { useState } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import api from '../services/api';

interface ConsentModalProps {
  visible: boolean;
  onAccept: () => void;
}

export default function ConsentModal({ visible, onAccept }: ConsentModalProps) {
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [privacyAccepted, setPrivacyAccepted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const router = useRouter();

  const handleAccept = async () => {
    if (!termsAccepted || !privacyAccepted) {
      Alert.alert('Required', 'You must accept both Terms of Service and Privacy Policy to continue');
      return;
    }

    setSubmitting(true);
    try {
      await api.post('/users/accept-terms');
      Alert.alert('Success', 'Terms accepted. Welcome to Beneficial Inspections!');
      onAccept();
    } catch (error: any) {
      console.error('Error accepting terms:', error);
      Alert.alert('Error', 'Failed to save consent. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={false}
      onRequestClose={() => {}}
    >
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Welcome!</Text>
          <Text style={styles.headerSubtitle}>Please review and accept our policies</Text>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.section}>
            <Ionicons name="shield-checkmark" size={48} color="#007AFF" style={styles.icon} />
            <Text style={styles.title}>Before You Begin</Text>
            <Text style={styles.description}>
              Your account was created by an administrator. To comply with privacy regulations, we need your consent to our Terms of Service and Privacy Policy.
            </Text>
          </View>

          <View style={styles.consentContainer}>
            <TouchableOpacity 
              style={styles.checkboxRow}
              onPress={() => setTermsAccepted(!termsAccepted)}
              activeOpacity={0.7}
            >
              <View style={[styles.checkbox, termsAccepted && styles.checkboxChecked]}>
                {termsAccepted && <Ionicons name="checkmark" size={18} color="#fff" />}
              </View>
              <View style={styles.checkboxTextContainer}>
                <Text style={styles.checkboxText}>
                  I accept the{' '}
                  <Text 
                    style={styles.linkInline}
                    onPress={() => router.push('/profile/terms-of-service')}
                  >
                    Terms of Service
                  </Text>
                  {' '}*
                </Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.checkboxRow}
              onPress={() => setPrivacyAccepted(!privacyAccepted)}
              activeOpacity={0.7}
            >
              <View style={[styles.checkbox, privacyAccepted && styles.checkboxChecked]}>
                {privacyAccepted && <Ionicons name="checkmark" size={18} color="#fff" />}
              </View>
              <View style={styles.checkboxTextContainer}>
                <Text style={styles.checkboxText}>
                  I accept the{' '}
                  <Text 
                    style={styles.linkInline}
                    onPress={() => router.push('/profile/privacy-policy')}
                  >
                    Privacy Policy
                  </Text>
                  {' '}*
                </Text>
              </View>
            </TouchableOpacity>

            <Text style={styles.requiredNote}>* Required to use the app</Text>
          </View>

          <View style={styles.infoBox}>
            <Ionicons name="information-circle" size={20} color="#007AFF" />
            <Text style={styles.infoText}>
              You can review these policies anytime from the Profile menu.
            </Text>
          </View>
        </ScrollView>

        <View style={styles.footer}>
          <TouchableOpacity 
            style={[styles.acceptButton, (!termsAccepted || !privacyAccepted || submitting) && styles.acceptButtonDisabled]}
            onPress={handleAccept}
            disabled={!termsAccepted || !privacyAccepted || submitting}
            activeOpacity={0.8}
          >
            <Text style={styles.acceptButtonText}>
              {submitting ? 'Saving...' : 'Accept & Continue'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 20,
    backgroundColor: '#F9F9F9',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 8,
  },
  headerSubtitle: {
    fontSize: 15,
    color: '#666',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  section: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  icon: {
    marginBottom: 16,
  },
  title: {
    fontSize: 22,
    fontWeight: '600',
    color: '#000',
    marginBottom: 12,
    textAlign: 'center',
  },
  description: {
    fontSize: 15,
    color: '#666',
    textAlign: 'center',
    lineHeight: 22,
  },
  consentContainer: {
    backgroundColor: '#F9F9F9',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#C7C7CC',
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    marginTop: 2,
  },
  checkboxChecked: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  checkboxTextContainer: {
    flex: 1,
  },
  checkboxText: {
    fontSize: 15,
    color: '#333',
    lineHeight: 22,
  },
  linkInline: {
    color: '#007AFF',
    textDecorationLine: 'underline',
    fontWeight: '500',
  },
  requiredNote: {
    fontSize: 12,
    color: '#8E8E93',
    fontStyle: 'italic',
    marginTop: 4,
  },
  infoBox: {
    flexDirection: 'row',
    backgroundColor: '#E3F2FD',
    borderRadius: 8,
    padding: 12,
    marginBottom: 20,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: '#1976D2',
    marginLeft: 8,
    lineHeight: 18,
  },
  footer: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#E5E5EA',
    backgroundColor: '#fff',
  },
  acceptButton: {
    backgroundColor: '#007AFF',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  acceptButtonDisabled: {
    backgroundColor: '#C7C7CC',
  },
  acceptButtonText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '600',
  },
});
