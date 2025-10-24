import { io, Socket } from 'socket.io-client';
import Constants from 'expo-constants';

const BACKEND_URL = Constants.expoConfig?.extra?.EXPO_PUBLIC_BACKEND_URL || process.env.EXPO_PUBLIC_BACKEND_URL || '';

class SocketService {
  private socket: Socket | null = null;
  private listeners: Map<string, Set<Function>> = new Map();

  connect(token: string) {
    try {
      if (this.socket?.connected) {
        console.log('Socket already connected');
        return;
      }

      // Defensive check for backend URL
      if (!BACKEND_URL || BACKEND_URL.trim() === '') {
        console.warn('⚠️ Socket.IO: No backend URL configured, skipping connection');
        return;
      }

      console.log('Connecting to Socket.IO:', BACKEND_URL);
      
      this.socket = io(BACKEND_URL, {
        auth: {
          token: token
        },
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionAttempts: 5,
        timeout: 10000, // 10 second timeout
      });
    } catch (error) {
      console.error('❌ Socket.IO connection initialization failed:', error);
      return;
    }

    this.socket.on('connect', () => {
      console.log('✅ Socket.IO connected:', this.socket?.id);
    });

    this.socket.on('disconnect', (reason) => {
      console.log('❌ Socket.IO disconnected:', reason);
    });

    this.socket.on('connect_error', (error) => {
      console.error('Socket.IO connection error:', error);
    });

    // Set up event listeners
    this.setupEventListeners();
  }

  private setupEventListeners() {
    if (!this.socket) return;

    // Listen for new quotes
    this.socket.on('new_quote', (data) => {
      console.log('📋 New quote received:', data);
      this.notifyListeners('new_quote', data);
    });

    // Listen for quote updates
    this.socket.on('quote_updated', (data) => {
      console.log('📋 Quote updated:', data);
      this.notifyListeners('quote_updated', data);
    });

    // Listen for new inspections
    this.socket.on('new_inspection', (data) => {
      console.log('🏠 New inspection received:', data);
      this.notifyListeners('new_inspection', data);
    });

    // Listen for inspection updates
    this.socket.on('inspection_updated', (data) => {
      console.log('🏠 Inspection updated:', data);
      this.notifyListeners('inspection_updated', data);
    });

    // Listen for new messages
    this.socket.on('new_message', (data) => {
      console.log('💬 New message received:', data);
      this.notifyListeners('new_message', data);
    });

    // Listen for time slot offers
    this.socket.on('time_slots_offered', (data) => {
      console.log('⏰ Time slots offered:', data);
      this.notifyListeners('time_slots_offered', data);
    });

    // Listen for time slot confirmations
    this.socket.on('time_slot_confirmed', (data) => {
      console.log('✅ Time slot confirmed:', data);
      this.notifyListeners('time_slot_confirmed', data);
    });

    // Listen for calendar updates
    this.socket.on('calendar_updated', (data) => {
      console.log('📅 Calendar updated:', data);
      this.notifyListeners('calendar_updated', data);
    });
  }

  private notifyListeners(event: string, data: any) {
    const listeners = this.listeners.get(event);
    if (listeners) {
      listeners.forEach(callback => callback(data));
    }
  }

  on(event: string, callback: Function) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)?.add(callback);
  }

  off(event: string, callback: Function) {
    this.listeners.get(event)?.delete(callback);
  }

  disconnect() {
    if (this.socket) {
      console.log('Disconnecting Socket.IO');
      this.socket.disconnect();
      this.socket = null;
      this.listeners.clear();
    }
  }

  isConnected(): boolean {
    return this.socket?.connected || false;
  }
}

export default new SocketService();
