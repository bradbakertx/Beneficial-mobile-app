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
  const [paymentUrl, setPaymentUrl] = useState('');
  const [testMode, setTestMode] = useState(false);

  const appId = Constants.expoConfig?.extra?.squareAppId || process.env.EXPO_PUBLIC_SQUARE_APP_ID;
  const locationId = Constants.expoConfig?.extra?.squareLocationId || process.env.EXPO_PUBLIC_SQUARE_LOCATION_ID;

  useEffect(() => {
    // Check if we're in a development/preview environment
    const isDev = __DEV__ || Platform.OS === 'web';
    setTestMode(isDev);
    
    if (!isDev) {
      generatePaymentForm();
    }
  }, []);

  const handleTestPayment = async () => {
    Alert.alert(
      'Test Payment Mode',
      `Process test payment of $${amount}?\n\nNote: This is a test mode for preview environments. Real payments require HTTPS-served pages.`,
      [
        {
          text: 'Cancel',
          style: 'cancel'
        },
        {
          text: 'Confirm Test Payment',
          onPress: async () => {
            setLoading(true);
            try {
              // Simulate payment processing
              await new Promise(resolve => setTimeout(resolve, 2000));
              
              // Mark inspection as paid without actual Square payment
              await api.post(`/inspections/${id}/mark-as-paid`, {
                payment_method: 'Test Payment (Preview Mode)'
              });
              
              setLoading(false);
              Alert.alert(
                'Test Payment Successful!',
                'Inspection marked as paid in test mode.',
                [{ text: 'OK', onPress: () => router.back() }]
              );
            } catch (error: any) {
              setLoading(false);
              console.error('Test payment error:', error);
              Alert.alert('Error', error.response?.data?.detail || 'Test payment failed');
            }
          }
        }
      ]
    );
  };

  const generatePaymentForm = () => {
    // Create HTML content with Square Web Payments SDK
    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <script type="text/javascript" src="https://web.squarecdn.com/v1/square.js"></script>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif;
      padding: 20px;
      background-color: #f5f5f5;
    }
    .container {
      background: white;
      border-radius: 12px;
      padding: 24px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }
    h2 {
      margin: 0 0 8px 0;
      color: #1C1C1E;
    }
    .address {
      font-size: 14px;
      color: #8E8E93;
      margin-bottom: 16px;
    }
    .amount {
      font-size: 32px;
      font-weight: bold;
      color: #34C759;
      margin-bottom: 24px;
    }
    #card-container {
      margin-bottom: 20px;
    }
    #pay-button {
      background: #34C759;
      color: white;
      border: none;
      padding: 16px;
      border-radius: 12px;
      width: 100%;
      font-size: 16px;
      font-weight: 600;
      cursor: pointer;
    }
    #pay-button:disabled {
      background: #C7C7CC;
      cursor: not-allowed;
    }
    #pay-button:hover:not(:disabled) {
      background: #2FB84E;
    }
    .error {
      color: #FF3B30;
      margin-top: 12px;
      font-size: 14px;
    }
    .loading {
      text-align: center;
      color: #8E8E93;
      margin: 20px 0;
    }
  </style>
</head>
<body>
  <div class="container">
    <h2>Inspection Payment</h2>
    <div class="address">${address}</div>
    <div class="amount">$${amount}</div>
    
    <div id="card-container"></div>
    <button id="pay-button" disabled>Processing...</button>
    <div id="error-message" class="error"></div>
  </div>

  <script>
    async function initializeSquare() {
      try {
        const payments = Square.payments('${appId}', '${locationId}');
        const card = await payments.card();
        await card.attach('#card-container');
        
        const payButton = document.getElementById('pay-button');
        payButton.disabled = false;
        payButton.textContent = 'Pay $${amount}';
        
        payButton.onclick = async (event) => {
          event.preventDefault();
          payButton.disabled = true;
          payButton.textContent = 'Processing...';
          
          try {
            const result = await card.tokenize();
            
            if (result.status === 'OK') {
              // Send token to React Native app
              window.ReactNativeWebView.postMessage(JSON.stringify({
                type: 'payment_success',
                token: result.token,
                amount: ${amount}
              }));
            } else {
              throw new Error(result.errors[0].message);
            }
          } catch (e) {
            document.getElementById('error-message').textContent = e.message;
            payButton.disabled = false;
            payButton.textContent = 'Pay $${amount}';
            
            window.ReactNativeWebView.postMessage(JSON.stringify({
              type: 'payment_error',
              error: e.message
            }));
          }
        };
      } catch (e) {
        document.getElementById('error-message').textContent = 'Failed to load payment form: ' + e.message;
        window.ReactNativeWebView.postMessage(JSON.stringify({
          type: 'init_error',
          error: e.message
        }));
      }
    }
    
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', initializeSquare);
    } else {
      initializeSquare();
    }
  </script>
</body>
</html>
    `;

    setPaymentUrl('data:text/html;charset=utf-8,' + encodeURIComponent(htmlContent));
  };

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

      {testMode ? (
        <View style={styles.testModeContainer}>
          <View style={styles.testModeCard}>
            <Ionicons name="warning-outline" size={48} color="#FF9500" style={styles.testIcon} />
            <Text style={styles.testModeTitle}>Test Payment Mode</Text>
            <Text style={styles.testModeMessage}>
              Square payments require HTTPS-served pages and cannot be loaded in preview environments.
            </Text>
            <Text style={styles.testModeNote}>
              Use the button below to simulate a payment for testing purposes.
            </Text>
            
            <View style={styles.paymentDetails}>
              <Text style={styles.paymentLabel}>Property Address</Text>
              <Text style={styles.paymentValue}>{address}</Text>
              
              <Text style={styles.paymentLabel}>Amount Due</Text>
              <Text style={styles.paymentAmount}>${amount}</Text>
            </View>
            
            <TouchableOpacity
              style={styles.testPayButton}
              onPress={handleTestPayment}
              disabled={loading}
            >
              <Text style={styles.testPayButtonText}>
                Simulate Payment (Test)
              </Text>
            </TouchableOpacity>
            
            <Text style={styles.testModeFooter}>
              Note: This will mark the inspection as paid without processing actual payment.
            </Text>
          </View>
        </View>
      ) : (
        paymentUrl && !loading && (
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
        )
      )}
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
});
