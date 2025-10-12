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
  street_address: string;
  city: string;
  state: string;
  zip_code: string;
  inspection_type: string;
  square_footage: number;
  year_built: number;
  foundation_type: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  total_units?: number;
  total_buildings?: number;
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
      await api.put(`/admin/quotes/${id}`, {
        quote_amount: parseFloat(quoteAmount),
        status: 'quoted'
      });
      Alert.alert('Success', 'Quote submitted successfully', [
        { text: 'OK', onPress: () => router.back() }
      ]);
    } catch (error: any) {
      console.error('Error submitting quote:', error);
      Alert.alert('Error', error.response?.data?.detail || 'Failed to submit quote');
    } finally {
      setSubmitting(false);
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
                <Text style={styles.value}>{quote.street_address}</Text>
                <Text style={styles.value}>{quote.city}, {quote.state} {quote.zip_code}</Text>
              </View>
              <View style={styles.divider} />
              <View style={styles.infoRow}>
                <Text style={styles.label}>Inspection Type</Text>
                <Text style={styles.value}>{quote.inspection_type}</Text>
              </View>
              <View style={styles.divider} />
              <View style={styles.infoRow}>
                <Text style={styles.label}>Square Footage</Text>
                <Text style={styles.value}>{quote.square_footage.toLocaleString()} sq ft</Text>
              </View>
              <View style={styles.divider} />
              <View style={styles.infoRow}>
                <Text style={styles.label}>Year Built</Text>
                <Text style={styles.value}>{quote.year_built}</Text>
              </View>
              <View style={styles.divider} />
              <View style={styles.infoRow}>
                <Text style={styles.label}>Foundation Type</Text>
                <Text style={styles.value}>{quote.foundation_type}</Text>
              </View>
              {quote.total_units && (
                <>
                  <View style={styles.divider} />
                  <View style={styles.infoRow}>
                    <Text style={styles.label}>Total Units</Text>
                    <Text style={styles.value}>{quote.total_units}</Text>
                  </View>
                </>
              )}
              {quote.total_buildings && (
                <>
                  <View style={styles.divider} />
                  <View style={styles.infoRow}>
                    <Text style={styles.label}>Total Buildings</Text>
                    <Text style={styles.value}>{quote.total_buildings}</Text>
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
              <View style={styles.divider} />
              <View style={styles.infoRow}>
                <Text style={styles.label}>Phone</Text>
                <Text style={styles.value}>{quote.customer_phone}</Text>
              </View>
            </View>
          </View>

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
            style={[styles.submitButton, submitting && styles.submitButtonDisabled]}
            onPress={handleSubmitQuote}
            disabled={submitting}
          >
            {submitting ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.submitButtonText}>Submit Quote</Text>
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
  scrollContent: {
    padding: 16,
    paddingBottom: 100,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1C1C1E',
    marginBottom: 12,
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
    backgroundColor: '#E5E5EA',
    marginVertical: 8,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E5EA',
    borderRadius: 8,
    paddingHorizontal: 16,
    height: 56,
  },
  dollarSign: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1C1C1E',
    marginRight: 8,
  },
  input: {
    flex: 1,
    fontSize: 18,
    color: '#1C1C1E',
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E5EA',
  },
  submitButton: {
    backgroundColor: '#007AFF',
    borderRadius: 12,
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
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
