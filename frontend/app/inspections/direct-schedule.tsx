import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Picker } from '@react-native-picker/picker';
import api from '../../services/api';

export default function DirectScheduleScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    // Client Information
    customerName: '',
    customerPhone: '',
    customerEmail: '',
    
    // Property Information
    propertyAddress: '',
    propertyCity: '',
    propertyZip: '',
    squareFeet: '',
    yearBuilt: '',
    foundationType: 'Slab',
    propertyType: 'Single family buyer\'s inspection',
    
    // Schedule Request
    optionPeriodEnd: '',
    preferredDays: '',
  });

  const foundationTypes = ['Slab', 'Pier & Beam', 'Basement', 'Crawl Space', 'Other'];
  
  const propertyTypes = [
    'Single family buyer\'s inspection',
    'Single family seller\'s inspection',
    'Townhome/Condo',
    'Multi-family (2-4 units)',
    'Commercial property',
    'New construction',
  ];

  const handleSubmit = async () => {
    // Validation
    if (!formData.customerName || !formData.customerPhone || !formData.customerEmail) {
      Alert.alert('Error', 'Please fill in all client information');
      return;
    }

    if (!formData.propertyAddress || !formData.propertyCity || !formData.propertyZip) {
      Alert.alert('Error', 'Please fill in all property information');
      return;
    }

    if (!formData.optionPeriodEnd || !formData.preferredDays) {
      Alert.alert('Error', 'Please fill in schedule request information');
      return;
    }

    setLoading(true);
    try {
      const response = await api.post('/inspections/direct-schedule', {
        customer_name: formData.customerName,
        customer_phone: formData.customerPhone,
        customer_email: formData.customerEmail,
        property_address: formData.propertyAddress,
        property_city: formData.propertyCity,
        property_zip: formData.propertyZip,
        square_feet: formData.squareFeet ? parseInt(formData.squareFeet) : null,
        year_built: formData.yearBuilt ? parseInt(formData.yearBuilt) : null,
        foundation_type: formData.foundationType,
        property_type: formData.propertyType,
        option_period_end: formData.optionPeriodEnd,
        preferred_days: formData.preferredDays,
      });

      Alert.alert(
        'Success',
        'Schedule request submitted! The owner will review and offer time slots.',
        [
          {
            text: 'OK',
            onPress: () => router.back(),
          },
        ]
      );
    } catch (error: any) {
      console.error('Error submitting direct schedule:', error);
      Alert.alert('Error', error.response?.data?.detail || 'Failed to submit schedule request');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#007AFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Direct Schedule Request</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Client Information Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Client Information</Text>
          
          <Text style={styles.label}>Full Name *</Text>
          <TextInput
            style={styles.input}
            value={formData.customerName}
            onChangeText={(text) => setFormData({ ...formData, customerName: text })}
            placeholder="Enter client's full name"
          />

          <Text style={styles.label}>Phone Number *</Text>
          <TextInput
            style={styles.input}
            value={formData.customerPhone}
            onChangeText={(text) => setFormData({ ...formData, customerPhone: text })}
            placeholder="(210) 555-1234"
            keyboardType="phone-pad"
          />

          <Text style={styles.label}>Email Address *</Text>
          <TextInput
            style={styles.input}
            value={formData.customerEmail}
            onChangeText={(text) => setFormData({ ...formData, customerEmail: text })}
            placeholder="client@example.com"
            keyboardType="email-address"
            autoCapitalize="none"
          />
        </View>

        {/* Property Information Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Property Information</Text>
          
          <Text style={styles.label}>Address *</Text>
          <TextInput
            style={styles.input}
            value={formData.propertyAddress}
            onChangeText={(text) => setFormData({ ...formData, propertyAddress: text })}
            placeholder="Enter property address"
          />

          <Text style={styles.label}>City *</Text>
          <TextInput
            style={styles.input}
            value={formData.propertyCity}
            onChangeText={(text) => setFormData({ ...formData, propertyCity: text })}
            placeholder="San Antonio"
          />

          <Text style={styles.label}>Zip Code *</Text>
          <TextInput
            style={styles.input}
            value={formData.propertyZip}
            onChangeText={(text) => setFormData({ ...formData, propertyZip: text })}
            placeholder="78258"
            keyboardType="number-pad"
            maxLength={5}
          />

          <Text style={styles.label}>Square Feet</Text>
          <TextInput
            style={styles.input}
            value={formData.squareFeet}
            onChangeText={(text) => setFormData({ ...formData, squareFeet: text })}
            placeholder="e.g., 2500"
            keyboardType="number-pad"
          />

          <Text style={styles.label}>Year Built</Text>
          <TextInput
            style={styles.input}
            value={formData.yearBuilt}
            onChangeText={(text) => setFormData({ ...formData, yearBuilt: text })}
            placeholder="e.g., 2010"
            keyboardType="number-pad"
            maxLength={4}
          />

          <Text style={styles.label}>Foundation Type</Text>
          <View style={styles.pickerContainer}>
            <Picker
              selectedValue={formData.foundationType}
              onValueChange={(value) => setFormData({ ...formData, foundationType: value })}
              style={styles.picker}
            >
              {foundationTypes.map((type) => (
                <Picker.Item key={type} label={type} value={type} />
              ))}
            </Picker>
          </View>

          <Text style={styles.label}>Property Type</Text>
          <View style={styles.pickerContainer}>
            <Picker
              selectedValue={formData.propertyType}
              onValueChange={(value) => setFormData({ ...formData, propertyType: value })}
              style={styles.picker}
            >
              {propertyTypes.map((type) => (
                <Picker.Item key={type} label={type} value={type} />
              ))}
            </Picker>
          </View>
        </View>

        {/* Schedule Request Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Schedule Request</Text>
          
          <Text style={styles.label}>Option Period End Date *</Text>
          <TextInput
            style={styles.input}
            value={formData.optionPeriodEnd}
            onChangeText={(text) => setFormData({ ...formData, optionPeriodEnd: text })}
            placeholder="MM/DD/YYYY"
          />
          <Text style={styles.helpText}>Enter the date when the option period ends</Text>

          <Text style={styles.label}>Preferred Days of Week *</Text>
          <TextInput
            style={styles.input}
            value={formData.preferredDays}
            onChangeText={(text) => setFormData({ ...formData, preferredDays: text })}
            placeholder="e.g., Monday, Wednesday, Friday"
            multiline
          />
          <Text style={styles.helpText}>List preferred days for the inspection</Text>
        </View>

        {/* Submit Button */}
        <TouchableOpacity
          style={[styles.submitButton, loading && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.submitButtonText}>Submit Schedule Request</Text>
          )}
        </TouchableOpacity>
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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1C1C1E',
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1C1C1E',
    marginBottom: 8,
    marginTop: 12,
  },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#E5E5EA',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#1C1C1E',
  },
  pickerContainer: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#E5E5EA',
    borderRadius: 8,
    overflow: 'hidden',
  },
  picker: {
    height: 50,
  },
  helpText: {
    fontSize: 12,
    color: '#8E8E93',
    marginTop: 4,
  },
  submitButton: {
    backgroundColor: '#007AFF',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 16,
    marginBottom: 32,
  },
  submitButtonDisabled: {
    backgroundColor: '#C7C7CC',
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
});
