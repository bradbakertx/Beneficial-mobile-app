import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
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
  status: string;
  quote_amount?: number;
  created_at: string;
}

export default function PendingQuotesScreen() {
  const router = useRouter();
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchPendingQuotes = async () => {
    try {
      const response = await api.get('/admin/quotes');
      const allQuotes = response.data;
      const pending = allQuotes.filter((q: Quote) => 
        q.status === 'pending' || q.status === 'pending_review'
      );
      setQuotes(pending);
    } catch (error: any) {
      console.error('Error fetching pending quotes:', error);
      Alert.alert('Error', 'Failed to fetch pending quotes');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchPendingQuotes();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchPendingQuotes();
  };

  const renderQuoteItem = ({ item }: { item: Quote }) => (
    <TouchableOpacity 
      style={styles.quoteCard}
      onPress={() => router.push(`/quotes/detail?id=${item.id}`)}
    >
      <View style={styles.quoteHeader}>
        <View style={styles.quoteInfo}>
          <Text style={styles.quoteAddress} numberOfLines={1}>
            {item.street_address}
          </Text>
          <Text style={styles.quoteCity}>{item.city}, {item.state} {item.zip_code}</Text>
        </View>
        <Ionicons name="chevron-forward" size={24} color="#C7C7CC" />
      </View>
      
      <View style={styles.quoteDetails}>
        <View style={styles.detailRow}>
          <Ionicons name="person-outline" size={16} color="#8E8E93" />
          <Text style={styles.detailText}>{item.customer_name}</Text>
        </View>
        <View style={styles.detailRow}>
          <Ionicons name="home-outline" size={16} color="#8E8E93" />
          <Text style={styles.detailText}>{item.inspection_type}</Text>
        </View>
        <View style={styles.detailRow}>
          <Ionicons name="resize-outline" size={16} color="#8E8E93" />
          <Text style={styles.detailText}>{item.square_footage} sq ft • Built {item.year_built}</Text>
        </View>
        <View style={styles.detailRow}>
          <Ionicons name="calendar-outline" size={16} color="#8E8E93" />
          <Text style={styles.detailText}>
            {format(new Date(item.created_at), 'MMM dd, yyyy h:mm a')}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#007AFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Pending Quotes</Text>
        <View style={styles.placeholder} />
      </View>

      <FlatList
        data={quotes}
        renderItem={renderQuoteItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="document-text-outline" size={64} color="#C7C7CC" />
            <Text style={styles.emptyText}>No pending quotes</Text>
            <Text style={styles.emptySubtext}>All quotes have been reviewed</Text>
          </View>
        }
      />
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
  listContent: {
    padding: 16,
    flexGrow: 1,
  },
  quoteCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  quoteHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  quoteInfo: {
    flex: 1,
    marginRight: 12,
  },
  quoteAddress: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1C1C1E',
    marginBottom: 4,
  },
  quoteCity: {
    fontSize: 14,
    color: '#8E8E93',
  },
  quoteDetails: {
    gap: 8,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  detailText: {
    fontSize: 14,
    color: '#8E8E93',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 80,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#8E8E93',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#C7C7CC',
    marginTop: 8,
  },
});
