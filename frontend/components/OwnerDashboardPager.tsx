import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  FlatList,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Linking,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import CalendarWeekView from './CalendarWeekView';
import ManualInspectionEntry from './ManualInspectionEntry';
import api from '../services/api';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface DashboardStats {
  pending_quotes: number;
  active_inspections: number;
  pending_scheduling: number;
  unread_messages: number;
}

interface Agent {
  id: string;
  name: string;
  email: string;
  phone: string;
}

interface OwnerDashboardPagerProps {
  stats: DashboardStats | null;
  onNavigate: (route: string) => void;
}

export default function OwnerDashboardPager({ stats, onNavigate }: OwnerDashboardPagerProps) {
  const flatListRef = useRef<FlatList>(null);
  const [currentPage, setCurrentPage] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Agent[]>([]);
  const [searching, setSearching] = useState(false);

  const handleScroll = (event: any) => {
    const offsetX = event.nativeEvent.contentOffset.x;
    const page = Math.round(offsetX / SCREEN_WIDTH);
    setCurrentPage(page);
  };

  const goToPage = (page: number) => {
    flatListRef.current?.scrollToIndex({ index: page, animated: true });
    setCurrentPage(page);
  };

  const searchAgents = async (query: string) => {
    if (!query || query.trim().length === 0) {
      setSearchResults([]);
      return;
    }

    setSearching(true);
    try {
      const response = await api.get('/admin/search-agents', {
        params: { query: query.trim() }
      });
      
      setSearchResults(response.data.agents || []);
    } catch (error: any) {
      console.error('Agent search error:', error);
      Alert.alert('Error', 'Failed to search agents');
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  };

  const handleSearchChange = (text: string) => {
    setSearchQuery(text);
    
    // Debounce search
    const timeoutId = setTimeout(() => {
      searchAgents(text);
    }, 500);

    return () => clearTimeout(timeoutId);
  };

  const handleCall = (phone: string) => {
    const phoneNumber = phone.replace(/[^0-9]/g, '');
    Linking.openURL(`tel:${phoneNumber}`);
  };

  const handleEmail = (email: string) => {
    Linking.openURL(`mailto:${email}`);
  };

  // Dashboard Page
  const renderDashboard = () => (
    <View style={styles.page}>
      <Text style={styles.pageTitle}>Dashboard</Text>
      
      <View style={styles.statsGrid}>
        <TouchableOpacity 
          style={styles.statCard}
          onPress={() => onNavigate('/quotes/pending')}
        >
          <Ionicons name="document-text-outline" size={32} color="#007AFF" />
          <Text style={styles.statNumber}>{stats?.pending_quotes || 0}</Text>
          <Text style={styles.statLabel}>Pending Quotes</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={styles.statCard}
          onPress={() => onNavigate('/inspections/active')}
        >
          <Ionicons name="clipboard-outline" size={32} color="#34C759" />
          <Text style={styles.statNumber}>{stats?.active_inspections || 0}</Text>
          <Text style={styles.statLabel}>Active Inspections</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.statsGrid}>
        <TouchableOpacity 
          style={styles.statCard}
          onPress={() => onNavigate('/inspections/pending-scheduling-list')}
        >
          <Ionicons name="checkmark-circle-outline" size={32} color="#5856D6" />
          <Text style={styles.statNumber}>{stats?.pending_scheduling || 0}</Text>
          <Text style={styles.statLabel}>Pending Scheduling</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={styles.statCard}
          onPress={() => onNavigate('/(tabs)/chat')}
        >
          <Ionicons name="chatbubble-ellipses-outline" size={32} color="#FF9500" />
          <Text style={styles.statNumber}>{stats?.unread_messages || 0}</Text>
          <Text style={styles.statLabel}>Unread Messages</Text>
        </TouchableOpacity>
      </View>

      {/* Manual Inspection Entry */}
      <View style={styles.manualEntrySection}>
        <ManualInspectionEntry />
      </View>

      {/* Page Indicator */}
      <View style={styles.pageIndicatorContainer}>
        <Text style={styles.swipeHint}>← Swipe for Owner Utilities →</Text>
      </View>
    </View>
  );

  // Utilities Page
  const renderUtilities = () => (
    <View style={styles.page}>
      <Text style={styles.pageTitle}>Owner Utilities</Text>
      
      {/* Google Calendar */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>My Schedule</Text>
        <CalendarWeekView />
      </View>

      {/* Agent Search */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Search for Agent</Text>
        
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color="#999" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by agent name..."
            placeholderTextColor="#999"
            value={searchQuery}
            onChangeText={handleSearchChange}
            autoCapitalize="words"
            autoCorrect={false}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity 
              onPress={() => {
                setSearchQuery('');
                setSearchResults([]);
              }}
              style={styles.clearButton}
            >
              <Ionicons name="close-circle" size={20} color="#999" />
            </TouchableOpacity>
          )}
        </View>

        {searching && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator color="#007AFF" />
            <Text style={styles.loadingText}>Searching agents...</Text>
          </View>
        )}

        {!searching && searchQuery.length > 0 && searchResults.length === 0 && (
          <View style={styles.emptyContainer}>
            <Ionicons name="person-outline" size={48} color="#CCC" />
            <Text style={styles.emptyText}>No agents found</Text>
            <Text style={styles.emptySubtext}>Try a different search term</Text>
          </View>
        )}

        {!searching && searchResults.length > 0 && (
          <View style={styles.resultsContainer}>
            <Text style={styles.resultsCount}>
              {searchResults.length} agent{searchResults.length !== 1 ? 's' : ''} found
            </Text>
            {searchResults.map((agent) => (
              <View key={agent.id} style={styles.agentCard}>
                <View style={styles.agentHeader}>
                  <View style={styles.agentAvatar}>
                    <Text style={styles.agentInitial}>
                      {agent.name.charAt(0).toUpperCase()}
                    </Text>
                  </View>
                  <Text style={styles.agentName}>{agent.name}</Text>
                </View>
                
                <TouchableOpacity 
                  style={styles.contactRow}
                  onPress={() => handleCall(agent.phone)}
                >
                  <Ionicons name="call" size={20} color="#007AFF" />
                  <Text style={styles.contactText}>{agent.phone}</Text>
                  <Ionicons name="chevron-forward" size={16} color="#CCC" />
                </TouchableOpacity>

                <TouchableOpacity 
                  style={styles.contactRow}
                  onPress={() => handleEmail(agent.email)}
                >
                  <Ionicons name="mail" size={20} color="#007AFF" />
                  <Text style={styles.contactText}>{agent.email}</Text>
                  <Ionicons name="chevron-forward" size={16} color="#CCC" />
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}
      </View>

      {/* Page Indicator */}
      <View style={styles.pageIndicatorContainer}>
        <Text style={styles.swipeHint}>← Swipe back to Dashboard</Text>
      </View>
    </View>
  );

  const pages = [
    { key: '0', render: renderDashboard },
    { key: '1', render: renderUtilities },
  ];

  return (
    <View style={styles.container}>
      <FlatList
        ref={flatListRef}
        data={pages}
        renderItem={({ item }) => item.render()}
        keyExtractor={(item) => item.key}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        getItemLayout={(_, index) => ({
          length: SCREEN_WIDTH,
          offset: SCREEN_WIDTH * index,
          index,
        })}
      />

      {/* Page Dots Indicator */}
      <View style={styles.dotsContainer}>
        {pages.map((_, index) => (
          <TouchableOpacity
            key={index}
            onPress={() => goToPage(index)}
            style={[
              styles.dot,
              currentPage === index && styles.dotActive
            ]}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  page: {
    width: SCREEN_WIDTH,
    paddingHorizontal: 16,
  },
  pageTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1A1A1A',
    marginBottom: 20,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  statNumber: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#1A1A1A',
    marginTop: 12,
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
    textAlign: 'center',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 16,
  },
  manualEntrySection: {
    marginTop: 8,
    marginBottom: 16,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    paddingHorizontal: 16,
    height: 48,
    marginBottom: 16,
  },
  searchIcon: {
    marginRight: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#1A1A1A',
  },
  clearButton: {
    padding: 4,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  loadingText: {
    marginLeft: 12,
    fontSize: 16,
    color: '#666',
  },
  emptyContainer: {
    alignItems: 'center',
    padding: 40,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#999',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#CCC',
    marginTop: 4,
  },
  resultsContainer: {
    marginBottom: 16,
  },
  resultsCount: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
    fontWeight: '500',
  },
  agentCard: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  agentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  agentAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  agentInitial: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFF',
  },
  agentName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1A1A1A',
    flex: 1,
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F5F5F5',
  },
  contactText: {
    flex: 1,
    fontSize: 16,
    color: '#333',
    marginLeft: 12,
  },
  pageIndicatorContainer: {
    alignItems: 'center',
    marginTop: 16,
    marginBottom: 8,
  },
  swipeHint: {
    fontSize: 12,
    color: '#999',
    fontStyle: 'italic',
  },
  dotsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 16,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#CCC',
    marginHorizontal: 4,
  },
  dotActive: {
    backgroundColor: '#007AFF',
    width: 24,
  },
});
