import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Linking,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import api from '../../services/api';
import { format } from 'date-fns';

interface ReportFile {
  filename: string;
  uploaded_at?: string;
  download_url: string | null;
  s3_key: string;
  error?: string;
}

interface ReportsResponse {
  inspection_id: string;
  property_address: string;
  inspector_name?: string;
  scheduled_date?: string;
  finalized: boolean;
  reports: ReportFile[];
  message?: string;
}

export default function ViewReportsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const inspectionId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [reportsData, setReportsData] = useState<ReportsResponse | null>(null);
  const [downloadingFile, setDownloadingFile] = useState<string | null>(null);

  useEffect(() => {
    if (inspectionId) {
      fetchReports();
    }
  }, [inspectionId]);

  const fetchReports = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/reports/${inspectionId}`);
      setReportsData(response.data);
    } catch (error: any) {
      console.error('Error fetching reports:', error);
      const errorMessage = error.response?.data?.detail || 'Failed to load reports';
      Alert.alert('Error', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadReport = async (report: ReportFile) => {
    if (!report.download_url) {
      Alert.alert('Error', report.error || 'Download link not available');
      return;
    }

    try {
      setDownloadingFile(report.filename);
      
      // Check if the URL can be opened
      const supported = await Linking.canOpenURL(report.download_url);
      
      if (supported) {
        // Open the PDF in browser/viewer
        await Linking.openURL(report.download_url);
      } else {
        Alert.alert('Error', `Cannot open this file: ${report.download_url}`);
      }
    } catch (error: any) {
      console.error('Error opening report:', error);
      Alert.alert('Error', 'Failed to open report file');
    } finally {
      setDownloadingFile(null);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#007AFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Inspection Reports</Text>
          <View style={styles.placeholder} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Loading reports...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!reportsData) {
    return (
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#007AFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Inspection Reports</Text>
          <View style={styles.placeholder} />
        </View>
        <View style={styles.emptyContainer}>
          <Ionicons name="document-outline" size={64} color="#C7C7CC" />
          <Text style={styles.emptyText}>No reports found</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#007AFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Inspection Reports</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.scrollContent}>
        {/* Inspection Details Card */}
        <View style={styles.detailsCard}>
          <View style={styles.detailsRow}>
            <Ionicons name="home-outline" size={20} color="#007AFF" />
            <Text style={styles.detailsLabel}>Property:</Text>
          </View>
          <Text style={styles.detailsValue}>{reportsData.property_address}</Text>

          {reportsData.inspector_name && (
            <>
              <View style={[styles.detailsRow, styles.detailsRowSpaced]}>
                <Ionicons name="person-outline" size={20} color="#007AFF" />
                <Text style={styles.detailsLabel}>Inspector:</Text>
              </View>
              <Text style={styles.detailsValue}>{reportsData.inspector_name}</Text>
            </>
          )}

          {reportsData.scheduled_date && (
            <>
              <View style={[styles.detailsRow, styles.detailsRowSpaced]}>
                <Ionicons name="calendar-outline" size={20} color="#007AFF" />
                <Text style={styles.detailsLabel}>Date:</Text>
              </View>
              <Text style={styles.detailsValue}>
                {format(new Date(reportsData.scheduled_date), 'MMMM d, yyyy')}
              </Text>
            </>
          )}
        </View>

        {/* Reports List */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            Report Files ({reportsData.reports.length})
          </Text>
          
          {reportsData.reports.length === 0 ? (
            <View style={styles.emptyCard}>
              <Ionicons name="document-outline" size={48} color="#C7C7CC" />
              <Text style={styles.emptyCardText}>
                {reportsData.message || 'No report files available'}
              </Text>
            </View>
          ) : (
            reportsData.reports.map((report, index) => (
              <TouchableOpacity
                key={index}
                style={styles.reportCard}
                onPress={() => handleDownloadReport(report)}
                disabled={!report.download_url || downloadingFile === report.filename}
              >
                <View style={styles.reportIconContainer}>
                  <Ionicons name="document-text" size={32} color="#007AFF" />
                </View>
                
                <View style={styles.reportInfo}>
                  <Text style={styles.reportFilename} numberOfLines={2}>
                    {report.filename}
                  </Text>
                  
                  {report.uploaded_at && (
                    <Text style={styles.reportDate}>
                      Uploaded: {format(new Date(report.uploaded_at), 'MMM d, yyyy h:mm a')}
                    </Text>
                  )}
                  
                  {report.error && (
                    <Text style={styles.reportError}>
                      {report.error}
                    </Text>
                  )}
                </View>
                
                <View style={styles.reportAction}>
                  {downloadingFile === report.filename ? (
                    <ActivityIndicator size="small" color="#007AFF" />
                  ) : report.download_url ? (
                    <Ionicons name="download-outline" size={24} color="#007AFF" />
                  ) : (
                    <Ionicons name="alert-circle-outline" size={24} color="#FF3B30" />
                  )}
                </View>
              </TouchableOpacity>
            ))
          )}
        </View>

        {/* Info Message */}
        <View style={styles.infoCard}>
          <Ionicons name="information-circle-outline" size={20} color="#007AFF" />
          <Text style={styles.infoText}>
            Tap any report file to view or download it. Files will open in your default PDF viewer.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  backButton: {
    padding: 8,
    marginLeft: -8,
    minWidth: 44,
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#1C1C1E',
  },
  placeholder: {
    width: 32,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#8E8E93',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyText: {
    marginTop: 16,
    fontSize: 18,
    fontWeight: '600',
    color: '#8E8E93',
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  detailsCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  detailsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  detailsRowSpaced: {
    marginTop: 12,
  },
  detailsLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#8E8E93',
  },
  detailsValue: {
    fontSize: 16,
    color: '#1C1C1E',
    marginLeft: 28,
  },
  section: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1C1C1E',
    marginBottom: 12,
  },
  emptyCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 32,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  emptyCardText: {
    marginTop: 12,
    fontSize: 16,
    color: '#8E8E93',
    textAlign: 'center',
  },
  reportCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  reportIconContainer: {
    marginRight: 12,
  },
  reportInfo: {
    flex: 1,
  },
  reportFilename: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1C1C1E',
    marginBottom: 4,
  },
  reportDate: {
    fontSize: 13,
    color: '#8E8E93',
  },
  reportError: {
    fontSize: 13,
    color: '#FF3B30',
    marginTop: 4,
  },
  reportAction: {
    marginLeft: 12,
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#E3F2FD',
    borderRadius: 12,
    padding: 16,
    gap: 12,
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    color: '#1C1C1E',
    lineHeight: 20,
  },
});
