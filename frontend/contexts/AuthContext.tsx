import React, { createContext, useContext, useEffect, useState } from 'react';
import authService, { User } from '../services/auth.service';
import { useAuthStore } from '../store/authStore';
import { registerForPushNotificationsAsync, setupNotificationListeners } from '../services/notifications.service';
import socketService from '../services/socket.service';
import ConsentModal from '../components/ConsentModal';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string, stayLoggedIn?: boolean) => Promise<void>;
  register: (data: any) => Promise<void>;
  logout: () => Promise<void>;
  updateUser: (updatedUser: Partial<User>) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isLoading, isAuthenticated, setUser, setLoading, logout: storeLogout } = useAuthStore();
  const [showConsentModal, setShowConsentModal] = useState(false);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      setLoading(true);
      const token = await authService.getToken();
      
      if (token) {
        const currentUser = await authService.getCurrentUser();
        if (currentUser) {
          setUser(currentUser);
        } else {
          setUser(null);
        }
      } else {
        setUser(null);
      }
    } catch (error) {
      console.error('Auth check error:', error);
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const login = async (email: string, password: string, stayLoggedIn: boolean = true) => {
    try {
      const { user } = await authService.login({ email, password }, stayLoggedIn);
      console.log('Login successful, user data:', JSON.stringify(user, null, 2));
      console.log('User needs_consent:', user.needs_consent);
      
      setUser(user);
      
      // Check if user needs to accept terms/privacy
      if (user.needs_consent) {
        console.log('Setting showConsentModal to true');
        setShowConsentModal(true);
      } else {
        console.log('User does not need consent, skipping modal');
      }
      
      // Register for push notifications after successful login
      // Note: Push notifications work via device tokens and persist even when logged out
      registerForPushNotificationsAsync().catch((error) => {
        console.error('Failed to register for push notifications:', error);
      });
      
      // Establish Socket.IO connection for real-time updates
      const token = await authService.getToken();
      if (token) {
        socketService.connect(token);
        console.log('✅ Socket.IO connection initiated on login');
      }
    } catch (error: any) {
      throw new Error(error.response?.data?.detail || 'Login failed');
    }
  };

  const handleConsentAccepted = () => {
    setShowConsentModal(false);
    // Update user to reflect consent has been accepted
    if (user) {
      setUser({ ...user, needs_consent: false, terms_accepted: true, privacy_policy_accepted: true });
    }
  };

  const register = async (data: any) => {
    try {
      const { user } = await authService.register(data);
      setUser(user);
    } catch (error: any) {
      throw new Error(error.response?.data?.detail || 'Registration failed');
    }
  };

  const logout = async () => {
    // Disconnect Socket.IO connection on logout
    socketService.disconnect();
    console.log('❌ Socket.IO disconnected on logout');
    
    await authService.logout();
    storeLogout();
  };

  const updateUser = (updatedUser: Partial<User>) => {
    if (user) {
      setUser({ ...user, ...updatedUser });
    }
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, isAuthenticated, login, register, logout, updateUser }}>
      {children}
      <ConsentModal 
        visible={showConsentModal} 
        onAccept={handleConsentAccepted} 
      />
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};
