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
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../contexts/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import api from '../../services/api';
import CalendarWeekView from '../../components/CalendarWeekView';
import ManualInspectionEntry from '../../components/ManualInspectionEntry';
import InspectorCalendarView from '../../components/InspectorCalendarView';
import CustomerDashboardWrapper from '../../components/CustomerDashboardWrapper';

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
        api.get(quotesEndpoint).catch(() => ({ data: [] })),  // Handle 403 for agents
        api.get(pendingInspectionsEndpoint).catch(() => ({ data: [] })),
        api.get(confirmedInspectionsEndpoint).catch(() => ({ data: [] })),
        api.get('/conversations/unread-count').catch(() => ({ data: { unread_count: 0 } }))
      ]);
      
      const quotes = quotesRes.data || [];
      const pendingInspections = pendingInspectionsRes.data || [];
      const confirmedInspections = confirmedInspectionsRes.data || [];
      const unreadCount = unreadRes.data?.unread_count || 0;
      
      console.log('Dashboard data:', { 
        userRole: user?.role,
        userEmail: user?.email,
        quotes: quotes.length, 
        pendingInspections: pendingInspections.length,
        confirmedInspections: confirmedInspections.length,
        unreadMessages: unreadCount
      });
      
      // For customers and agents, log the inspection statuses
      if (user?.role === 'customer' || user?.role === 'agent') {
        console.log('Customer/Agent inspection statuses:', {
          pending: pendingInspections.map((i: any) => ({ id: i.id.substring(0, 8), status: i.status })),
          confirmed: confirmedInspections.map((i: any) => ({ id: i.id.substring(0, 8), status: i.status }))
        });
        
        // Check for unsigned agreement and auto-navigate
        const scheduledInspections = pendingInspections.filter((i: any) => i.status === 'scheduled');
        const unsignedInspection = scheduledInspections.find((i: any) => !i.agreement_signed);
        
        if (unsignedInspection) {
          console.log('Found unsigned agreement on dashboard, navigating to agreement screen:', unsignedInspection.id);
          // Navigate to agreement screen automatically
          router.push(`/inspections/agreement?id=${unsignedInspection.id}`);
          return; // Exit early, don't set stats
        }
      }
      
      // Calculate statistics
      // For customers: show "quoted" quotes (waiting for customer response)
      // For owners: show "pending" quotes (waiting for owner to set price)
      // For agents: show "quoted" quotes (same as customers)
      const pendingQuotes = (user?.role === 'customer' || user?.role === 'agent')
        ? quotes.filter((q: any) => q.status === 'quoted').length
        : quotes.filter((q: any) => q.status === 'pending' || q.status === 'pending_review').length;
      
      // Active inspections - only those with confirmed date/time (status: "scheduled")
      const activeInspections = (user?.role === 'customer' || user?.role === 'agent')
        ? pendingInspections.filter((i: any) => i.status === 'scheduled').length  // For customers and agents, use one array to avoid duplicates
        : confirmedInspections.filter((i: any) => i.status === 'scheduled').length;
      
      // Pending scheduling:
      // - For owners: inspections waiting for owner to offer times (status: pending_scheduling)
      // - For customers: inspections waiting for customer to select a time (status: awaiting_customer_selection)
      // - For agents: inspections waiting for customer to select a time (status: awaiting_customer_selection)
      let pendingScheduling = 0;
      if (user?.role === 'customer' || user?.role === 'agent') {
        // For customers and agents, pendingInspections and confirmedInspections are the same array (both from /inspections)
        // So we only need to use one of them to avoid duplicates
        const awaitingSelection = pendingInspections.filter((i: any) => i.status === 'awaiting_customer_selection');
        pendingScheduling = awaitingSelection.length;
        console.log('Customer/Agent pending scheduling calculation:', {
          totalInspections: pendingInspections.length,
          awaitingSelection: awaitingSelection.map((i: any) => ({ id: i.id, status: i.status })),
          count: pendingScheduling
        });
      } else {
        pendingScheduling = pendingInspections.length;
      }
      
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
      case 'inspector':
        return 'Inspector Dashboard';
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

  // For customers on MOBILE only: wrap dashboard in swipeable landing screen
  // Web gets normal dashboard (CustomerDashboardWrapper.web.tsx just renders children)
  if (user?.role === 'customer' && Platform.OS !== 'web') {
    return (
      <CustomerDashboardWrapper>
        <DashboardContent 
          user={user}
          stats={stats}
          refreshing={refreshing}
          onRefresh={onRefresh}
          getRoleTitle={getRoleTitle}
          router={router}
        />
      </CustomerDashboardWrapper>
    );
  }

  // For owners, agents, and web users: normal dashboard
  return (
    <DashboardContent 
      user={user}
      stats={stats}
      refreshing={refreshing}
      onRefresh={onRefresh}
      getRoleTitle={getRoleTitle}
      router={router}
    />
  );
}

