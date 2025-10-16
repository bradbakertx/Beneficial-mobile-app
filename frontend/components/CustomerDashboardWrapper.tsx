import React, { useRef, useEffect, useState } from 'react';
import { View, StyleSheet, Dimensions, Platform, ScrollView } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import CustomerLandingScreen from './CustomerLandingScreen';

const { width } = Dimensions.get('window');

// Conditionally import PagerView only for native platforms
let PagerView: any = null;
if (Platform.OS !== 'web') {
  PagerView = require('react-native-pager-view').default;
}

interface CustomerDashboardWrapperProps {
  children: React.ReactNode;
}

const LAST_PAGE_KEY = '@customer_dashboard_last_page';

export default function CustomerDashboardWrapper({ children }: CustomerDashboardWrapperProps) {
  const pagerRef = useRef<any>(null);
  const scrollRef = useRef<ScrollView>(null);
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
        
        // Scroll to saved page for web
        if (Platform.OS === 'web' && scrollRef.current) {
          setTimeout(() => {
            scrollRef.current?.scrollTo({ x: pageNum * width, animated: false });
          }, 100);
        }
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

  const handleScroll = (event: any) => {
    const page = Math.round(event.nativeEvent.contentOffset.x / width);
    saveLastPage(page);
  };

  if (!isReady) {
    return <View style={styles.container} />;
  }

  // For web: use ScrollView with horizontal paging
  if (Platform.OS === 'web') {
    return (
      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        style={styles.container}
        onMomentumScrollEnd={handleScroll}
        scrollEventThrottle={16}
      >
        <View style={styles.page}>
          <CustomerLandingScreen
            onNavigateToDashboard={() => {
              scrollRef.current?.scrollTo({ x: width, animated: true });
            }}
          />
        </View>
        <View style={styles.page}>{children}</View>
      </ScrollView>
    );
  }

  // For native: use PagerView
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
