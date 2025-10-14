import React, { useState, useEffect } from 'react';
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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import api from '../../services/api';

export default function ChatScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const inspectionId = params.inspectionId as string | undefined;
  const recipientName = params.recipientName as string || 'Inspector';
  const propertyAddress = params.propertyAddress as string || '';

  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [messages, setMessages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMessages();
  }, []);

  const fetchMessages = async () => {
    try {
      // For owner chat (no inspection), fetch messages by conversation
      if (!inspectionId) {
        const response = await api.get('/conversations');
        console.log('Conversations response:', response.data);
        
        // Find owner chat conversation
        const ownerConversation = response.data.find((conv: any) => conv.conversation_type === 'owner_chat');
        
        if (ownerConversation && ownerConversation.inspection_id) {
          // Fetch messages for this conversation
          const messagesResponse = await api.get(`/messages/${ownerConversation.inspection_id}`);
          setMessages(messagesResponse.data);
        }
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
    
    if (!message.trim()) {
      Alert.alert('Error', 'Please enter a message');
      return;
    }

    setSending(true);
    try {
      console.log('Sending message to API...');
      const response = await api.post('/messages', {
        inspection_id: inspectionId || null,
        recipient_id: null, // Auto-determined by backend
        message_text: message.trim(),
      });
      
      console.log('Message sent successfully:', response.data);

      // Clear message and go back
      setMessage('');
      Alert.alert('Success', 'Message sent successfully!');
      
      // Refresh messages if inspection chat
      if (inspectionId) {
        fetchMessages();
      } else {
        // For owner chat, just go back after brief delay
        setTimeout(() => router.back(), 1000);
      }
    } catch (error: any) {
      console.error('Error sending message:', error);
      console.error('Error details:', error.response?.data);
      const errorMessage = error.response?.data?.detail || 'Failed to send message';
      Alert.alert('Error', errorMessage);
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
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#007AFF" />
          </TouchableOpacity>
          <View style={styles.headerText}>
            <Text style={styles.headerTitle}>Message {recipientName}</Text>
            {propertyAddress && (
              <Text style={styles.headerSubtitle}>{propertyAddress}</Text>
            )}
          </View>
          <View style={styles.placeholder} />
        </View>

        <ScrollView
          style={styles.messagesContainer}
          contentContainerStyle={styles.messagesContent}
        >
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#007AFF" />
            </View>
          ) : messages.length > 0 ? (
            messages.map((msg) => (
              <View
                key={msg.id}
                style={[
                  styles.messageBubble,
                  msg.sender_role === 'customer' ? styles.myMessage : styles.theirMessage,
                ]}
              >
                <Text style={styles.messageSender}>{msg.sender_name}</Text>
                <Text style={styles.messageText}>{msg.message_text}</Text>
                <Text style={styles.messageTime}>
                  {new Date(msg.created_at).toLocaleString()}
                </Text>
              </View>
            ))
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
  messageText: {
    fontSize: 16,
    color: '#1C1C1E',
  },
  messageTime: {
    fontSize: 11,
    color: '#8E8E93',
    marginTop: 4,
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
