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
  completed_inspections: number;
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
      // This would fetch role-specific dashboard data
      // For now, setting mock data structure
      setStats({
        pending_quotes: 0,
        active_inspections: 0,
        completed_inspections: 0,
        unread_messages: 0,
      });
    } catch (error) {
      console.error('Error fetching dashboard:', error);
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

        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Hello, {user?.name}!</Text>
            <Text style={styles.roleText}>{getRoleTitle()}</Text>
          </View>
          <View style={styles.roleBadge}>
            <Text style={styles.roleBadgeText}>{user?.role?.toUpperCase()}</Text>
          </View>
        </View>

        {/* Stats Cards */}
        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <Ionicons name="document-text-outline" size={32} color="#007AFF" />
            <Text style={styles.statNumber}>{stats?.pending_quotes || 0}</Text>
            <Text style={styles.statLabel}>Pending Quotes</Text>
          </View>
          <View style={styles.statCard}>
            <Ionicons name="clipboard-outline" size={32} color="#34C759" />
            <Text style={styles.statNumber}>{stats?.active_inspections || 0}</Text>
            <Text style={styles.statLabel}>Active Inspections</Text>
          </View>
        </View>

        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <Ionicons name="checkmark-circle-outline" size={32} color="#5856D6" />
            <Text style={styles.statNumber}>{stats?.completed_inspections || 0}</Text>
            <Text style={styles.statLabel}>Completed</Text>
          </View>
          <View style={styles.statCard}>
            <Ionicons name="chatbubble-ellipses-outline" size={32} color="#FF9500" />
            <Text style={styles.statNumber}>{stats?.unread_messages || 0}</Text>
            <Text style={styles.statLabel}>Unread Messages</Text>
          </View>
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

          {user?.role === 'owner' && (
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
    padding: 16,
  },
  logoContainer: {
    alignItems: 'center',
    paddingTop: 16,
    paddingBottom: 8,
  },
  dashboardLogo: {
    width: 60,
    height: 60,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 24,
  },
  greeting: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1C1C1E',
  },
  roleText: {
    fontSize: 16,
    color: '#8E8E93',
    marginTop: 4,
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
  statsGrid: {
    flexDirection: 'row',
    marginBottom: 16,
    gap: 16,
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
