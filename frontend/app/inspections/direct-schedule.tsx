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
import DateTimePicker from '@react-native-community/datetimepicker';
import { format } from 'date-fns';
import api from '../../services/api';

const DAYS_OF_WEEK = [
  { name: 'Monday', value: 'Monday' },
  { name: 'Tuesday', value: 'Tuesday' },
  { name: 'Wednesday', value: 'Wednesday' },
  { name: 'Thursday', value: 'Thursday' },
  { name: 'Friday', value: 'Friday' },
  { name: 'Saturday*', value: 'Saturday' },
];

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
  });

  // Schedule Request state
  const [optionPeriodEnd, setOptionPeriodEnd] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [selectedDays, setSelectedDays] = useState<string[]>([]);

  // Match quote form dropdowns
  const foundationTypes = ['Slab', 'Pier & Beam'];
  
  const propertyTypes = [
    'Single family buyer\'s inspection',
    'Single family seller\'s pre-list inspection',
    'Multi-family building inspection',
    'Commercial inspection',
  ];

  const toggleDay = (day: string) => {
    if (selectedDays.includes(day)) {
      setSelectedDays(selectedDays.filter(d => d !== day));
    } else {
      setSelectedDays([...selectedDays, day]);
    }
  };

  const onDateChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(Platform.OS === 'ios');
    if (selectedDate) {
      setOptionPeriodEnd(selectedDate);
    }
  };

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

    if (selectedDays.length === 0) {
      Alert.alert('Error', 'Please select at least one preferred day');
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
        option_period_end: format(optionPeriodEnd, 'yyyy-MM-dd'),
        preferred_days: selectedDays.join(','),
      });

      Alert.alert(
        'Success',
        'Schedule request submitted! The owner will review and offer time slots.',
        [
          {
            text: 'OK',
            onPress: () => router.replace('/(tabs)'),
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
            onChangeText={(text) => setFormData({ ...formData, customerName: text })}s full name"
          />

          <Text style={styles.label}>Phone Number *</Text>
          <TextInput
            style={styles.input}
            value={formData.customerPhone}
            onChangeText={(text) => setFormData({ ...formData, customerPhone: text })}
            keyboardType="phone-pad"
          />

          <Text style={styles.label}>Email Address *</Text>
          <TextInput
            style={styles.input}
            value={formData.customerEmail}
            onChangeText={(text) => setFormData({ ...formData, customerEmail: text })}
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
          />

          <Text style={styles.label}>City *</Text>
          <TextInput
            style={styles.input}
            value={formData.propertyCity}
            onChangeText={(text) => setFormData({ ...formData, propertyCity: text })}
          />

          <Text style={styles.label}>Zip Code *</Text>
          <TextInput
            style={styles.input}
            value={formData.propertyZip}
            onChangeText={(text) => setFormData({ ...formData, propertyZip: text })}
            keyboardType="number-pad"
            maxLength={5}
          />

          <Text style={styles.label}>Square Feet</Text>
          <TextInput
            style={styles.input}
            value={formData.squareFeet}
            onChangeText={(text) => setFormData({ ...formData, squareFeet: text })}
            keyboardType="number-pad"
          />

          <Text style={styles.label}>Year Built</Text>
          <TextInput
            style={styles.input}
            value={formData.yearBuilt}
            onChangeText={(text) => setFormData({ ...formData, yearBuilt: text })}
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
          <TouchableOpacity 
            style={styles.dateButton}
            onPress={() => setShowDatePicker(true)}
          >
            <Ionicons name="calendar-outline" size={20} color="#007AFF" />
            <Text style={styles.dateButtonText}>
              {format(optionPeriodEnd, 'MMMM d, yyyy')}
            </Text>
          </TouchableOpacity>
          
          {showDatePicker && (
            <DateTimePicker
              value={optionPeriodEnd}
              mode="date"
              display="default"
              onChange={onDateChange}
              minimumDate={new Date()}
            />
          )}

          <Text style={styles.label}>
            If you plan on attending the inspection, what days of the week work best for you? *
          </Text>
          <View style={styles.daysContainer}>
            {DAYS_OF_WEEK.map((day) => (
              <TouchableOpacity
                key={day.value}
                style={[
                  styles.dayButton,
                  selectedDays.includes(day.value) && styles.dayButtonSelected
                ]}
                onPress={() => toggleDay(day.value)}
              >
                <Text style={[
                  styles.dayButtonText,
                  selectedDays.includes(day.value) && styles.dayButtonTextSelected
                ]}>
                  {day.name}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          <Text style={styles.saturdayNote}>
            * Normal operating days are Mon-Fri, however sometimes Saturdays are available.
          </Text>
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
    padding: 8,
    marginLeft: -8,
    minWidth: 44,
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
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
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#E5E5EA',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  dateButtonText: {
    fontSize: 16,
    color: '#1C1C1E',
    marginLeft: 12,
  },
  daysContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
  },
  dayButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E5EA',
    backgroundColor: '#fff',
  },
  dayButtonSelected: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  dayButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1C1C1E',
  },
  dayButtonTextSelected: {
    color: '#fff',
  },
  saturdayNote: {
    fontSize: 12,
    color: '#8E8E93',
    marginTop: 12,
    fontStyle: 'italic',
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