// Extract dashboard content as separate component
function DashboardContent({ user, stats, refreshing, onRefresh, getRoleTitle, router }: any) {
  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* White Banner with Logo, Greeting, and Badge */}
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
          <View style={[
            styles.roleBadge,
            user?.role === 'customer' && styles.customerBadge,
            user?.role === 'agent' && styles.agentBadge,
            user?.role === 'inspector' && styles.inspectorBadge,
            user?.role === 'owner' && styles.ownerBadge
          ]}>
            <Text style={styles.roleBadgeText}>
              {user?.role === 'customer' ? 'Customer' : 
               user?.role === 'agent' ? 'Agent' : 
               user?.role === 'inspector' ? 'Inspector' :
               'Owner'}
            </Text>
          </View>
        </View>

        {/* Stats Cards */}
        <View style={styles.statsGrid}>
          <TouchableOpacity 
            style={styles.statCard}
            onPress={() => {
              // Route customers to their quotes, owners to pending quotes
              const route = user?.role === 'customer' ? '/quotes/customer-list' : '/quotes/pending';
              router.push(route);
            }}
          >
            <Ionicons name="document-text-outline" size={32} color="#007AFF" />
            <Text style={styles.statNumber}>{stats?.pending_quotes || 0}</Text>
            <Text style={styles.statLabel}>Pending Quotes</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.statCard}
            onPress={() => {
              // Route customers and agents to their inspections tab, owners to active inspections screen
              const route = (user?.role === 'customer' || user?.role === 'agent')
                ? '/(tabs)/inspections'  // Customer/Agent inspections tab shows scheduled inspections with chat buttons
                : '/inspections/active';  // Owner's active inspections screen with edit buttons
              router.push(route);
            }}
          >
            <Ionicons name="clipboard-outline" size={32} color="#34C759" />
            <Text style={styles.statNumber}>{stats?.active_inspections || 0}</Text>
            <Text style={styles.statLabel}>Active Inspections</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.statsGrid}>
          <TouchableOpacity 
            style={styles.statCard}
            onPress={() => {
              // Route customers and owners to different screens
              const route = user?.role === 'customer' 
                ? '/inspections/customer-pending-scheduling' 
                : '/inspections/pending-scheduling-list';
              router.push(route);
            }}
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

        {/* Google Calendar Week View - Owner Only */}
        {(user?.role === 'owner' || user?.role === 'admin') && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>My Schedule</Text>
            <CalendarWeekView />
            <ManualInspectionEntry />
          </View>
        )}

        {/* Inspector Schedule - Inspector Only */}
        {user?.role === 'inspector' && (
          <>
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>My Inspection Schedule</Text>
              <InspectorCalendarView userId={user?.id} />
            </View>

            {/* Quick Actions for Inspector */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Quick Actions</Text>
              <TouchableOpacity style={styles.actionCard} onPress={() => router.push('/chat?recipientName=Owner')}>
                <View style={styles.actionIcon}>
                  <Ionicons name="chatbubble-ellipses" size={24} color="#34C759" />
                </View>
                <View style={styles.actionContent}>
                  <Text style={styles.actionTitle}>Chat with Brad Baker</Text>
                  <Text style={styles.actionDescription}>Ask any general questions</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#C7C7CC" />
              </TouchableOpacity>
            </View>
          </>
        )}

        {/* Quick Actions for Customer & Agent */}
        {(user?.role === 'customer' || user?.role === 'agent') && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Quick Actions</Text>
            
            {user?.role === 'customer' && (
              <>
                <TouchableOpacity style={styles.actionCard} onPress={() => router.push('/quotes/new')}>
                  <View style={styles.actionIcon}>
                    <Ionicons name="document-text" size={24} color="#007AFF" />
                  </View>
                  <View style={styles.actionContent}>
                    <Text style={styles.actionTitle}>Request a Quote</Text>
                    <Text style={styles.actionDescription}>Get an inspection quote for your property</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color="#C7C7CC" />
                </TouchableOpacity>

                <TouchableOpacity style={styles.actionCard} onPress={() => router.push('/chat?recipientName=Owner')}>
                  <View style={styles.actionIcon}>
                    <Ionicons name="chatbubble-ellipses" size={24} color="#34C759" />
                  </View>
                  <View style={styles.actionContent}>
                    <Text style={styles.actionTitle}>Chat with Brad Baker</Text>
                    <Text style={styles.actionDescription}>Ask any general questions</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color="#C7C7CC" />
                </TouchableOpacity>
              </>
            )}

            {user?.role === 'agent' && (
              <>
                <TouchableOpacity style={styles.actionCard} onPress={() => router.push('/quotes/new')}>
                  <View style={styles.actionIcon}>
                    <Ionicons name="document-text" size={24} color="#007AFF" />
                  </View>
                  <View style={styles.actionContent}>
                    <Text style={styles.actionTitle}>Request a Quote</Text>
                    <Text style={styles.actionDescription}>Get an inspection quote for your client</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color="#C7C7CC" />
                </TouchableOpacity>

                <TouchableOpacity style={styles.actionCard} onPress={() => router.push('/chat?recipientName=Owner')}>
                  <View style={styles.actionIcon}>
                    <Ionicons name="chatbubble-ellipses" size={24} color="#FF9500" />
                  </View>
                  <View style={styles.actionContent}>
                    <Text style={styles.actionTitle}>Chat with Brad Baker</Text>
                    <Text style={styles.actionDescription}>Ask any general questions</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color="#C7C7CC" />
                </TouchableOpacity>
              </>
            )}
          </View>
        )}
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
  blueBanner: {
    backgroundColor: '#007AFF',
    paddingVertical: 16,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  blueBannerText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
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
  customerBadge: {
    backgroundColor: '#007AFF', // Blue for customer
  },
  agentBadge: {
    backgroundColor: '#34C759', // Green for agent
  },
  inspectorBadge: {
    backgroundColor: '#5856D6', // Purple for inspector
  },
  ownerBadge: {
    backgroundColor: '#FF9500', // Orange for owner
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
