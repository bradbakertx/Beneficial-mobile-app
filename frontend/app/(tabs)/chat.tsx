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
import { Swipeable } from 'react-native-gesture-handler';
import { formatChatTime } from '../../utils/timeUtils';
import { useAuth } from '../../contexts/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import api from '../../services/api';

interface Conversation {
  id: string;
  conversation_type: string;
  inspection_id?: string;
  property_address?: string;
  customer_name: string;
  customer_phone?: string;
  inspector_name?: string;
  last_message?: string;
  last_message_time?: string;
  unread_count: number;
  inspection_date?: string;
  inspection_time?: string;
  finalized?: boolean;
}

export default function ChatTabScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchConversations();
  }, []);

  const fetchConversations = async () => {
    try {
      const response = await api.get('/conversations');
      console.log('Conversations:', response.data);
      
      // Filter out finalized inspection chats (red cards)
      const filteredConversations = response.data.filter((conv: Conversation) => {
        if (conv.conversation_type === 'inspection' && conv.finalized) {
          console.log(`Filtering out finalized inspection chat: ${conv.inspection_id}`);
          return false;
        }
        return true;
      });
      
      setConversations(filteredConversations);
    } catch (error: any) {
      console.error('Error fetching conversations:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchConversations();
  };

  const handleConversationPress = (conv: Conversation) => {
    router.push(`/chat?inspectionId=${conv.inspection_id || ''}&recipientName=${conv.conversation_type === 'owner_chat' ? 'Owner' : 'Inspector'}&propertyAddress=${encodeURIComponent(conv.property_address || '')}&customerName=${encodeURIComponent(conv.customer_name || '')}`);
  };

  const handleDeleteConversation = (conv: Conversation) => {
    Alert.alert(
      'Delete Chat',
      `Delete chat with ${conv.customer_name}? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.delete(`/conversations/${conv.id}`);
              // Remove from local state
              setConversations(conversations.filter(c => c.id !== conv.id));
            } catch (error) {
              console.error('Error deleting conversation:', error);
              Alert.alert('Error', 'Failed to delete chat');
            }
          }
        }
      ]
    );
  };

  const renderRightActions = (conv: Conversation) => {
    return (
      <TouchableOpacity
        style={styles.deleteButton}
        onPress={() => handleDeleteConversation(conv)}
      >
        <Ionicons name="trash" size={24} color="#FFF" />
        <Text style={styles.deleteButtonText}>Delete</Text>
      </TouchableOpacity>
    );
  };

  const renderConversationCard = ({ item }: { item: Conversation }) => {
    const isOwnerChat = item.conversation_type === 'owner_chat';
    const cardStyle = isOwnerChat ? styles.ownerChatCard : styles.inspectorChatCard;
    
    return (
      <TouchableOpacity
        style={[styles.conversationCard, cardStyle]}
        onPress={() => handleConversationPress(item)}
      >
        <View style={styles.cardHeader}>
          <View style={styles.cardTitleRow}>
            <Ionicons 
              name={isOwnerChat ? "person" : "construct"} 
              size={20} 
              color={isOwnerChat ? "#34C759" : "#FF3B30"} 
            />
            <Text style={styles.cardTitle}>
              {isOwnerChat ? 'Owner Chat' : 'Inspector Chat'}
            </Text>
          </View>
          {item.unread_count > 0 && (
            <View style={styles.unreadBadge}>
              <Text style={styles.unreadText}>{item.unread_count}</Text>
            </View>
          )}
        </View>

        <View style={styles.cardContent}>
          <View style={styles.infoRow}>
            <Ionicons name="person-outline" size={16} color="#666" />
            <Text style={styles.infoText}>{item.customer_name}</Text>
          </View>
          
          {item.customer_phone && (
            <View style={styles.infoRow}>
              <Ionicons name="call-outline" size={16} color="#666" />
              <Text style={styles.infoText}>{item.customer_phone}</Text>
            </View>
          )}

          {item.property_address && (
            <View style={styles.infoRow}>
              <Ionicons name="home-outline" size={16} color="#666" />
              <Text style={styles.infoText} numberOfLines={1}>{item.property_address}</Text>
            </View>
          )}

          {item.inspection_date && item.inspection_time && (
            <View style={styles.infoRow}>
              <Ionicons name="calendar-outline" size={16} color="#666" />
              <Text style={styles.infoText}>
                {item.inspection_date} at {item.inspection_time}
              </Text>
            </View>
          )}

          {item.last_message && (
            <View style={styles.lastMessageContainer}>
              <Text style={styles.lastMessage} numberOfLines={2}>
                {item.last_message}
              </Text>
              {item.last_message_time && (
                <Text style={styles.lastMessageTime}>
                  {formatChatTime(item.last_message_time)}
                </Text>
              )}
            </View>
          )}
        </View>

        <View style={styles.cardFooter}>
          <Text style={styles.tapToOpen}>Tap to open conversation</Text>
          <Ionicons name="chevron-forward" size={20} color="#C7C7CC" />
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <FlatList
        data={conversations}
        renderItem={renderConversationCard}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="chatbubbles-outline" size={64} color="#C7C7CC" />
            <Text style={styles.emptyText}>No conversations yet</Text>
            <Text style={styles.emptySubtext}>Click "Chat with Inspector" on Dashboard to start</Text>
          </View>
        }
      />
      
      {/* Floating Action Button - New Chat with Owner */}
      <TouchableOpacity 
        style={styles.fab}
        onPress={() => router.push('/chat?recipientName=Owner')}
      >
        <Ionicons name="add" size={28} color="#fff" />
      </TouchableOpacity>
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
  },
  conversationCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  ownerChatCard: {
    borderLeftColor: '#34C759',
    backgroundColor: '#F0FDF4',
  },
  inspectorChatCard: {
    borderLeftColor: '#FF3B30',
    backgroundColor: '#FFF5F5',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  cardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1C1C1E',
  },
  unreadBadge: {
    backgroundColor: '#FF3B30',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    minWidth: 24,
    alignItems: 'center',
  },
  unreadText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  cardContent: {
    gap: 8,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  infoText: {
    fontSize: 14,
    color: '#3A3A3C',
    flex: 1,
  },
  lastMessageContainer: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#E5E5EA',
  },
  lastMessage: {
    fontSize: 14,
    color: '#666',
    fontStyle: 'italic',
  },
  lastMessageTime: {
    fontSize: 12,
    color: '#8E8E93',
    marginTop: 4,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E5E5EA',
  },
  tapToOpen: {
    fontSize: 13,
    color: '#007AFF',
    fontWeight: '600',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
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
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 20,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#34C759',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
});
