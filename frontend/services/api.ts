import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';

// For local/forked environments, use relative path so it uses the same host
// For production, EXPO_PUBLIC_BACKEND_URL should be set explicitly
const backendUrl = Constants.expoConfig?.extra?.backendUrl || process.env.EXPO_PUBLIC_BACKEND_URL;
const API_URL = backendUrl && backendUrl.trim() !== '' ? backendUrl : '';

const api = axios.create({
  baseURL: API_URL ? `${API_URL}/api` : '/api',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  async (config) => {
    const token = await AsyncStorage.getItem('session_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle errors
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid
      await AsyncStorage.removeItem('session_token');
      await AsyncStorage.removeItem('user_data');
      // You might want to redirect to login here
    }
    return Promise.reject(error);
  }
);

export default api;
