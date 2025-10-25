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
import { useAuth } from '../../contexts/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import api from '../../services/api';
import { format } from 'date-fns';

interface Quote {
  id: string;
  property_address: string;
  property_type: string;
  square_footage: number;
  status: string;
  estimated_price: number;
  created_at: string;
}

export default function QuotesScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchQuotes = async () => {
    try {
      const endpoint = (user?.role === 'owner' || user?.role === 'admin') ? '/admin/quotes' : '/quotes';
      console.log('Fetching quotes from:', endpoint, 'User role:', user?.role);
      const response = await api.get(endpoint);
      console.log('Quotes response:', response.data);
      setQuotes(response.data);
    } catch (error: any) {
      console.error('Error fetching quotes:', error);
      console.error('Error response:', error.response?.data);
      console.error('Error status:', error.response?.status);
      if (error.response?.status !== 401) {
        Alert.alert('Error', `Failed to fetch quotes: ${error.response?.data?.detail || error.message}`);
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchQuotes();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchQuotes();
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'pending':
        return '#FF9500';
      case 'approved':
      case 'accepted':
        return '#34C759';
      case 'rejected':
        return '#FF3B30';
      case 'agent_review':
        return '#007AFF';
      case 'quoted':
        return '#5856D6';
      default:
        return '#8E8E93';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status.toLowerCase()) {
      case 'agent_review':
        return 'Review';
      case 'quoted':
        return 'Quoted';
      default:
        return status.charAt(0).toUpperCase() + status.slice(1);
    }
  };

  const handleApprove = async (quoteId: string) => {
    try {
      await api.patch(`/quotes/${quoteId}/approve`);
      Alert.alert('Success', 'Quote approved successfully');
      fetchQuotes();
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.detail || 'Failed to approve quote');
    }
  };

  const handleDecline = async (quoteId: string) => {
    Alert.alert(
      'Decline Quote',
      'Are you sure you want to decline this quote?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Decline',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.patch(`/quotes/${quoteId}/decline`);
              Alert.alert('Success', 'Quote declined');
              fetchQuotes();
            } catch (error: any) {
              Alert.alert('Error', error.response?.data?.detail || 'Failed to decline quote');
            }
          }
        }
      ]
    );
  };

  const renderQuoteItem = ({ item }: { item: Quote }) => (
    <TouchableOpacity style={styles.quoteCard}>
      <View style={styles.quoteHeader}>
        <View style={styles.quoteInfo}>
          <Text style={styles.quoteAddress} numberOfLines={1}>
            {item.property_address}
          </Text>
          <Text style={styles.quoteType}>{item.property_type}</Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
          <Text style={styles.statusText}>{item.status}</Text>
        </View>
      </View>
      
      <View style={styles.quoteDetails}>
        <View style={styles.detailRow}>
          <Ionicons name="resize-outline" size={16} color="#8E8E93" />
          <Text style={styles.detailText}>{item.square_footage} sq ft</Text>
        </View>
        {item.estimated_price && (
          <View style={styles.detailRow}>
            <Ionicons name="cash-outline" size={16} color="#8E8E93" />
            <Text style={styles.detailText}>${item.estimated_price}</Text>
          </View>
        )}
        <View style={styles.detailRow}>
          <Ionicons name="calendar-outline" size={16} color="#8E8E93" />
          <Text style={styles.detailText}>
            {format(new Date(item.created_at), 'MMM dd, yyyy')}
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
      {user?.role === 'customer' && (
        <TouchableOpacity
          style={styles.fab}
          onPress={() => router.push('/quotes/new')}
        >
          <Ionicons name="add" size={24} color="#fff" />
        </TouchableOpacity>
      )}
      
      <FlatList
        data={quotes}
        renderItem={renderQuoteItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="document-text-outline" size={64} color="#C7C7CC" />
            <Text style={styles.emptyText}>No quotes yet</Text>
            {user?.role === 'customer' && (
              <Text style={styles.emptySubtext}>Tap + to request a quote</Text>
            )}
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
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  quoteInfo: {
    flex: 1,
    marginRight: 12,
  },
  quoteAddress: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1C1C1E',
    marginBottom: 4,
  },
  quoteType: {
    fontSize: 14,
    color: '#8E8E93',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#fff',
    textTransform: 'capitalize',
  },
  quoteDetails: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  detailText: {
    fontSize: 14,
    color: '#8E8E93',
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    zIndex: 999,
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
