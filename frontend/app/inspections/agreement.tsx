import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import SignaturePad, { SignaturePadRef } from '../../components/SignaturePad';
import api from '../../services/api';

const { height } = Dimensions.get('window');

export default function PreInspectionAgreementScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [agreementData, setAgreementData] = useState<any>(null);
  const [signature, setSignature] = useState<string | null>(null);
  const [showSignaturePad, setShowSignaturePad] = useState(false);
  const signatureRef = useRef<SignaturePadRef>(null);

  useEffect(() => {
    fetchAgreement();
  }, [id]);

  const fetchAgreement = async () => {
    try {
      const response = await api.get(`/inspections/${id}/agreement`);
      setAgreementData(response.data);
      
      // If already signed, show success message and go back
      if (response.data.already_signed) {
        if (Platform.OS === 'web') {
          window.alert('This agreement has already been signed.');
        }
        router.back();
      }
    } catch (error: any) {
      console.error('Error fetching agreement:', error);
      if (Platform.OS === 'web') {
        window.alert('Failed to load agreement');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSignature = (signature: string) => {
    setSignature(signature);
    setShowSignaturePad(false);
  };

  const handleClearSignature = () => {
    setSignature(null);
    if (signatureRef.current) {
      signatureRef.current.clearSignature();
    }
  };

  const handleSubmit = async () => {
    if (!signature) {
      if (Platform.OS === 'web') {
        window.alert('Please sign the agreement before submitting');
      }
      return;
    }

    setSubmitting(true);
    try {
      await api.post(`/inspections/${id}/sign-agreement`, {
        signature: signature
      });

      if (Platform.OS === 'web') {
        window.alert('Agreement signed successfully! PDFs have been emailed to you and the inspector.');
      }

      // Navigate to agent info screen
      router.replace(`/inspections/agent-info?inspectionId=${id}`);
    } catch (error: any) {
      console.error('Error signing agreement:', error);
      if (Platform.OS === 'web') {
        window.alert('Failed to sign agreement. Please try again.');
      }
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading Agreement...</Text>
      </View>
    );
  }

  if (!agreementData) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.errorText}>Failed to load agreement</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#007AFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Pre-Inspection Agreement</Text>
        <View style={styles.placeholder} />
      </View>

      {!showSignaturePad ? (
        <>
          {/* Agreement Text */}
          <ScrollView style={styles.agreementContainer} contentContainerStyle={styles.agreementContent}>
            <Text style={styles.agreementText}>{agreementData.agreement_text}</Text>
          </ScrollView>

          {/* Signature Section */}
          <View style={styles.signatureSection}>
            {signature ? (
              <View style={styles.signaturePreview}>
                <Text style={styles.signatureLabel}>Your Signature:</Text>
                <View style={styles.signatureImageContainer}>
                  <img 
                    src={signature} 
                    alt="Signature" 
                    style={{ width: '100%', height: 100, objectFit: 'contain' }}
                  />
                </View>
                <TouchableOpacity 
                  style={styles.clearButton}
                  onPress={handleClearSignature}
                >
                  <Ionicons name="close-circle" size={20} color="#FF3B30" />
                  <Text style={styles.clearButtonText}>Clear Signature</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity
                style={styles.signButton}
                onPress={() => setShowSignaturePad(true)}
              >
                <Ionicons name="create-outline" size={24} color="#FFF" />
                <Text style={styles.signButtonText}>Sign Agreement</Text>
              </TouchableOpacity>
            )}

            {signature && (
              <TouchableOpacity
                style={styles.submitButton}
                onPress={handleSubmit}
                disabled={submitting}
              >
                {submitting ? (
                  <ActivityIndicator color="#FFF" />
                ) : (
                  <>
                    <Ionicons name="checkmark-circle" size={24} color="#FFF" />
                    <Text style={styles.submitButtonText}>Submit Signed Agreement</Text>
                  </>
                )}
              </TouchableOpacity>
            )}
          </View>
        </>
      ) : (
        <>
          {/* Signature Pad */}
          <View style={styles.signaturePadContainer}>
            <Text style={styles.signaturePadTitle}>Sign Below:</Text>
            <View style={styles.signaturePadWrapper}>
              <SignaturePad
                ref={signatureRef}
                onEnd={handleSignature}
                onClear={() => console.log('Signature cleared')}
              />
            </View>
            <View style={styles.signaturePadButtons}>
              <TouchableOpacity
                style={[styles.padButton, styles.cancelPadButton]}
                onPress={() => {
                  setShowSignaturePad(false);
                  handleClearSignature();
                }}
              >
                <Text style={styles.cancelPadButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.padButton, styles.donePadButton]}
                onPress={() => {
                  console.log('Done button pressed');
                  if (signatureRef.current) {
                    console.log('Calling getSignature on ref');
                    signatureRef.current.getSignature();
                  } else {
                    console.log('signatureRef.current is null');
                  }
                }}
              >
                <Text style={styles.donePadButtonText}>Done</Text>
              </TouchableOpacity>
            </View>
          </View>
        </>
      )}
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
    backgroundColor: '#F2F2F7',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#8E8E93',
  },
  errorText: {
    fontSize: 16,
    color: '#FF3B30',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1C1C1E',
  },
  placeholder: {
    width: 40,
  },
  agreementContainer: {
    flex: 1,
  },
  agreementContent: {
    padding: 16,
  },
  agreementText: {
    fontSize: 12,
    lineHeight: 18,
    color: '#1C1C1E',
    fontFamily: Platform.OS === 'ios' ? 'Times New Roman' : 'serif',
  },
  signatureSection: {
    backgroundColor: '#FFF',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E5EA',
  },
  signaturePreview: {
    alignItems: 'center',
  },
  signatureLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1C1C1E',
    marginBottom: 8,
  },
  signatureImageContainer: {
    width: '100%',
    height: 100,
    backgroundColor: '#F9F9F9',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E5EA',
    overflow: 'hidden',
    marginBottom: 12,
  },
  clearButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: '#FFF5F5',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FFE5E5',
  },
  clearButtonText: {
    fontSize: 14,
    color: '#FF3B30',
    fontWeight: '600',
  },
  signButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    backgroundColor: '#007AFF',
    paddingVertical: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  signButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFF',
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    backgroundColor: '#34C759',
    paddingVertical: 16,
    borderRadius: 12,
  },
  submitButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFF',
  },
  signaturePadContainer: {
    flex: 1,
    padding: 16,
  },
  signaturePadTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1C1C1E',
    marginBottom: 16,
    textAlign: 'center',
  },
  signaturePadWrapper: {
    flex: 1,
    backgroundColor: '#FFF',
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: '#E5E5EA',
  },
  signaturePadButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
  },
  padButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  cancelPadButton: {
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  cancelPadButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#8E8E93',
  },
  donePadButton: {
    backgroundColor: '#007AFF',
  },
  donePadButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFF',
  },
});
