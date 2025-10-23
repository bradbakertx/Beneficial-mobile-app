import React from 'react';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Platform } from 'react-native';
import { useAuth } from '../../contexts/AuthContext';

export default function TabsLayout() {
  const { user } = useAuth();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#007AFF',
        tabBarInactiveTintColor: '#8E8E93',
        tabBarStyle: {
          backgroundColor: '#fff',
          borderTopWidth: 1,
          borderTopColor: '#E5E5EA',
          height: Platform.OS === 'android' ? 100 : 88, // Increased for Android
          paddingBottom: Platform.OS === 'android' ? 44 : 32, // Extra padding for Android nav buttons
          paddingTop: 8,
        },
        headerStyle: {
          backgroundColor: '#007AFF',
        },
        headerTintColor: '#fff',
        headerTitleStyle: {
          fontWeight: '600',
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Dashboard',
          tabBarIcon: ({ color, size }) => <Ionicons name="home" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="add"
        options={{
          title: 'Add',
          tabBarIcon: ({ color, size }) => <Ionicons name="add-circle" size={size} color={color} />,
          href: user?.role === 'owner' ? '/add' : null, // Only show for owners
        }}
      />
      <Tabs.Screen
        name="quotes"
        options={{
          title: 'Quotes',
          tabBarIcon: ({ color, size }) => <Ionicons name="document-text" size={size} color={color} />,
          href: user?.role !== 'owner' ? '/quotes' : null, // Hide for owners
        }}
      />
      <Tabs.Screen
        name="inspections"
        options={{
          title: 'Inspections',
          tabBarIcon: ({ color, size }) => <Ionicons name="clipboard" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="chat"
        options={{
          title: 'Chat',
          tabBarIcon: ({ color, size }) => <Ionicons name="chatbubbles" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, size }) => <Ionicons name="person" size={size} color={color} />,
        }}
      />
    </Tabs>
  );
}
