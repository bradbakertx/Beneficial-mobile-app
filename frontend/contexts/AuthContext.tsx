import React, { createContext, useContext, useEffect, useState } from 'react';
import authService, { User } from '../services/auth.service';
import { useAuthStore } from '../store/authStore';
import { registerForPushNotificationsAsync, setupNotificationListeners } from '../services/notifications.service';

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
      setUser(user);
      
      // Register for push notifications after successful login
      // Note: Push notifications work via device tokens and persist even when logged out
      registerForPushNotificationsAsync().catch((error) => {
        console.error('Failed to register for push notifications:', error);
      });
    } catch (error: any) {
      throw new Error(error.response?.data?.detail || 'Login failed');
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
    await authService.logout();
    storeLogout();
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, isAuthenticated, login, register, logout }}>
      {children}
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
