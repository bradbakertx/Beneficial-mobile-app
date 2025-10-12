import api from './api';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface LoginData {
  email: string;
  password: string;
}

export interface RegisterData {
  email: string;
  password: string;
  full_name: string;
  phone: string;
  role: 'customer' | 'agent' | 'owner';
}

export interface User {
  id: string;
  email: string;
  full_name: string;
  phone: string;
  role: 'customer' | 'agent' | 'owner';
  created_at: string;
}

class AuthService {
  async login(data: LoginData): Promise<{ token: string; user: User }> {
    const response = await api.post('/auth/login', data);
    const { token, user } = response.data;
    
    await AsyncStorage.setItem('session_token', token);
    await AsyncStorage.setItem('user_data', JSON.stringify(user));
    
    return { token, user };
  }

  async register(data: RegisterData): Promise<{ token: string; user: User }> {
    const response = await api.post('/auth/register', data);
    const { token, user } = response.data;
    
    await AsyncStorage.setItem('session_token', token);
    await AsyncStorage.setItem('user_data', JSON.stringify(user));
    
    return { token, user };
  }

  async logout(): Promise<void> {
    try {
      await api.post('/auth/logout');
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      await AsyncStorage.removeItem('session_token');
      await AsyncStorage.removeItem('user_data');
    }
  }

  async getCurrentUser(): Promise<User | null> {
    try {
      const response = await api.get('/auth/me');
      return response.data;
    } catch (error) {
      return null;
    }
  }

  async getStoredUser(): Promise<User | null> {
    const userData = await AsyncStorage.getItem('user_data');
    return userData ? JSON.parse(userData) : null;
  }

  async getToken(): Promise<string | null> {
    return await AsyncStorage.getItem('session_token');
  }
}

export default new AuthService();
