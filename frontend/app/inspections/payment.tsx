import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { WebView } from 'react-native-webview';
import api from '../../services/api';
import Constants from 'expo-constants';

export default function PaymentScreen() {
  const router = useRouter();
  const { id, amount, address } = useLocalSearchParams();
  const [loading, setLoading] = useState(false);

  const appId = Constants.expoConfig?.extra?.squareAppId || process.env.EXPO_PUBLIC_SQUARE_APP_ID;
  const locationId = Constants.expoConfig?.extra?.squareLocationId || process.env.EXPO_PUBLIC_SQUARE_LOCATION_ID;

  // Build payment URL that will be served via HTTPS from backend
  const paymentUrl = `${process.env.EXPO_PUBLIC_BACKEND_URL}/payment?id=${id}&amount=${amount}&address=${encodeURIComponent(address as string)}&appId=${appId}&locationId=${locationId}`;

  const handleWebViewMessage = async (event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      
      if (data.type === 'payment_success') {
        setLoading(true);
        
        // Process payment with backend
        const idempotencyKey = `${id}-${Date.now()}`;
        
        const response = await api.post(`/inspections/${id}/create-payment`, {
          source_id: data.token,
          idempotency_key: idempotencyKey
        });
        
        setLoading(false);
        
        if (response.data.reports_unlocked) {
          Alert.alert(
            'Payment Successful!',
            'Your reports are now unlocked and ready to view!',
            [{ text: 'OK', onPress: () => router.back() }]
          );
        } else {
          Alert.alert(
            'Payment Successful!',
            'Thank you for your payment. Your reports will be released as soon as they are finalized.',
            [{ text: 'OK', onPress: () => router.back() }]
          );
        }
      } else if (data.type === 'payment_error' || data.type === 'init_error') {
        Alert.alert('Payment Error', data.error);
      }
    } catch (error: any) {
      setLoading(false);
      console.error('Payment processing error:', error);
      Alert.alert('Error', error.response?.data?.detail || 'Payment processing failed');
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#007AFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Payment</Text>
        <View style={{ width: 24 }} />
      </View>

      {loading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#34C759" />
          <Text style={styles.loadingText}>Processing payment...</Text>
        </View>
      )}

      <WebView
        source={{ uri: paymentUrl }}
        style={styles.webview}
        onMessage={handleWebViewMessage}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        startInLoadingState={true}
        renderLoading={() => (
          <View style={styles.webviewLoading}>
            <ActivityIndicator size="large" color="#007AFF" />
          </View>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
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
  webview: {
    flex: 1,
  },
  webviewLoading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 999,
  },
  loadingText: {
    color: '#FFF',
    fontSize: 16,
    marginTop: 16,
  },
  testModeContainer: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
  },
  testModeCard: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  testIcon: {
    alignSelf: 'center',
    marginBottom: 16,
  },
  testModeTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1C1C1E',
    textAlign: 'center',
    marginBottom: 12,
  },
  testModeMessage: {
    fontSize: 16,
    color: '#3C3C43',
    textAlign: 'center',
    marginBottom: 8,
    lineHeight: 22,
  },
  testModeNote: {
    fontSize: 14,
    color: '#8E8E93',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },
  paymentDetails: {
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  paymentLabel: {
    fontSize: 14,
    color: '#8E8E93',
    marginBottom: 4,
  },
  paymentValue: {
    fontSize: 16,
    color: '#1C1C1E',
    marginBottom: 12,
  },
  paymentAmount: {
    fontSize: 32,
    fontWeight: '700',
    color: '#34C759',
  },
  testPayButton: {
    backgroundColor: '#FF9500',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginBottom: 12,
  },
  testPayButtonText: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: '600',
  },
  testModeFooter: {
    fontSize: 12,
    color: '#8E8E93',
    textAlign: 'center',
    fontStyle: 'italic',
  },
});
