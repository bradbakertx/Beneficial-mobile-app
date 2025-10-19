import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import api from '../../services/api';
import { format } from 'date-fns';

interface Quote {
  id: string;
  property_address: string;
  property_city?: string;
  property_zip?: string;
  property_type: string;
  square_feet?: number;
  year_built?: number;
  foundation_type?: string;
  num_units?: number;
  num_buildings?: number;
  additional_notes?: string;
  status: string;
  quote_amount?: number;
  created_at: string;
}

export default function CustomerQuoteDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const [quote, setQuote] = useState<Quote | null>(null);
  const [loading, setLoading] = useState(true);
  const [declining, setDeclining] = useState(false);
  const [showDeclineModal, setShowDeclineModal] = useState(false);

  const fetchQuoteDetail = async () => {
    try {
      const response = await api.get('/quotes');
      const allQuotes = response.data;
      const foundQuote = allQuotes.find((q: Quote) => q.id === id);
      if (foundQuote) {
        setQuote(foundQuote);
      } else {
        if (Platform.OS === 'web') {
          window.alert('Quote not found');
        }
        router.back();
      }
    } catch (error: any) {
      console.error('Error fetching quote:', error);
      if (Platform.OS === 'web') {
        window.alert('Failed to fetch quote details');
      }
      router.back();
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQuoteDetail();
  }, [id]);

  const handleAcceptQuote = () => {
    // Navigate to scheduling page
    router.push(`/quotes/schedule?quoteId=${id}`);
  };

  const handleDeclineQuote = async () => {
    setDeclining(true);
    try {
      // Delete the quote (backend sends push notification to owner)
      await api.delete(`/quotes/${id}`);
      
      // Show thank you message
      if (Platform.OS === 'web') {
        window.alert('Thank You for Your Time.');
      }
      
      // Navigate back to quotes list
      router.replace('/quotes/customer-list');
    } catch (error: any) {
      console.error('Error declining quote:', error);
      if (Platform.OS === 'web') {
        window.alert('Failed to decline quote. Please try again.');
      }
      setDeclining(false);
      setShowDeclineModal(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  if (!quote) {
    return null;
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#007AFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Quote Details</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Quote Amount Banner */}
        {quote.quote_amount && (
          <View style={styles.quoteAmountBanner}>
            <Text style={styles.quoteLabel}>Quote Amount</Text>
            <Text style={styles.quoteAmount}>${quote.quote_amount.toFixed(2)}</Text>
          </View>
        )}

        {/* Property Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Property Information</Text>
          <View style={styles.card}>
            <View style={styles.infoRow}>
              <Text style={styles.label}>Address</Text>
              <Text style={styles.value}>{quote.property_address}</Text>
              {quote.property_city && quote.property_zip && (
                <Text style={styles.value}>{quote.property_city}, TX {quote.property_zip}</Text>
              )}
            </View>
            <View style={styles.divider} />
            <View style={styles.infoRow}>
              <Text style={styles.label}>Property Type</Text>
              <Text style={styles.value}>{quote.property_type}</Text>
            </View>
            {quote.square_feet && (
              <>
                <View style={styles.divider} />
                <View style={styles.infoRow}>
                  <Text style={styles.label}>Square Feet</Text>
                  <Text style={styles.value}>{quote.square_feet.toLocaleString()} sq ft</Text>
                </View>
              </>
            )}
            {quote.year_built && (
              <>
                <View style={styles.divider} />
                <View style={styles.infoRow}>
                  <Text style={styles.label}>Year Built</Text>
                  <Text style={styles.value}>{quote.year_built}</Text>
                </View>
              </>
            )}
            {quote.foundation_type && (
              <>
                <View style={styles.divider} />
                <View style={styles.infoRow}>
                  <Text style={styles.label}>Foundation Type</Text>
                  <Text style={styles.value}>{quote.foundation_type}</Text>
                </View>
              </>
            )}
            {quote.num_units && (
              <>
                <View style={styles.divider} />
                <View style={styles.infoRow}>
                  <Text style={styles.label}>Number of Units</Text>
                  <Text style={styles.value}>{quote.num_units}</Text>
                </View>
              </>
            )}
            {quote.num_buildings && (
              <>
                <View style={styles.divider} />
                <View style={styles.infoRow}>
                  <Text style={styles.label}>Number of Buildings</Text>
                  <Text style={styles.value}>{quote.num_buildings}</Text>
                </View>
              </>
            )}
          </View>
        </View>

        {/* Additional Notes */}
        {quote.additional_notes && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Your Notes</Text>
            <View style={styles.card}>
              <Text style={styles.value}>{quote.additional_notes}</Text>
            </View>
          </View>
        )}

        {/* Request Date */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Request Date</Text>
          <View style={styles.card}>
            <Text style={styles.value}>
              {format(new Date(quote.created_at), 'MMMM dd, yyyy h:mm a')}
            </Text>
          </View>
        </View>
      </ScrollView>

      {/* Action Buttons */}
      {quote.status === 'quoted' && quote.quote_amount && (
        <View style={styles.footer}>
          <TouchableOpacity
            style={styles.declineButton}
            onPress={() => setShowDeclineModal(true)}
            disabled={declining}
          >
            <Ionicons name="close-circle" size={20} color="#FF3B30" />
            <Text style={styles.declineButtonText}>Decline Quote</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.acceptButton}
            onPress={handleAcceptQuote}
            disabled={declining}
          >
            <Ionicons name="checkmark-circle" size={20} color="#fff" />
            <Text style={styles.acceptButtonText}>Accept & Schedule</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Decline Confirmation Modal */}
      {showDeclineModal && (
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Decline Quote</Text>
            <Text style={styles.modalMessage}>
              Are you sure you want to decline this quote? This action cannot be undone.
            </Text>
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.modalButtonCancel}
                onPress={() => setShowDeclineModal(false)}
                disabled={declining}
              >
                <Text style={styles.modalButtonCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalButtonConfirm}
                onPress={handleDeclineQuote}
                disabled={declining}
              >
                {declining ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.modalButtonConfirmText}>Decline</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
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
  scrollContent: {
    paddingBottom: 16,
  },
  quoteAmountBanner: {
    backgroundColor: '#34C759',
    padding: 24,
    alignItems: 'center',
    marginBottom: 16,
  },
  quoteLabel: {
    fontSize: 14,
    color: '#fff',
    opacity: 0.9,
    marginBottom: 4,
  },
  quoteAmount: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#fff',
  },
  section: {
    marginTop: 16,
    paddingHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1C1C1E',
    marginBottom: 8,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
  },
  infoRow: {
    paddingVertical: 8,
  },
  label: {
    fontSize: 14,
    color: '#8E8E93',
    marginBottom: 4,
  },
  value: {
    fontSize: 16,
    color: '#1C1C1E',
  },
  divider: {
    height: 1,
    backgroundColor: '#F2F2F7',
    marginVertical: 8,
  },
  footer: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#E5E5EA',
    gap: 12,
  },
  declineButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: '#FF3B30',
    borderRadius: 12,
    paddingVertical: 16,
    gap: 8,
  },
  declineButtonText: {
    color: '#FF3B30',
    fontSize: 16,
    fontWeight: '600',
  },
  acceptButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#34C759',
    borderRadius: 12,
    paddingVertical: 16,
    gap: 8,
  },
  acceptButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    width: '80%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1C1C1E',
    marginBottom: 12,
    textAlign: 'center',
  },
  modalMessage: {
    fontSize: 16,
    color: '#8E8E93',
    marginBottom: 24,
    textAlign: 'center',
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  modalButtonCancel: {
    flex: 1,
    padding: 14,
    borderRadius: 12,
    backgroundColor: '#F2F2F7',
    alignItems: 'center',
  },
  modalButtonCancelText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1C1C1E',
  },
  modalButtonConfirm: {
    flex: 1,
    padding: 14,
    borderRadius: 12,
    backgroundColor: '#FF3B30',
    alignItems: 'center',
  },
  modalButtonConfirmText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
});
