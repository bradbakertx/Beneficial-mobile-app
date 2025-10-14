import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Picker } from '@react-native-picker/picker';
import api from '../../services/api';

const FOUNDATION_TYPES = ['Slab', 'Pier & Beam'];
const PROPERTY_TYPES = [
  'Single family buyer\'s inspection',
  'Single family seller\'s pre-list inspection',
  'Multi-family building inspection',
  'Commercial inspection',
];

export default function EditInspectionScreen() {
  const router = useRouter();
  const { id, isManual } = useLocalSearchParams();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // Form fields
  const [clientName, setClientName] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [agentName, setAgentName] = useState('');
  const [agentPhone, setAgentPhone] = useState('');
  const [agentEmail, setAgentEmail] = useState('');
  const [propertyAddress, setPropertyAddress] = useState('');
  const [propertyCity, setPropertyCity] = useState('');
  const [propertyZip, setPropertyZip] = useState('');
  const [squareFeet, setSquareFeet] = useState('');
  const [yearBuilt, setYearBuilt] = useState('');
  const [foundationType, setFoundationType] = useState(FOUNDATION_TYPES[0]);
  const [propertyType, setPropertyType] = useState(PROPERTY_TYPES[0]);
  const [numBuildings, setNumBuildings] = useState('');
  const [numUnits, setNumUnits] = useState('');
  const [feeAmount, setFeeAmount] = useState('');
  const [inspectionDate, setInspectionDate] = useState('');
  const [inspectionTime, setInspectionTime] = useState('');

  useEffect(() => {
    fetchInspectionData();
  }, [id]);

  const fetchInspectionData = async () => {
    try {
      if (isManual === 'true') {
        const response = await api.get(`/admin/manual-inspection/${id}`);
        const data = response.data;
        
        setClientName(data.client_name || '');
        setClientPhone(data.client_phone || '');
        setClientEmail(data.client_email || '');
        setAgentName(data.agent_name || '');
        setAgentPhone(data.agent_phone || '');
        setAgentEmail(data.agent_email || '');
        setPropertyAddress(data.property_address || '');
        setPropertyCity(data.property_city || '');
        setPropertyZip(data.property_zip || '');
        setSquareFeet(data.square_feet?.toString() || '');
        setYearBuilt(data.year_built?.toString() || '');
        setFoundationType(data.foundation_type || FOUNDATION_TYPES[0]);
        setPropertyType(data.property_type || PROPERTY_TYPES[0]);
        setNumBuildings(data.num_buildings?.toString() || '');
        setNumUnits(data.num_units?.toString() || '');
        setFeeAmount(data.fee_amount?.toString() || '');
        setInspectionDate(data.inspection_date || '');
        setInspectionTime(data.inspection_time || '');
      } else {
        // Regular inspection - get quote data for property details
        const response = await api.get(`/inspections/${id}`);
        const data = response.data;
        
        setClientName(data.customer_name || '');
        setClientEmail(data.customer_email || '');
        setAgentName(data.agent_name || '');
        setAgentEmail(data.agent_email || '');
        setAgentPhone(data.agent_phone || '');
        setPropertyAddress(data.property_address || '');
        setSquareFeet(data.square_feet?.toString() || '');
        setYearBuilt(data.year_built?.toString() || '');
        setFoundationType(data.foundation_type || FOUNDATION_TYPES[0]);
        setPropertyType(data.property_type || PROPERTY_TYPES[0]);
        setInspectionDate(data.scheduled_date || '');
        setInspectionTime(data.scheduled_time || '');
      }
    } catch (error) {
      console.error('Error fetching inspection:', error);
      Alert.alert('Error', 'Failed to load inspection data');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    console.log('=== SAVE BUTTON PRESSED ===');
    
    // Basic validation
    if (!clientName.trim()) {
      if (Platform.OS === 'web') {
        alert('Client name is required');
      } else {
        Alert.alert('Error', 'Client name is required');
      }
      return;
    }

    setSaving(true);
    try {
      const payload = {
        client_name: clientName.trim(),
        client_phone: clientPhone.trim() || null,
        client_email: clientEmail.trim() || null,
        agent_name: agentName.trim() || null,
        agent_phone: agentPhone.trim() || null,
        agent_email: agentEmail.trim() || null,
        property_address: propertyAddress.trim() || null,
        property_city: propertyCity.trim() || null,
        property_zip: propertyZip.trim() || null,
        square_feet: squareFeet.trim() ? parseInt(squareFeet) : null,
        year_built: yearBuilt.trim() ? parseInt(yearBuilt) : null,
        foundation_type: foundationType,
        property_type: propertyType,
        num_buildings: numBuildings.trim() ? parseInt(numBuildings) : null,
        num_units: numUnits.trim() ? parseInt(numUnits) : null,
        fee_amount: feeAmount.trim() ? parseFloat(feeAmount) : null,
        inspection_date: inspectionDate.trim() || null,
        inspection_time: inspectionTime.trim() || null,
      };

      console.log('Updating inspection with payload:', payload);
      const response = await api.patch(`/admin/manual-inspection/${id}`, payload);
      console.log('Update successful:', response.data);

      // Navigate immediately without alert on web
      if (Platform.OS === 'web') {
        alert('Inspection updated successfully!');
        // Use replace to force a fresh load
        router.replace('/inspections/active');
      } else {
        Alert.alert(
          'Success',
          'Inspection updated successfully',
          [{ text: 'OK', onPress: () => router.replace('/inspections/active') }]
        );
      }
    } catch (error: any) {
      console.error('Error updating inspection:', error);
      console.error('Error details:', error.response?.data);
      
      if (Platform.OS === 'web') {
        alert(`Error: ${error.response?.data?.detail || 'Failed to update inspection'}`);
      } else {
        Alert.alert('Error', error.response?.data?.detail || 'Failed to update inspection');
      }
    } finally {
      setSaving(false);
    }
  };

  const isMultiFamilyOrCommercial = () => {
    return propertyType.includes('Multi-family') || propertyType.includes('Commercial');
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator size="large" color="#007AFF" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#007AFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Edit Inspection</Text>
          <View style={styles.placeholder} />
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          <Text style={styles.sectionTitle}>Client Information</Text>
          
          <Text style={styles.label}>Name *</Text>
          <TextInput
            style={styles.input}
            placeholder="John Doe"
            value={clientName}
            onChangeText={setClientName}
          />

          <Text style={styles.label}>Phone Number</Text>
          <TextInput
            style={styles.input}
            placeholder="(555) 123-4567"
            value={clientPhone}
            onChangeText={setClientPhone}
            keyboardType="phone-pad"
          />

          <Text style={styles.label}>Email Address</Text>
          <TextInput
            style={styles.input}
            placeholder="john@example.com"
            value={clientEmail}
            onChangeText={setClientEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />

          <Text style={styles.sectionTitle}>Agent Information</Text>
          
          <Text style={styles.label}>Name</Text>
          <TextInput
            style={styles.input}
            placeholder="Jane Smith"
            value={agentName}
            onChangeText={setAgentName}
          />

          <Text style={styles.label}>Phone Number</Text>
          <TextInput
            style={styles.input}
            placeholder="(555) 987-6543"
            value={agentPhone}
            onChangeText={setAgentPhone}
            keyboardType="phone-pad"
          />

          <Text style={styles.label}>Email Address</Text>
          <TextInput
            style={styles.input}
            placeholder="jane@realty.com"
            value={agentEmail}
            onChangeText={setAgentEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />

          <Text style={styles.sectionTitle}>Property Information</Text>
          
          <Text style={styles.label}>Address</Text>
          <TextInput
            style={styles.input}
            placeholder="123 Main St"
            value={propertyAddress}
            onChangeText={setPropertyAddress}
          />

          <View style={styles.row}>
            <View style={styles.halfWidth}>
              <Text style={styles.label}>City</Text>
              <TextInput
                style={styles.input}
                placeholder="Austin"
                value={propertyCity}
                onChangeText={setPropertyCity}
              />
            </View>

            <View style={styles.halfWidth}>
              <Text style={styles.label}>Zip Code</Text>
              <TextInput
                style={styles.input}
                placeholder="78701"
                value={propertyZip}
                onChangeText={setPropertyZip}
                keyboardType="numeric"
              />
            </View>
          </View>

          <View style={styles.row}>
            <View style={styles.halfWidth}>
              <Text style={styles.label}>Square Feet</Text>
              <TextInput
                style={styles.input}
                placeholder="2000"
                value={squareFeet}
                onChangeText={setSquareFeet}
                keyboardType="numeric"
              />
            </View>

            <View style={styles.halfWidth}>
              <Text style={styles.label}>Year Built</Text>
              <TextInput
                style={styles.input}
                placeholder="2010"
                value={yearBuilt}
                onChangeText={setYearBuilt}
                keyboardType="numeric"
              />
            </View>
          </View>

          <Text style={styles.label}>Foundation Type</Text>
          <View style={styles.pickerContainer}>
            <Picker
              selectedValue={foundationType}
              onValueChange={setFoundationType}
              style={styles.picker}
            >
              {FOUNDATION_TYPES.map((type) => (
                <Picker.Item key={type} label={type} value={type} />
              ))}
            </Picker>
          </View>

          <Text style={styles.label}>Property Type</Text>
          <View style={styles.pickerContainer}>
            <Picker
              selectedValue={propertyType}
              onValueChange={setPropertyType}
              style={styles.picker}
            >
              {PROPERTY_TYPES.map((type) => (
                <Picker.Item key={type} label={type} value={type} />
              ))}
            </Picker>
          </View>

          {isMultiFamilyOrCommercial() && (
            <>
              <View style={styles.row}>
                <View style={styles.halfWidth}>
                  <Text style={styles.label}>Number of Buildings</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="1"
                    value={numBuildings}
                    onChangeText={setNumBuildings}
                    keyboardType="numeric"
                  />
                </View>

                <View style={styles.halfWidth}>
                  <Text style={styles.label}>Number of Units</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="4"
                    value={numUnits}
                    onChangeText={setNumUnits}
                    keyboardType="numeric"
                  />
                </View>
              </View>
            </>
          )}

          <Text style={styles.sectionTitle}>Inspection Details</Text>
          
          <Text style={styles.label}>Fee Amount</Text>
          <TextInput
            style={styles.input}
            placeholder="450.00"
            value={feeAmount}
            onChangeText={setFeeAmount}
            keyboardType="decimal-pad"
          />

          <View style={styles.row}>
            <View style={styles.halfWidth}>
              <Text style={styles.label}>Inspection Date</Text>
              <TextInput
                style={styles.input}
                placeholder="2025-06-15"
                value={inspectionDate}
                onChangeText={setInspectionDate}
              />
            </View>

            <View style={styles.halfWidth}>
              <Text style={styles.label}>Inspection Time</Text>
              <TextInput
                style={styles.input}
                placeholder="10:00 AM"
                value={inspectionTime}
                onChangeText={setInspectionTime}
              />
            </View>
          </View>

          <TouchableOpacity
            style={[styles.saveButton, saving && styles.saveButtonDisabled]}
            onPress={handleSave}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Ionicons name="checkmark-circle" size={20} color="#fff" />
                <Text style={styles.saveButtonText}>Save Changes</Text>
              </>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  keyboardView: {
    flex: 1,
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
  content: {
    flex: 1,
    padding: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1C1C1E',
    marginTop: 16,
    marginBottom: 12,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1C1C1E',
    marginBottom: 6,
    marginTop: 8,
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
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  halfWidth: {
    flex: 1,
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
  saveButton: {
    backgroundColor: '#007AFF',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 24,
    marginBottom: 16,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
