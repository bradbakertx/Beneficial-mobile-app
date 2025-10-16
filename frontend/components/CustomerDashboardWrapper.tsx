import React, { useRef, useEffect, useState } from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import PagerView from 'react-native-pager-view';
import AsyncStorage from '@react-native-async-storage/async-storage';
import CustomerLandingScreen from '../app/(tabs)/customer-landing';

const { width } = Dimensions.get('window');

interface CustomerDashboardWrapperProps {
  children: React.ReactNode;
}

const LAST_PAGE_KEY = '@customer_dashboard_last_page';

export default function CustomerDashboardWrapper({ children }: CustomerDashboardWrapperProps) {
  const pagerRef = useRef<PagerView>(null);
  const [initialPage, setInitialPage] = useState(0);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    loadLastPage();
  }, []);

  const loadLastPage = async () => {
    try {
      const savedPage = await AsyncStorage.getItem(LAST_PAGE_KEY);
      if (savedPage !== null) {
        const pageNum = parseInt(savedPage, 10);
        setInitialPage(pageNum);
      }
    } catch (error) {
      console.log('Error loading last page:', error);
    } finally {
      setIsReady(true);
    }
  };

  const saveLastPage = async (page: number) => {
    try {
      await AsyncStorage.setItem(LAST_PAGE_KEY, page.toString());
    } catch (error) {
      console.log('Error saving last page:', error);
    }
  };

  const handlePageSelected = (e: any) => {
    const page = e.nativeEvent.position;
    saveLastPage(page);
  };

  if (!isReady) {
    return <View style={styles.container} />;
  }

  return (
    <PagerView
      ref={pagerRef}
      style={styles.container}
      initialPage={initialPage}
      onPageSelected={handlePageSelected}
    >
      {/* Page 0: Landing Screen */}
      <View key="landing" style={styles.page}>
        <CustomerLandingScreen
          onNavigateToDashboard={() => {
            pagerRef.current?.setPage(1);
          }}
        />
      </View>

      {/* Page 1: Dashboard */}
      <View key="dashboard" style={styles.page}>
        {children}
      </View>
    </PagerView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  page: {
    flex: 1,
    width,
  },
});
