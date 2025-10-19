import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
  Alert,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import api from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import { formatFullTimestamp } from '../../utils/timeUtils';

export default function ChatScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { user } = useAuth();
  const inspectionId = params.inspectionId as string | undefined;
  const customerId = params.customerId as string | undefined;
  const recipientName = params.recipientName as string || 'Inspector';
  const propertyAddress = params.propertyAddress as string || '';
  const customerName = params.customerName as string || '';
  const scrollViewRef = useRef<ScrollView>(null);

  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [messages, setMessages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [ownerProfile, setOwnerProfile] = useState<any>(null);
  const [otherPartyProfile, setOtherPartyProfile] = useState<any>(null);
  const [inspectionDetails, setInspectionDetails] = useState<any>(null);
  const [customerProfile, setCustomerProfile] = useState<any>(null);
  const [agentProfile, setAgentProfile] = useState<any>(null);
  const [inspectorProfile, setInspectorProfile] = useState<any>(null);

  useEffect(() => {
    fetchMessages();
    // Fetch profiles for owner chats
    if (!inspectionId) {
      if (user?.role === 'owner') {
        // Owner viewing chat - fetch the other party's profile (customer/agent)
        if (customerId) {
          fetchOtherPartyProfile(customerId);
        }
      } else {
        // Customer/Agent viewing chat - fetch owner's profile
        fetchOwnerProfile();
      }
    } else {
      // Inspection chat - fetch all participants
      fetchInspectionParticipants();
    }
    // Poll for new messages every 5 seconds
    const interval = setInterval(fetchMessages, 5000);
    return () => clearInterval(interval);
  }, [inspectionId, customerId, user?.role]);

  const fetchInspectionParticipants = async () => {
    try {
      // Fetch inspection details
      const inspectionResponse = await api.get(`/inspections/${inspectionId}`);
      const inspection = inspectionResponse.data;
      setInspectionDetails(inspection);

      // Fetch customer profile
      if (inspection.customer_id) {
        const customerRes = await api.get(`/users/${inspection.customer_id}`);
        setCustomerProfile(customerRes.data);
      }

      // Fetch agent profile if exists
      if (inspection.agent_email) {
        try {
          // Try to find agent by email
          const agentRes = await api.get(`/users/by-email/${encodeURIComponent(inspection.agent_email)}`);
          setAgentProfile(agentRes.data);
        } catch (error) {
          console.error('Error fetching agent profile by email:', error);
          // If agent not found by API, use basic info from inspection
          setAgentProfile({
            name: inspection.agent_name,
            email: inspection.agent_email,
            role: 'agent',
            profile_picture: null
          });
        }
      }

      // Fetch inspector profile if exists
      if (inspection.inspector_id) {
        const inspectorRes = await api.get(`/users/${inspection.inspector_id}`);
        setInspectorProfile(inspectorRes.data);
      } else if (inspection.inspector_email) {
        // Try to fetch inspector by email (for direct schedule inspections)
        try {
          const inspectorRes = await api.get(`/users/by-email/${encodeURIComponent(inspection.inspector_email)}`);
          setInspectorProfile(inspectorRes.data);
        } catch (error) {
          console.error('Error fetching inspector profile by email:', error);
          // Fallback to basic info from inspection
          setInspectorProfile({
            name: inspection.inspector_name,
            email: inspection.inspector_email,
            role: 'inspector',
            profile_picture: null
          });
        }
      } else if (inspection.inspector_name) {
        // If only inspector name is available (legacy case), use basic info
        setInspectorProfile({
          name: inspection.inspector_name,
          role: 'inspector',
          profile_picture: null
        });
      }
    } catch (error) {
      console.error('Error fetching inspection participants:', error);
    }
  };

  const fetchOwnerProfile = async () => {
    try {
      // Fetch owner profile (accessible to all authenticated users)
      const response = await api.get('/users/owner');
      setOwnerProfile(response.data);
    } catch (error) {
      console.error('Error fetching owner profile:', error);
    }
  };

  const fetchOtherPartyProfile = async (userId: string) => {
    try {
      console.log('Fetching other party profile for userId:', userId);
      // Fetch specific user profile by ID
      const response = await api.get(`/users/${userId}`);
      console.log('Other party profile fetched:', response.data);
      setOtherPartyProfile(response.data);
    } catch (error) {
      console.error('Error fetching other party profile:', error);
    }
  };

  useEffect(() => {
    // Auto-scroll to bottom when messages change
    if (scrollViewRef.current && messages.length > 0) {
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages]);

  const fetchMessages = async () => {
    try {
      // For owner chat with specific customer, filter messages by customer_id
      if (customerId && !inspectionId) {
        const response = await api.get('/messages/owner/chat');
        console.log('Owner chat messages response:', response.data);
        
        // Filter messages to only show this specific customer's conversation
        const filteredMessages = response.data.filter((msg: any) => 
          msg.sender_id === customerId || msg.recipient_id === customerId
        );
        console.log(`Filtered to ${filteredMessages.length} messages for customer ${customerId}`);
        setMessages(filteredMessages);
      } else if (!inspectionId) {
        // Fallback: fetch all owner chat messages (shouldn't happen with new navigation)
        const response = await api.get('/messages/owner/chat');
        console.log('Owner chat messages response (no customer filter):', response.data);
        setMessages(response.data);
      } else {
        // Inspector chat - fetch by inspection ID
        const response = await api.get(`/messages/${inspectionId}`);
        setMessages(response.data);
      }
    } catch (error) {
      console.error('Error fetching messages:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSend = async () => {
    console.log('=== handleSend called ===');
    console.log('Message:', message);
    console.log('InspectionId:', inspectionId);
    console.log('CustomerId:', customerId);
    
    if (!message.trim()) {
      Alert.alert('Error', 'Please enter a message');
      return;
    }

    const messageText = message.trim();
    const tempId = `temp-${Date.now()}`;
    
    // Optimistically add message to UI
    const tempMessage = {
      id: tempId,
      message_text: messageText,
      sender_role: user?.role || 'customer',
      sender_name: user?.name || 'You',
      created_at: new Date().toISOString(),
    };
    
    setMessages(prev => [...prev, tempMessage]);
    setMessage(''); // Clear input immediately

    setSending(true);
    try {
      console.log('Sending message to API...');
      
      // Send to owner chat if no inspection, otherwise to inspector chat
      if (customerId && !inspectionId) {
        // Owner sending message to specific customer in owner chat
        const response = await api.post('/messages', {
          message_text: messageText,
          recipient_id: customerId, // Specify the recipient
        });
        console.log('Message sent to owner chat with customer:', response.data);
      } else if (!inspectionId) {
        // Customer/Agent sending to owner - no recipient_id needed (backend defaults to owner)
        const response = await api.post('/messages', {
          message_text: messageText,
        });
        console.log('Message sent to general owner chat:', response.data);
      } else {
        // Inspector chat - send to inspection group
        const response = await api.post('/messages', {
          inspection_id: inspectionId,
          message_text: messageText,
        });
        console.log('Message sent to inspection chat:', response.data);
      }

      // Refresh messages to get server version with correct IDs
      await fetchMessages();
    } catch (error: any) {
      console.error('Error sending message:', error);
      console.error('Error details:', error.response?.data);
      
      // Remove temp message on error
      setMessages(prev => prev.filter(m => m.id !== tempId));
      
      const errorMessage = error.response?.data?.detail || 'Failed to send message';
      Alert.alert('Error', errorMessage);
      
      // Restore message text so user can try again
      setMessage(messageText);
    } finally {
      setSending(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        {/* Custom header for owner chats (customer/agent chatting with Brad Baker) */}
        {!inspectionId ? (
          <View style={styles.ownerChatHeader}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
              <Ionicons name="arrow-back" size={24} color="#007AFF" />
            </TouchableOpacity>
            <View style={styles.profileBubbles}>
              {/* Current user's profile bubble (always shown) */}
              <View style={styles.profileBubbleContainer}>
                {user?.profile_picture ? (
                  <Image source={{ uri: user.profile_picture }} style={styles.profileBubbleImage} />
                ) : (
                  <View style={styles.profileBubble}>
                    <Text style={styles.profileBubbleText}>
                      {user?.name?.charAt(0).toUpperCase()}
                    </Text>
                  </View>
                )}
              </View>
              {/* Other party's profile bubble */}
              <View style={styles.profileBubbleContainer}>
                {user?.role === 'owner' ? (
                  // Owner viewing chat - show customer/agent profile
                  otherPartyProfile?.profile_picture ? (
                    <Image source={{ uri: otherPartyProfile.profile_picture }} style={styles.profileBubbleImage} />
                  ) : (
                    <View style={styles.profileBubble}>
                      <Text style={styles.profileBubbleText}>
                        {otherPartyProfile?.name ? otherPartyProfile.name.split(' ').map((n: string) => n[0]).join('').toUpperCase() : 'C'}
                      </Text>
                    </View>
                  )
                ) : (
                  // Customer/Agent viewing chat - show owner profile
                  ownerProfile?.profile_picture ? (
                    <Image source={{ uri: ownerProfile.profile_picture }} style={styles.profileBubbleImage} />
                  ) : (
                    <View style={styles.profileBubble}>
                      <Text style={styles.profileBubbleText}>
                        {ownerProfile?.name ? ownerProfile.name.split(' ').map((n: string) => n[0]).join('').toUpperCase() : 'BB'}
                      </Text>
                    </View>
                  )
                )}
              </View>
            </View>
            <View style={styles.placeholder} />
          </View>
        ) : (
          // Group chat header for inspection chats - show all participant bubbles
          <View style={styles.ownerChatHeader}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
              <Ionicons name="arrow-back" size={24} color="#007AFF" />
            </TouchableOpacity>
            <View style={styles.profileBubbles}>
              {/* Current user's profile bubble (always first) */}
              <View style={styles.profileBubbleContainer}>
                {user?.profile_picture ? (
                  <Image source={{ uri: user.profile_picture }} style={styles.profileBubbleImage} />
                ) : (
                  <View style={styles.profileBubble}>
                    <Text style={styles.profileBubbleText}>
                      {user?.name?.charAt(0).toUpperCase()}
                    </Text>
                  </View>
                )}
              </View>
              
              {/* Show other participants based on who is viewing */}
              {user?.role === 'customer' && (
                <>
                  {/* Customer sees: Customer (self) → Agent → Inspector */}
                  {agentProfile && (
                    <View style={styles.profileBubbleContainer}>
                      {agentProfile.profile_picture ? (
                        <Image source={{ uri: agentProfile.profile_picture }} style={styles.profileBubbleImage} />
                      ) : (
                        <View style={styles.profileBubble}>
                          <Text style={styles.profileBubbleText}>
                            {agentProfile.name?.charAt(0).toUpperCase()}
                          </Text>
                        </View>
                      )}
                    </View>
                  )}
                  {inspectorProfile && (
                    <View style={styles.profileBubbleContainer}>
                      {inspectorProfile.profile_picture ? (
                        <Image source={{ uri: inspectorProfile.profile_picture }} style={styles.profileBubbleImage} />
                      ) : (
                        <View style={styles.profileBubble}>
                          <Text style={styles.profileBubbleText}>
                            {inspectorProfile.name?.charAt(0).toUpperCase()}
                          </Text>
                        </View>
                      )}
                    </View>
                  )}
                </>
              )}
              
              {user?.role === 'agent' && (
                <>
                  {/* Agent sees: Agent (self) → Customer → Inspector */}
                  {customerProfile && (
                    <View style={styles.profileBubbleContainer}>
                      {customerProfile.profile_picture ? (
                        <Image source={{ uri: customerProfile.profile_picture }} style={styles.profileBubbleImage} />
                      ) : (
                        <View style={styles.profileBubble}>
                          <Text style={styles.profileBubbleText}>
                            {customerProfile.name?.charAt(0).toUpperCase()}
                          </Text>
                        </View>
                      )}
                    </View>
                  )}
                  {inspectorProfile && (
                    <View style={styles.profileBubbleContainer}>
                      {inspectorProfile.profile_picture ? (
                        <Image source={{ uri: inspectorProfile.profile_picture }} style={styles.profileBubbleImage} />
                      ) : (
                        <View style={styles.profileBubble}>
                          <Text style={styles.profileBubbleText}>
                            {inspectorProfile.name?.charAt(0).toUpperCase()}
                          </Text>
                        </View>
                      )}
                    </View>
                  )}
                </>
              )}
              
              {(user?.role === 'inspector' || user?.role === 'owner') && (
                <>
                  {/* Inspector/Owner sees: Self → Customer → Agent */}
                  {/* Show own profile */}
                  <View style={styles.profileBubbleContainer}>
                    {user?.profile_picture ? (
                      <Image source={{ uri: user.profile_picture }} style={styles.profileBubbleImage} />
                    ) : (
                      <View style={styles.profileBubble}>
                        <Text style={styles.profileBubbleText}>
                          {user?.name?.charAt(0).toUpperCase()}
                        </Text>
                      </View>
                    )}
                  </View>
                  
                  {customerProfile && (
                    <View style={styles.profileBubbleContainer}>
                      {customerProfile.profile_picture ? (
                        <Image source={{ uri: customerProfile.profile_picture }} style={styles.profileBubbleImage} />
                      ) : (
                        <View style={styles.profileBubble}>
                          <Text style={styles.profileBubbleText}>
                            {customerProfile.name?.charAt(0).toUpperCase()}
                          </Text>
                        </View>
                      )}
                    </View>
                  )}
                  {agentProfile && (
                    <View style={styles.profileBubbleContainer}>
                      {agentProfile.profile_picture ? (
                        <Image source={{ uri: agentProfile.profile_picture }} style={styles.profileBubbleImage} />
                      ) : (
                        <View style={styles.profileBubble}>
                          <Text style={styles.profileBubbleText}>
                            {agentProfile.name?.charAt(0).toUpperCase()}
                          </Text>
                        </View>
                      )}
                    </View>
                  )}
                </>
              )}
            </View>
            <View style={styles.placeholder} />
          </View>
        )}

        <ScrollView
          ref={scrollViewRef}
          style={styles.messagesContainer}
          contentContainerStyle={styles.messagesContent}
          onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
        >
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#007AFF" />
            </View>
          ) : messages.length > 0 ? (
            messages.map((msg) => {
              const isMyMessage = msg.sender_role === user?.role && msg.sender_name === user?.name;
              const showSenderName = inspectionId; // Show sender name for all messages in group chats (inspection chats)
              
              return (
                <View
                  key={msg.id}
                  style={[
                    styles.messageBubble,
                    isMyMessage ? styles.myMessage : styles.theirMessage,
                  ]}
                >
                  {showSenderName && (
                    <Text style={[
                      styles.messageSender,
                      isMyMessage && styles.mySenderName
                    ]}>
                      {isMyMessage ? 'You' : msg.sender_name}
                    </Text>
                  )}
                  <Text style={[
                    styles.messageText,
                    isMyMessage && styles.myMessageText
                  ]}>
                    {msg.message_text}
                  </Text>
                  <Text style={[
                    styles.messageTime,
                    isMyMessage && styles.myMessageTime
                  ]}>
                    {formatFullTimestamp(msg.created_at)}
                  </Text>
                </View>
              );
            })
          ) : (
            <View style={styles.emptyContainer}>
              <Ionicons name="chatbubbles-outline" size={64} color="#C7C7CC" />
              <Text style={styles.emptyText}>No messages yet</Text>
              <Text style={styles.emptySubtext}>Start the conversation below</Text>
            </View>
          )}
        </ScrollView>

        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            placeholder="Type your message..."
            value={message}
            onChangeText={setMessage}
            multiline
            maxLength={500}
          />
          <TouchableOpacity
            style={[styles.sendButton, sending && styles.sendButtonDisabled]}
            onPress={handleSend}
            disabled={sending}
          >
            {sending ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Ionicons name="send" size={20} color="#fff" />
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
  ownerChatHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
    height: 88,
  },
  profileBubbles: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  profileBubbleContainer: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  profileBubble: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#007AFF', // Blue for all users without profile pictures
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  profileBubbleImage: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 2,
    borderColor: '#fff',
  },
  profileBubbleText: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#fff',
  },
  backButton: {
    padding: 4,
  },
  headerText: {
    flex: 1,
    marginLeft: 12,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#1C1C1E',
  },
  headerSubtitle: {
    fontSize: 13,
    color: '#8E8E93',
    marginTop: 2,
  },
  placeholder: {
    width: 32,
  },
  messagesContainer: {
    flex: 1,
  },
  messagesContent: {
    padding: 16,
    flexGrow: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  messageBubble: {
    maxWidth: '80%',
    padding: 12,
    borderRadius: 16,
    marginBottom: 12,
  },
  myMessage: {
    alignSelf: 'flex-end',
    backgroundColor: '#007AFF',
  },
  theirMessage: {
    alignSelf: 'flex-start',
    backgroundColor: '#E9E9EB',
  },
  messageSender: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 4,
    color: '#666',
  },
  mySenderName: {
    color: 'rgba(255, 255, 255, 0.9)',
  },
  messageText: {
    fontSize: 16,
    color: '#1C1C1E',
  },
  myMessageText: {
    color: '#fff',
  },
  messageTime: {
    fontSize: 11,
    color: '#8E8E93',
    marginTop: 4,
  },
  myMessageTime: {
    color: 'rgba(255, 255, 255, 0.8)',
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
  inputContainer: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#E5E5EA',
    gap: 12,
  },
  input: {
    flex: 1,
    backgroundColor: '#F2F2F7',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 16,
    maxHeight: 100,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: '#C7C7CC',
  },
});
