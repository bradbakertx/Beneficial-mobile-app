import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  TextInput,
  KeyboardAvoidingView,
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
  customer_name: string;
  customer_email: string;
  num_units?: number;
  num_buildings?: number;
  additional_notes?: string;
  status: string;
  quote_amount?: number;
  created_at: string;
}

export default function QuoteDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const [quote, setQuote] = useState<Quote | null>(null);
  const [loading, setLoading] = useState(true);
  const [quoteAmount, setQuoteAmount] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchQuoteDetail = async () => {
    try {
      const response = await api.get('/admin/quotes');
      const allQuotes = response.data;
      const foundQuote = allQuotes.find((q: Quote) => q.id === id);
      if (foundQuote) {
        setQuote(foundQuote);
        if (foundQuote.quote_amount) {
          setQuoteAmount(foundQuote.quote_amount.toString());
        }
      } else {
        Alert.alert('Error', 'Quote not found');
        router.back();
      }
    } catch (error: any) {
      console.error('Error fetching quote:', error);
      Alert.alert('Error', 'Failed to fetch quote details');
      router.back();
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQuoteDetail();
  }, [id]);

  const handleSubmitQuote = async () => {
    if (!quoteAmount || isNaN(parseFloat(quoteAmount))) {
      Alert.alert('Error', 'Please enter a valid quote amount');
      return;
    }

    setSubmitting(true);
    
    try {
      const response = await api.patch(`/admin/quotes/${id}/price`, null, {
        params: {
          quote_amount: parseFloat(quoteAmount)
        }
      });
      
      console.log('Quote submitted successfully:', response.data);
      
      // Navigate immediately and show success message after
      router.replace('/(tabs)');
      
      setTimeout(() => {
        if (Platform.OS === 'web') {
          window.alert('Quote submitted successfully! The customer will be notified.');
        } else {
          Alert.alert('Success', 'Quote submitted successfully! The customer will be notified.');
        }
      }, 500);
      
    } catch (error: any) {
      console.error('Error submitting quote:', error);
      setSubmitting(false);
      
      if (Platform.OS === 'web') {
        window.alert(`Failed to submit quote. ${error.response?.data?.detail || error.message}\n\nPlease try again.`);
      } else {
        Alert.alert(
          'Error', 
          `Failed to submit quote. ${error.response?.data?.detail || error.message}\n\nPlease try again.`
        );
      }
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
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#007AFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Quote Details</Text>
          <View style={styles.placeholder} />
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent}>
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

          {/* Customer Information */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Customer Information</Text>
            <View style={styles.card}>
              <View style={styles.infoRow}>
                <Text style={styles.label}>Name</Text>
                <Text style={styles.value}>{quote.customer_name}</Text>
              </View>
              <View style={styles.divider} />
              <View style={styles.infoRow}>
                <Text style={styles.label}>Email</Text>
                <Text style={styles.value}>{quote.customer_email}</Text>
              </View>
            </View>
          </View>

          {/* Additional Notes */}
          {quote.additional_notes && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Additional Notes</Text>
              <View style={styles.card}>
                <Text style={styles.value}>{quote.additional_notes}</Text>
              </View>
            </View>
          )}

          {/* Quote Amount */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Quote Amount</Text>
            <View style={styles.card}>
              <View style={styles.inputContainer}>
                <Text style={styles.dollarSign}>$</Text>
                <TextInput
                  style={styles.input}
                  value={quoteAmount}
                  onChangeText={setQuoteAmount}
                  keyboardType="decimal-pad"
                  placeholder="Enter quote amount"
                  placeholderTextColor="#C7C7CC"
                />
              </View>
            </View>
          </View>

          {/* Request Date */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Request Information</Text>
            <View style={styles.card}>
              <View style={styles.infoRow}>
                <Text style={styles.label}>Request Date</Text>
                <Text style={styles.value}>
                  {format(new Date(quote.created_at), 'MMMM dd, yyyy h:mm a')}
                </Text>
              </View>
            </View>
          </View>
        </ScrollView>

        {/* Submit Button */}
        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.submitButton, submitting && styles.buttonDisabled]}
            onPress={handleSubmitQuote}
            disabled={submitting}
          >
            {submitting ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Ionicons name="checkmark-circle" size={20} color="#fff" />
                <Text style={styles.submitButtonText}>Submit Quote to Customer</Text>
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
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
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E5EA',
    borderRadius: 8,
    paddingHorizontal: 12,
    backgroundColor: '#F2F2F7',
  },
  dollarSign: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1C1C1E',
    marginRight: 4,
  },
  input: {
    flex: 1,
    fontSize: 20,
    fontWeight: '600',
    color: '#1C1C1E',
    paddingVertical: 12,
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
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
