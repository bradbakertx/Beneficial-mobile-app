import React from 'react';
import { View, StyleSheet } from 'react-native';

interface CustomerDashboardWrapperProps {
  children: React.ReactNode;
}

// Web version - just renders the dashboard without landing screen
export default function CustomerDashboardWrapper({ children }: CustomerDashboardWrapperProps) {
  return <View style={styles.container}>{children}</View>;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
