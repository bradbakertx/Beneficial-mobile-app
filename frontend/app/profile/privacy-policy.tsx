import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function PrivacyPolicyScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity 
          onPress={() => router.back()} 
          style={styles.backButton}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={24} color="#007AFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Privacy Policy</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.lastUpdated}>Last Updated: December 2024</Text>

        <Text style={styles.intro}>
          Welcome to Beneficial Inspections. We are committed to protecting your privacy and ensuring the security of your personal information.
        </Text>

        <Text style={styles.sectionTitle}>1. Information We Collect</Text>
        <Text style={styles.paragraph}>
          <Text style={styles.bold}>Account Information:</Text> Name, email, phone number, password (encrypted), user role, and profile picture.
        </Text>
        <Text style={styles.paragraph}>
          <Text style={styles.bold}>Property & Inspection Data:</Text> Property addresses, inspection details, quotes, reports, and agreements.
        </Text>
        <Text style={styles.paragraph}>
          <Text style={styles.bold}>Communications:</Text> In-app messages and email communications.
        </Text>

        <Text style={styles.sectionTitle}>2. How We Use Your Information</Text>
        <Text style={styles.paragraph}>
          • Schedule and manage property inspections{'\n'}
          • Facilitate communication between customers, agents, and inspectors{'\n'}
          • Generate quotes and process payments{'\n'}
          • Send inspection reports and calendar reminders{'\n'}
          • Improve our services and user experience
        </Text>

        <Text style={styles.sectionTitle}>3. Data Sharing</Text>
        <Text style={styles.paragraph}>
          <Text style={styles.bold}>We do NOT sell your personal information.</Text>
        </Text>
        <Text style={styles.paragraph}>
          We share data only with:{'\n'}
          • Service providers (AWS S3, Square, Google Calendar){'\n'}
          • Other users as necessary for inspections{'\n'}
          • Legal authorities when required by law
        </Text>

        <Text style={styles.sectionTitle}>4. Data Security</Text>
        <Text style={styles.paragraph}>
          We use industry-standard security measures:{'\n'}
          • HTTPS/TLS encryption for all data transmission{'\n'}
          • Bcrypt password hashing{'\n'}
          • Secure AWS S3 file storage{'\n'}
          • Role-based access control
        </Text>

        <Text style={styles.sectionTitle}>5. Your Privacy Rights</Text>
        <Text style={styles.paragraph}>
          You have the right to:{'\n'}
          • Access your personal data{'\n'}
          • Correct inaccurate information{'\n'}
          • Request data deletion{'\n'}
          • Export your data (data portability){'\n'}
          • Object to data processing
        </Text>

        <Text style={styles.sectionTitle}>6. GDPR & CCPA Compliance</Text>
        <Text style={styles.paragraph}>
          We comply with GDPR (EU) and CCPA (California) regulations. EU and California residents have additional rights under these laws.
        </Text>

        <Text style={styles.sectionTitle}>7. Data Retention</Text>
        <Text style={styles.paragraph}>
          • Active accounts: Data retained while account is active{'\n'}
          • Inactive accounts: May be deleted after 3 years{'\n'}
          • Deleted accounts: Data anonymized within 90 days
        </Text>

        <Text style={styles.sectionTitle}>8. Children's Privacy</Text>
        <Text style={styles.paragraph}>
          Our app is not intended for children under 13. We do not knowingly collect information from children.
        </Text>

        <Text style={styles.sectionTitle}>9. Contact Us</Text>
        <Text style={styles.paragraph}>
          For privacy questions or to exercise your rights:{'\n\n'}
          Email: privacy@beneficialinspections.com{'\n'}
          Support: support@beneficialinspections.com{'\n'}
          Phone: (210) 562-0673
        </Text>

        <Text style={styles.sectionTitle}>10. Changes to This Policy</Text>
        <Text style={styles.paragraph}>
          We may update this Privacy Policy from time to time. You will be notified of material changes via email or app notification at least 30 days before changes take effect.
        </Text>

        <View style={styles.summaryBox}>
          <Text style={styles.summaryTitle}>Quick Summary</Text>
          <Text style={styles.summaryText}>
            • We collect: Name, email, phone, property info, inspection data{'\n'}
            • We use it to: Provide inspection services and communication{'\n'}
            • We share with: Service providers (AWS, Square, Google){'\n'}
            • Your rights: Access, correction, deletion, portability{'\n'}
            • We do NOT sell your data
          </Text>
        </View>

        <Text style={styles.footer}>
          By using Beneficial Inspections, you acknowledge that you have read and understood this Privacy Policy.
        </Text>

        <View style={styles.spacing} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  backButton: {
    padding: 8,
    marginLeft: -8,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#000',
  },
  placeholder: {
    width: 40,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  lastUpdated: {
    fontSize: 12,
    color: '#8E8E93',
    marginTop: 16,
    marginBottom: 8,
    fontStyle: 'italic',
  },
  intro: {
    fontSize: 15,
    color: '#333',
    lineHeight: 22,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
    marginTop: 24,
    marginBottom: 12,
  },
  paragraph: {
    fontSize: 15,
    color: '#333',
    lineHeight: 22,
    marginBottom: 12,
  },
  bold: {
    fontWeight: '600',
    color: '#000',
  },
  summaryBox: {
    backgroundColor: '#F2F2F7',
    borderRadius: 12,
    padding: 16,
    marginTop: 24,
    marginBottom: 16,
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginBottom: 8,
  },
  summaryText: {
    fontSize: 14,
    color: '#333',
    lineHeight: 20,
  },
  footer: {
    fontSize: 13,
    color: '#8E8E93',
    fontStyle: 'italic',
    marginTop: 20,
    marginBottom: 8,
    textAlign: 'center',
  },
  spacing: {
    height: 40,
  },
});
