import React, { useState } from 'react';
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
import api from '../../services/api';
import * as SQIPCore from 'react-native-square-in-app-payments';

export default function PaymentScreen() {
  const router = useRouter();
  const { id, amount, address } = useLocalSearchParams();
  const [loading, setLoading] = useState(false);

  const handlePayNow = async () => {
    try {
      setLoading(true);

      // Start Square card entry flow
      await SQIPCore.startCardEntryFlow({
        collectPostalCode: true,
        onCardNonceRequestSuccess: async (cardDetails) => {
          try {
            console.log('Card nonce received:', cardDetails.nonce);
            
            // Send payment to backend
            const idempotencyKey = `${id}-${Date.now()}`;
            
            const response = await api.post(`/inspections/${id}/create-payment`, {
              source_id: cardDetails.nonce,
              idempotency_key: idempotencyKey
            });
            
            setLoading(false);
            
            // Complete the card entry flow
            await SQIPCore.completeCardEntry(() => {
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
            });
          } catch (error: any) {
            setLoading(false);
            console.error('Payment processing error:', error);
            
            // Show error in Square UI
            await SQIPCore.showCardNonceProcessingError(
              error.response?.data?.detail || 'Payment processing failed'
            );
          }
        },
        onCardEntryCancel: () => {
          setLoading(false);
          console.log('User cancelled card entry');
        },
      });
    } catch (error: any) {
      setLoading(false);
      console.error('Card entry error:', error);
      Alert.alert(
        'Native Payment Not Available',
        'The native Square payment SDK requires a native build of the app. This feature will be available after deploying to the App Store/Play Store.\n\nFor now, please use the "Mark as Paid" option or contact support.',
        [{ text: 'OK', onPress: () => router.back() }]
      );
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

      <View style={styles.content}>
        <View style={styles.paymentCard}>
          <Ionicons name="card-outline" size={64} color="#34C759" style={styles.icon} />
          
          <Text style={styles.title}>Inspection Payment</Text>
          <Text style={styles.address}>{address}</Text>
          
          <View style={styles.amountContainer}>
            <Text style={styles.amountLabel}>Amount Due</Text>
            <Text style={styles.amount}>${amount}</Text>
          </View>

          <TouchableOpacity
            style={[styles.payButton, loading && styles.payButtonDisabled]}
            onPress={handlePayNow}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <>
                <Ionicons name="card" size={20} color="#FFF" style={styles.buttonIcon} />
                <Text style={styles.payButtonText}>Pay with Card</Text>
              </>
            )}
          </TouchableOpacity>

          <Text style={styles.secureText}>
            <Ionicons name="lock-closed" size={12} color="#8E8E93" /> Secure payment powered by Square
          </Text>
        </View>

        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>Native Payment SDK</Text>
          <Text style={styles.infoText}>
            • Native Square card entry for iOS & Android{'\n'}
            • Requires native app build (not available in preview){'\n'}
            • Will work after deploying to App Store/Play Store{'\n'}
            • For testing now, use "Mark as Paid" option
          </Text>
        </View>
      </View>
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
  content: {
    flex: 1,
    padding: 20,
  },
  paymentCard: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    marginBottom: 20,
    alignItems: 'center',
  },
  icon: {
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1C1C1E',
    marginBottom: 8,
    textAlign: 'center',
  },
  address: {
    fontSize: 14,
    color: '#8E8E93',
    marginBottom: 24,
    textAlign: 'center',
  },
  amountContainer: {
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    width: '100%',
    alignItems: 'center',
  },
  amountLabel: {
    fontSize: 14,
    color: '#8E8E93',
    marginBottom: 4,
  },
  amount: {
    fontSize: 36,
    fontWeight: '700',
    color: '#34C759',
  },
  payButton: {
    backgroundColor: '#34C759',
    borderRadius: 12,
    padding: 16,
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  payButtonDisabled: {
    backgroundColor: '#C7C7CC',
  },
  buttonIcon: {
    marginRight: 8,
  },
  payButtonText: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: '600',
  },
  secureText: {
    fontSize: 12,
    color: '#8E8E93',
    textAlign: 'center',
  },
  infoCard: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1C1C1E',
    marginBottom: 8,
  },
  infoText: {
    fontSize: 14,
    color: '#3C3C43',
    lineHeight: 20,
  },
});
