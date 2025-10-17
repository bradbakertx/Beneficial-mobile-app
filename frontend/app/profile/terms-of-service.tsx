import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

export default function TermsOfServiceScreen() {
  const router = useRouter();

  const handleTRECLink = () => {
    Linking.openURL('https://www.trec.texas.gov');
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#007AFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Terms of Service</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.lastUpdated}>Last Updated: January 2025</Text>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>1. Services Provided</Text>
          <Text style={styles.paragraph}>
            Beneficial Inspections Inc. offers professional residential and commercial property 
            inspection services in accordance with the Texas Real Estate Commission Standards of 
            Practice. Our services may include:
          </Text>
          <View style={styles.bulletList}>
            <Text style={styles.bulletItem}>• Scheduling property inspections</Text>
            <Text style={styles.bulletItem}>• Delivery of written inspection reports</Text>
            <Text style={styles.bulletItem}>• Communication with licensed inspectors</Text>
            <Text style={styles.bulletItem}>• Property maintenance recommendations</Text>
          </View>
          <Text style={styles.paragraph}>
            Our reports comply with TREC reporting requirements and are intended for informational 
            purposes only to assist clients in real estate transactions. They are not warranties 
            or guarantees of future performance or condition.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>2. Licensing & Compliance</Text>
          <Text style={styles.paragraph}>
            Beneficial Inspections Inc. is licensed by the Texas Real Estate Commission (TREC) and 
            performs inspections in accordance with TREC's Standards of Practice (SOPs).
          </Text>
          <View style={styles.licenseBox}>
            <Ionicons name="shield-checkmark" size={20} color="#34C759" />
            <Text style={styles.licenseText}>TREC License Number: 7522</Text>
          </View>
          <Text style={styles.paragraph}>
            For more information on TREC or to file a complaint, visit{' '}
            <Text style={styles.link} onPress={handleTRECLink}>
              https://www.trec.texas.gov
            </Text>
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>3. Eligibility</Text>
          <Text style={styles.paragraph}>
            To use our Services, you must be at least 18 years of age and legally able to enter 
            into contracts. By creating an account or scheduling an inspection, you confirm that 
            you meet these requirements.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>4. User Accounts</Text>
          <Text style={styles.paragraph}>
            Some features of the App may require creating an account. You are responsible for 
            maintaining the confidentiality of your account credentials. Any activity under your 
            account is your responsibility.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>5. Payments and Fees</Text>
          <Text style={styles.paragraph}>
            Inspection fees will be disclosed during the booking process. Payment is due prior to 
            or at the time of service unless otherwise arranged in writing. We reserve the right 
            to change pricing or service offerings at any time.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>6. Inspection Limitations</Text>
          <Text style={styles.paragraph}>
            Inspections are non-invasive, visual assessments of accessible components and systems 
            of a property, limited by the conditions present at the time of inspection.
          </Text>
          <View style={styles.bulletList}>
            <Text style={styles.bulletItem}>
              • Inspections do not include engineering evaluations, code compliance, or guarantees
            </Text>
            <Text style={styles.bulletItem}>
              • Reports reflect conditions as of the date of inspection only
            </Text>
            <Text style={styles.bulletItem}>
              • Inspection results are provided solely to the client named on the inspection 
              agreement and should not be relied upon by third parties
            </Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>7. Intellectual Property</Text>
          <Text style={styles.paragraph}>
            All content and intellectual property in this App (text, graphics, software, reports, 
            etc.) is owned by Beneficial Inspections Inc. and is protected by copyright and 
            trademark laws. You may not reuse or reproduce any material without written consent.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>8. Prohibited Uses</Text>
          <Text style={styles.paragraph}>You may not use our Services to:</Text>
          <View style={styles.bulletList}>
            <Text style={styles.bulletItem}>• Violate laws or regulations</Text>
            <Text style={styles.bulletItem}>• Impersonate another person or entity</Text>
            <Text style={styles.bulletItem}>• Attempt to access other users' data</Text>
            <Text style={styles.bulletItem}>
              • Interfere with the security or functionality of the App
            </Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>9. Disclaimer of Warranties</Text>
          <Text style={styles.paragraph}>
            THE SERVICES AND REPORTS ARE PROVIDED "AS IS" WITHOUT WARRANTIES OF ANY KIND, EXPRESS 
            OR IMPLIED.
          </Text>
          <Text style={styles.paragraph}>
            We do not guarantee that our Services will be error-free or that any defects will be 
            corrected. Use of the App and our inspection services is at your own risk.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>10. Limitation of Liability</Text>
          <Text style={styles.paragraph}>
            To the maximum extent permitted by law, Beneficial Inspections Inc. shall not be 
            liable for any indirect, incidental, special, or consequential damages arising from 
            your use of the Services or reliance on any inspection report.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>11. Termination</Text>
          <Text style={styles.paragraph}>
            We may suspend or terminate your access to the App or Services at our discretion, 
            with or without notice, if we believe you have violated these Terms or applicable law.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>12. Governing Law & Jurisdiction</Text>
          <Text style={styles.paragraph}>
            These Terms are governed by the laws of the State of Texas, without regard to conflict 
            of law principles. Any disputes shall be resolved in the appropriate state or federal 
            courts located in Bexar County, Texas.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>13. Updates to These Terms</Text>
          <Text style={styles.paragraph}>
            We reserve the right to update or modify these Terms at any time. Changes will be 
            posted in the App and will take effect upon posting. Continued use of the Services 
            after changes are posted constitutes your acceptance of the revised Terms.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>14. Contact Information</Text>
          <Text style={styles.paragraph}>
            For questions about these Terms or our Services, contact us at:
          </Text>
          <View style={styles.contactBox}>
            <Text style={styles.contactLine}>Beneficial Inspections Inc.</Text>
            <Text style={styles.contactLine}>Licensed by TREC – License #7522</Text>
            <Text style={styles.contactLine}>Email: bradbakertx@gmail.com</Text>
            <Text style={styles.contactLine}>Phone: (210) 562-0673</Text>
            <Text style={styles.contactLine}>Address: 24114 Alpine Lodge</Text>
            <Text style={styles.contactLine}>San Antonio, TX 78258</Text>
            <Text style={styles.contactLine}>Website: www.beneficialinspects.com</Text>
          </View>
          <Text style={styles.paragraph}>
            For more information about the Texas Real Estate Commission (TREC), visit:{' '}
            <Text style={styles.link} onPress={handleTRECLink}>
              https://www.trec.texas.gov
            </Text>
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
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1C1C1E',
  },
  placeholder: {
    width: 32,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
  },
  lastUpdated: {
    fontSize: 13,
    color: '#8E8E93',
    textAlign: 'center',
    marginBottom: 24,
    fontStyle: 'italic',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1C1C1E',
    marginBottom: 12,
  },
  paragraph: {
    fontSize: 15,
    color: '#1C1C1E',
    lineHeight: 22,
    marginBottom: 12,
  },
  bulletList: {
    marginLeft: 8,
    marginBottom: 12,
  },
  bulletItem: {
    fontSize: 15,
    color: '#1C1C1E',
    lineHeight: 24,
    marginBottom: 6,
  },
  licenseBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F5E9',
    padding: 12,
    borderRadius: 8,
    marginVertical: 12,
  },
  licenseText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#34C759',
    marginLeft: 8,
  },
  contactBox: {
    backgroundColor: '#F2F2F7',
    padding: 16,
    borderRadius: 8,
    marginVertical: 12,
  },
  contactLine: {
    fontSize: 14,
    color: '#1C1C1E',
    lineHeight: 20,
  },
  link: {
    color: '#007AFF',
    textDecorationLine: 'underline',
  },
});
