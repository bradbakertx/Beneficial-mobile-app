import api from './api';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface LoginData {
  email: string;
  password: string;
}

export interface RegisterData {
  email: string;
  password: string;
  name: string;
  phone?: string;
  role: 'customer' | 'agent' | 'owner';
}

export interface User {
  id: string;
  email: string;
  name: string;
  phone?: string;
  role: 'customer' | 'agent' | 'owner';
  profile_picture?: string;
}

class AuthService {
  async login(data: LoginData, stayLoggedIn: boolean = true): Promise<{ token: string; user: User }> {
    const response = await api.post('/auth/login', data);
    const { session_token, user } = response.data;
    
    // Always store the token and user data
    await AsyncStorage.setItem('session_token', session_token);
    await AsyncStorage.setItem('user_data', JSON.stringify(user));
    
    // Store the preference for staying logged in
    await AsyncStorage.setItem('stay_logged_in', JSON.stringify(stayLoggedIn));
    
    return { token: session_token, user };
  }

  async register(data: RegisterData): Promise<{ token: string; user: User }> {
    const response = await api.post('/auth/register', data);
    const { session_token, user } = response.data;
    
    await AsyncStorage.setItem('session_token', session_token);
    await AsyncStorage.setItem('user_data', JSON.stringify(user));
    
    return { token: session_token, user };
  }

  async logout(): Promise<void> {
    // Clear local storage (backend doesn't need logout endpoint for JWT)
    await AsyncStorage.removeItem('session_token');
    await AsyncStorage.removeItem('user_data');
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
