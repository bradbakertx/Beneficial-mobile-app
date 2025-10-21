import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Picker } from '@react-native-picker/picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import api from '../services/api';
import { format } from 'date-fns';

const FOUNDATION_TYPES = ['Slab', 'Pier & Beam'];

const PROPERTY_TYPES = [
  'Single family buyer\'s inspection',
  'Single family seller\'s pre-list inspection',
  'Multi-family building inspection',
  'Commercial inspection',
];

export default function ManualInspectionEntry() {
  const [expanded, setExpanded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [inspectors, setInspectors] = useState<any[]>([]);
  const [loadingInspectors, setLoadingInspectors] = useState(false);
  
  // Client Information
  const [clientName, setClientName] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  
  // Agent Information
  const [agentName, setAgentName] = useState('');
  const [agentPhone, setAgentPhone] = useState('');
  const [agentEmail, setAgentEmail] = useState('');
  
  // Property Information
  const [propertyAddress, setPropertyAddress] = useState('');
  const [propertyCity, setPropertyCity] = useState('');
  const [propertyZip, setPropertyZip] = useState('');
  const [squareFeet, setSquareFeet] = useState('');
  const [yearBuilt, setYearBuilt] = useState('');
  const [foundationType, setFoundationType] = useState(FOUNDATION_TYPES[0]);
  const [propertyType, setPropertyType] = useState(PROPERTY_TYPES[0]);
  const [numBuildings, setNumBuildings] = useState('');
  const [numUnits, setNumUnits] = useState('');
  
  // Additional Section
  const [wdiReport, setWdiReport] = useState(true); // Pre-checked
  const [sprinklerSystem, setSprinklerSystem] = useState(false);
  const [detachedBuilding, setDetachedBuilding] = useState(false);
  const [detachedBuildingType, setDetachedBuildingType] = useState('');
  const [detachedBuildingSqFt, setDetachedBuildingSqFt] = useState('');
  
  // Inspection Details
  const [selectedInspector, setSelectedInspector] = useState(-1);
  const [feeAmount, setFeeAmount] = useState('');
  const [inspectionDate, setInspectionDate] = useState('');
  const [inspectionTime, setInspectionTime] = useState('');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());

  // Fetch inspectors when component mounts
  React.useEffect(() => {
    fetchInspectors();
  }, []);

  const fetchInspectors = async () => {
    try {
      setLoadingInspectors(true);
      const response = await api.get('/users/inspectors');
      setInspectors(response.data.inspectors || []);
    } catch (error) {
      console.error('Error fetching inspectors:', error);
    } finally {
      setLoadingInspectors(false);
    }
  };

  const isMultiFamilyOrCommercial = () => {
    return propertyType.includes('Multi-family') || propertyType.includes('Commercial');
  };

  const resetForm = () => {
    setClientName('');
    setClientPhone('');
    setClientEmail('');
    setAgentName('');
    setAgentPhone('');
    setAgentEmail('');
    setPropertyAddress('');
    setPropertyCity('');
    setPropertyZip('');
    setSquareFeet('');
    setYearBuilt('');
    setFoundationType(FOUNDATION_TYPES[0]);
    setPropertyType(PROPERTY_TYPES[0]);
    setNumBuildings('');
    setNumUnits('');
    setWdiReport(true);
    setSprinklerSystem(false);
    setDetachedBuilding(false);
    setDetachedBuildingType('');
    setDetachedBuildingSqFt('');
    setSelectedInspector(-1);
    setFeeAmount('');
    setInspectionDate('');
    setInspectionTime('');
  };

  const validateForm = () => {
    if (!clientName.trim()) return 'Client name is required';
    if (!clientPhone.trim()) return 'Client phone is required';
    if (!clientEmail.trim()) return 'Client email is required';
    if (!propertyAddress.trim()) return 'Property address is required';
    if (!propertyCity.trim()) return 'City is required';
    if (!propertyZip.trim()) return 'Zip code is required';
    if (selectedInspector === -1) return 'Please select an inspector';
    if (!feeAmount.trim()) return 'Fee amount is required';
    if (!inspectionDate.trim()) return 'Inspection date is required';
    if (!inspectionTime.trim()) return 'Inspection time is required';
    
    if (isMultiFamilyOrCommercial()) {
      if (!numBuildings.trim()) return 'Number of buildings is required';
      if (!numUnits.trim()) return 'Number of units is required';
    }
    
    if (detachedBuilding) {
      if (!detachedBuildingType.trim()) return 'Detached building type is required';
      if (!detachedBuildingSqFt.trim()) return 'Detached building sq ft is required';
    }
    
    return null;
  };

  const handleSubmit = async () => {
    const error = validateForm();
    if (error) {
      Alert.alert('Validation Error', error);
      return;
    }

    setLoading(true);
    try {
      const selectedInspectorData = inspectors[selectedInspector];
      
      const payload = {
        client_name: clientName.trim(),
        customer_phone: clientPhone.trim(),
        client_email: clientEmail.trim(),
        agent_name: agentName.trim() || null,
        agent_phone: agentPhone.trim() || null,
        agent_email: agentEmail.trim() || null,
        property_address: propertyAddress.trim(),
        property_city: propertyCity.trim(),
        property_zip: propertyZip.trim(),
        square_feet: squareFeet.trim() ? parseInt(squareFeet) : null,
        year_built: yearBuilt.trim() ? parseInt(yearBuilt) : null,
        foundation_type: foundationType,
        property_type: propertyType,
        num_buildings: isMultiFamilyOrCommercial() && numBuildings ? parseInt(numBuildings) : null,
        num_units: isMultiFamilyOrCommercial() && numUnits ? parseInt(numUnits) : null,
        wdi_report: wdiReport,
        sprinkler_system: sprinklerSystem,
        detached_building: detachedBuilding,
        detached_building_type: detachedBuilding ? detachedBuildingType.trim() : null,
        detached_building_sqft: detachedBuilding && detachedBuildingSqFt ? detachedBuildingSqFt.trim() : null,
        inspector_name: selectedInspectorData.name,
        inspector_email: selectedInspectorData.email,
        inspector_license: selectedInspectorData.license_number || '',
        fee_amount: parseFloat(feeAmount),
        inspection_date: inspectionDate.trim(),
        inspection_time: inspectionTime.trim(),
      };

      console.log('Submitting manual inspection:', payload);
      const response = await api.post('/admin/manual-inspection', payload);
      console.log('Manual inspection created:', response.data);

      Alert.alert(
        'Success',
        'Manual inspection entry created successfully!',
        [{ text: 'OK', onPress: () => {
          resetForm();
          setExpanded(false);
        }}]
      );
    } catch (error: any) {
      console.error('Error creating manual inspection:', error);
      Alert.alert('Error', error.response?.data?.detail || 'Failed to create inspection entry');
    } finally {
      setLoading(false);
    }
  };

  if (!expanded) {
    return (
      <TouchableOpacity style={styles.collapsedContainer} onPress={() => setExpanded(true)}>
        <View style={styles.collapsedHeader}>
          <Ionicons name="clipboard-outline" size={24} color="#007AFF" />
          <Text style={styles.collapsedTitle}>Manual Inspection Entry</Text>
          <Ionicons name="chevron-down" size={20} color="#8E8E93" />
        </View>
        <Text style={styles.collapsedSubtitle}>
          Add inspection for phone or walk-in customers
        </Text>
      </TouchableOpacity>
    );
  }

  return (
    <View style={styles.expandedContainer}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Ionicons name="clipboard" size={24} color="#007AFF" />
          <Text style={styles.headerTitle}>Manual Inspection Entry</Text>
        </View>
        <TouchableOpacity onPress={() => setExpanded(false)}>
          <Ionicons name="chevron-up" size={24} color="#8E8E93" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.formScroll} showsVerticalScrollIndicator={false}>
        {/* Client Information */}
        <Text style={styles.sectionTitle}>Client Information</Text>
        
        <Text style={styles.label}>Name *</Text>
        <TextInput
          style={styles.input}
          placeholder=""
          value={clientName}
          onChangeText={setClientName}
        />

        <Text style={styles.label}>Phone Number *</Text>
        <TextInput
          style={styles.input}
          placeholder=""
          value={clientPhone}
          onChangeText={setClientPhone}
          keyboardType="phone-pad"
        />

        <Text style={styles.label}>Email Address *</Text>
        <TextInput
          style={styles.input}
          placeholder=""
          value={clientEmail}
          onChangeText={setClientEmail}
          keyboardType="email-address"
          autoCapitalize="none"
        />

        {/* Agent Information */}
        <Text style={styles.sectionTitle}>Agent Information (Optional)</Text>
        
        <Text style={styles.label}>Name</Text>
        <TextInput
          style={styles.input}
          placeholder=""
          value={agentName}
          onChangeText={setAgentName}
        />

        <Text style={styles.label}>Phone Number</Text>
        <TextInput
          style={styles.input}
          placeholder=""
          value={agentPhone}
          onChangeText={setAgentPhone}
          keyboardType="phone-pad"
        />

        <Text style={styles.label}>Email Address</Text>
        <TextInput
          style={styles.input}
          placeholder=""
          value={agentEmail}
          onChangeText={setAgentEmail}
          keyboardType="email-address"
          autoCapitalize="none"
        />

        {/* Property Information */}
        <Text style={styles.sectionTitle}>Property Information</Text>
        
        <Text style={styles.label}>Address *</Text>
        <TextInput
          style={styles.input}
          placeholder=""
          value={propertyAddress}
          onChangeText={setPropertyAddress}
        />

        <View style={styles.row}>
          <View style={styles.halfWidth}>
            <Text style={styles.label}>City *</Text>
            <TextInput
              style={styles.input}
              placeholder=""
              value={propertyCity}
              onChangeText={setPropertyCity}
            />
          </View>

          <View style={styles.halfWidth}>
            <Text style={styles.label}>Zip Code *</Text>
            <TextInput
              style={styles.input}
              placeholder=""
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
              placeholder=""
              value={squareFeet}
              onChangeText={setSquareFeet}
              keyboardType="numeric"
            />
          </View>

          <View style={styles.halfWidth}>
            <Text style={styles.label}>Year Built</Text>
            <TextInput
              style={styles.input}
              placeholder=""
              value={yearBuilt}
              onChangeText={setYearBuilt}
              keyboardType="numeric"
            />
          </View>
        </View>

        <Text style={styles.label}>Foundation Type *</Text>
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

        <Text style={styles.label}>Property Type *</Text>
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
                <Text style={styles.label}>Number of Buildings *</Text>
                <TextInput
                  style={styles.input}
                  placeholder=""
                  value={numBuildings}
                  onChangeText={setNumBuildings}
                  keyboardType="numeric"
                />
              </View>

              <View style={styles.halfWidth}>
                <Text style={styles.label}>Number of Units *</Text>
                <TextInput
                  style={styles.input}
                  placeholder=""
                  value={numUnits}
                  onChangeText={setNumUnits}
                  keyboardType="numeric"
                />
              </View>
            </View>
          </>
        )}

        {/* Additional Section */}
        <Text style={styles.sectionTitle}>Additional</Text>

        <TouchableOpacity 
          style={styles.checkboxRow}
          onPress={() => setWdiReport(!wdiReport)}
          activeOpacity={0.7}
        >
          <View style={[styles.checkbox, wdiReport && styles.checkboxChecked]}>
            {wdiReport && <Ionicons name="checkmark" size={16} color="#fff" />}
          </View>
          <Text style={styles.checkboxLabel}>WDI Report</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.checkboxRow}
          onPress={() => setSprinklerSystem(!sprinklerSystem)}
          activeOpacity={0.7}
        >
          <View style={[styles.checkbox, sprinklerSystem && styles.checkboxChecked]}>
            {sprinklerSystem && <Ionicons name="checkmark" size={16} color="#fff" />}
          </View>
          <Text style={styles.checkboxLabel}>Sprinkler System</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.checkboxRow}
          onPress={() => setDetachedBuilding(!detachedBuilding)}
          activeOpacity={0.7}
        >
          <View style={[styles.checkbox, detachedBuilding && styles.checkboxChecked]}>
            {detachedBuilding && <Ionicons name="checkmark" size={16} color="#fff" />}
          </View>
          <Text style={styles.checkboxLabel}>Detached Building</Text>
        </TouchableOpacity>

        {detachedBuilding && (
          <>
            <Text style={styles.label}>Detached Building Type</Text>
            <TextInput
              style={styles.input}
              placeholder=""
              value={detachedBuildingType}
              onChangeText={setDetachedBuildingType}
            />

            <Text style={styles.label}>Detached Building Sq Ft</Text>
            <TextInput
              style={styles.input}
              placeholder=""
              value={detachedBuildingSqFt}
              onChangeText={setDetachedBuildingSqFt}
              keyboardType="numeric"
            />
          </>
        )}

        {/* Inspection Details */}
        <Text style={styles.sectionTitle}>Inspection Details</Text>
        
        <Text style={styles.label}>Inspector *</Text>
        <View style={styles.pickerContainer}>
          <Picker
            selectedValue={selectedInspector}
            onValueChange={(value) => setSelectedInspector(value)}
            style={styles.picker}
          >
            <Picker.Item label="Please Choose" value={-1} />
            {inspectors.map((inspector, idx) => (
              <Picker.Item 
                key={idx} 
                label={`${inspector.name}${inspector.license_number ? ' - ' + inspector.license_number : ''}`} 
                value={idx} 
              />
            ))}
          </Picker>
        </View>
        
        <Text style={styles.label}>Fee Amount *</Text>
        <TextInput
          style={styles.input}
          placeholder=""
          value={feeAmount}
          onChangeText={setFeeAmount}
          keyboardType="decimal-pad"
        />

        <View style={styles.row}>
          <View style={styles.halfWidth}>
            <Text style={styles.label}>Inspection Date *</Text>
            <TouchableOpacity 
              style={styles.datePickerButton}
              onPress={() => setShowDatePicker(true)}
              activeOpacity={0.7}
            >
              <Ionicons name="calendar-outline" size={24} color="#007AFF" />
              <Text style={styles.dateText}>
                {inspectionDate || 'Select Date'}
              </Text>
            </TouchableOpacity>

            {showDatePicker && (
              <DateTimePicker
                value={selectedDate}
                mode="date"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                onChange={(event, date) => {
                  setShowDatePicker(Platform.OS === 'ios' ? showDatePicker : false);
                  if (date) {
                    setSelectedDate(date);
                    setInspectionDate(format(date, 'yyyy-MM-dd'));
                  }
                }}
              />
            )}
          </View>

          <View style={styles.halfWidth}>
            <Text style={styles.label}>Inspection Time *</Text>
            <TextInput
              style={styles.input}
              placeholder=""
              value={inspectionTime}
              onChangeText={setInspectionTime}
            />
          </View>
        </View>

        <TouchableOpacity
          style={[styles.submitButton, loading && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Ionicons name="checkmark-circle" size={20} color="#fff" />
              <Text style={styles.submitButtonText}>Create Inspection Entry</Text>
            </>
          )}
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  collapsedContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginTop: 16,
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  collapsedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  collapsedTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '600',
    color: '#1C1C1E',
  },
  collapsedSubtitle: {
    fontSize: 14,
    color: '#8E8E93',
    marginTop: 4,
    marginLeft: 36,
  },
  expandedContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginTop: 16,
    borderWidth: 1,
    borderColor: '#E5E5EA',
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1C1C1E',
  },
  formScroll: {
    flex: 1,
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
    backgroundColor: '#F9F9F9',
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
    backgroundColor: '#F9F9F9',
    borderWidth: 1,
    borderColor: '#E5E5EA',
    borderRadius: 8,
    overflow: 'hidden',
  },
  picker: {
    height: 50,
  },
  submitButton: {
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
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  additionalSubtext: {
    fontSize: 13,
    color: '#666',
    lineHeight: 18,
    marginBottom: 12,
    fontStyle: 'italic',
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#C7C7CC',
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  checkboxChecked: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  checkboxLabel: {
    fontSize: 15,
    color: '#333',
  },
  datePickerButton: {
    backgroundColor: '#F9F9F9',
    borderWidth: 1,
    borderColor: '#E5E5EA',
    borderRadius: 8,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dateText: {
    fontSize: 16,
    color: '#1C1C1E',
    flex: 1,
  },
});
