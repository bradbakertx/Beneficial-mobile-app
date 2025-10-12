import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../contexts/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import api from '../../services/api';

interface DashboardStats {
  pending_quotes: number;
  active_inspections: number;
  pending_scheduling: number;
  unread_messages: number;
}

export default function DashboardScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchDashboardData = async () => {
    try {
      // Fetch real statistics based on user role
      const quotesEndpoint = (user?.role === 'owner' || user?.role === 'admin') ? '/admin/quotes' : '/quotes';
      const pendingInspectionsEndpoint = (user?.role === 'owner' || user?.role === 'admin') ? '/admin/inspections/pending-scheduling' : '/inspections';
      const confirmedInspectionsEndpoint = (user?.role === 'owner' || user?.role === 'admin') ? '/admin/inspections/confirmed' : '/inspections';
      
      const [quotesRes, pendingInspectionsRes, confirmedInspectionsRes, unreadRes] = await Promise.all([
        api.get(quotesEndpoint),
        api.get(pendingInspectionsEndpoint).catch(() => ({ data: [] })),
        api.get(confirmedInspectionsEndpoint).catch(() => ({ data: [] })),
        api.get('/conversations/unread-count').catch(() => ({ data: { unread_count: 0 } }))
      ]);
      
      const quotes = quotesRes.data || [];
      const pendingInspections = pendingInspectionsRes.data || [];
      const confirmedInspections = confirmedInspectionsRes.data || [];
      const unreadCount = unreadRes.data?.unread_count || 0;
      
      console.log('Dashboard data:', { 
        quotes: quotes.length, 
        pendingInspections: pendingInspections.length,
        confirmedInspections: confirmedInspections.length,
        unreadMessages: unreadCount
      });
      
      // Calculate statistics
      const pendingQuotes = quotes.filter((q: any) => 
        q.status === 'pending' || q.status === 'pending_review'
      ).length;
      
      // Active inspections are confirmed or awaiting confirmation
      const activeInspections = confirmedInspections.length;
      
      // Pending scheduling are those waiting for owner to set date/time
      const pendingScheduling = pendingInspections.length;
      
      console.log('Stats calculated:', { pendingQuotes, activeInspections, pendingScheduling, unreadMessages: unreadCount });
      
      setStats({
        pending_quotes: pendingQuotes,
        active_inspections: activeInspections,
        pending_scheduling: pendingScheduling,
        unread_messages: unreadCount,
      });
    } catch (error) {
      console.error('Error fetching dashboard:', error);
      // Set to 0 on error
      setStats({
        pending_quotes: 0,
        active_inspections: 0,
        pending_scheduling: 0,
        unread_messages: 0,
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchDashboardData();
  };

  const getRoleTitle = () => {
    switch (user?.role) {
      case 'owner':
      case 'admin':
        return 'Owner Dashboard';
      case 'agent':
        return 'Agent Dashboard';
      default:
        return 'Customer Dashboard';
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <View style={styles.topBanner}>
          <Image 
            source={require('../../assets/images/beneficial-logo-icon.jpg')}
            style={styles.bannerLogo}
            resizeMode="contain"
          />
          <View style={styles.bannerTextContainer}>
            <Text style={styles.greeting}>Hello, {user?.name}!</Text>
            <Text style={styles.roleText}>{getRoleTitle()}</Text>
          </View>
          <View style={styles.roleBadge}>
            <Text style={styles.roleBadgeText}>{user?.role?.toUpperCase()}</Text>
          </View>
        </View>

        {/* Stats Cards */}
        <View style={styles.statsGrid}>
          <TouchableOpacity 
            style={styles.statCard}
            onPress={() => router.push('/quotes/pending')}
          >
            <Ionicons name="document-text-outline" size={32} color="#007AFF" />
            <Text style={styles.statNumber}>{stats?.pending_quotes || 0}</Text>
            <Text style={styles.statLabel}>Pending Quotes</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.statCard}
            onPress={() => router.push('/inspections/active')}
          >
            <Ionicons name="clipboard-outline" size={32} color="#34C759" />
            <Text style={styles.statNumber}>{stats?.active_inspections || 0}</Text>
            <Text style={styles.statLabel}>Active Inspections</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.statsGrid}>
          <TouchableOpacity 
            style={styles.statCard}
            onPress={() => router.push('/inspections/pending-scheduling')}
          >
            <Ionicons name="checkmark-circle-outline" size={32} color="#5856D6" />
            <Text style={styles.statNumber}>{stats?.pending_scheduling || 0}</Text>
            <Text style={styles.statLabel}>Pending Scheduling</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.statCard}
            onPress={() => router.push('/(tabs)/chat')}
          >
            <Ionicons name="chatbubble-ellipses-outline" size={32} color="#FF9500" />
            <Text style={styles.statNumber}>{stats?.unread_messages || 0}</Text>
            <Text style={styles.statLabel}>Unread Messages</Text>
          </TouchableOpacity>
        </View>

        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          
          {user?.role === 'customer' && (
            <>
              <TouchableOpacity style={styles.actionCard} onPress={() => router.push('/quotes/new')}>
                <View style={styles.actionIcon}>
                  <Ionicons name="add-circle" size={24} color="#007AFF" />
                </View>
                <View style={styles.actionContent}>
                  <Text style={styles.actionTitle}>Request Quote</Text>
                  <Text style={styles.actionDescription}>Get an inspection quote</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#C7C7CC" />
              </TouchableOpacity>

              <TouchableOpacity style={styles.actionCard} onPress={() => router.push('/inspections')}>
                <View style={styles.actionIcon}>
                  <Ionicons name="calendar" size={24} color="#34C759" />
                </View>
                <View style={styles.actionContent}>
                  <Text style={styles.actionTitle}>Schedule Inspection</Text>
                  <Text style={styles.actionDescription}>Book your inspection</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#C7C7CC" />
              </TouchableOpacity>
            </>
          )}

          {user?.role === 'agent' && (
            <>
              <TouchableOpacity style={styles.actionCard} onPress={() => router.push('/quotes')}>
                <View style={styles.actionIcon}>
                  <Ionicons name="document-text" size={24} color="#007AFF" />
                </View>
                <View style={styles.actionContent}>
                  <Text style={styles.actionTitle}>Manage Quotes</Text>
                  <Text style={styles.actionDescription}>View client quotes</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#C7C7CC" />
              </TouchableOpacity>

              <TouchableOpacity style={styles.actionCard} onPress={() => router.push('/inspections')}>
                <View style={styles.actionIcon}>
                  <Ionicons name="calendar" size={24} color="#34C759" />
                </View>
                <View style={styles.actionContent}>
                  <Text style={styles.actionTitle}>View Schedule</Text>
                  <Text style={styles.actionDescription}>Check availability</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#C7C7CC" />
              </TouchableOpacity>
            </>
          )}

          {(user?.role === 'owner' || user?.role === 'admin') && (
            <>
              <TouchableOpacity style={styles.actionCard} onPress={() => router.push('/quotes')}>
                <View style={styles.actionIcon}>
                  <Ionicons name="document-text" size={24} color="#007AFF" />
                </View>
                <View style={styles.actionContent}>
                  <Text style={styles.actionTitle}>All Quotes</Text>
                  <Text style={styles.actionDescription}>Manage all quotes</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#C7C7CC" />
              </TouchableOpacity>

              <TouchableOpacity style={styles.actionCard} onPress={() => router.push('/inspections')}>
                <View style={styles.actionIcon}>
                  <Ionicons name="calendar" size={24} color="#34C759" />
                </View>
                <View style={styles.actionContent}>
                  <Text style={styles.actionTitle}>All Inspections</Text>
                  <Text style={styles.actionDescription}>View and manage schedule</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#C7C7CC" />
              </TouchableOpacity>
            </>
          )}
        </View>
      </ScrollView>
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
  scrollContent: {
    paddingBottom: 16,
  },
  topBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  bannerLogo: {
    width: 48,
    height: 48,
    marginRight: 12,
  },
  bannerTextContainer: {
    flex: 1,
  },
  greeting: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1C1C1E',
    marginBottom: 2,
  },
  roleText: {
    fontSize: 14,
    color: '#8E8E93',
  },
  roleBadge: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  roleBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    marginBottom: 16,
    gap: 16,
    paddingHorizontal: 16,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  statNumber: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#1C1C1E',
    marginTop: 12,
  },
  statLabel: {
    fontSize: 12,
    color: '#8E8E93',
    marginTop: 4,
    textAlign: 'center',
  },
  section: {
    marginTop: 8,
    paddingHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1C1C1E',
    marginBottom: 16,
  },
  actionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  actionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#F2F2F7',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  actionContent: {
    flex: 1,
  },
  actionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1C1C1E',
    marginBottom: 2,
  },
  actionDescription: {
    fontSize: 14,
    color: '#8E8E93',
  },
});
