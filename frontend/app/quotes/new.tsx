import React, { useState } from 'react';
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
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Picker } from '@react-native-picker/picker';
import api from '../../services/api';

export default function RequestQuoteScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [showFoundationPicker, setShowFoundationPicker] = useState(false);
  const [showPropertyPicker, setShowPropertyPicker] = useState(false);
  const [showDetachedBuildingTypePicker, setShowDetachedBuildingTypePicker] = useState(false);
  const [formData, setFormData] = useState({
    property_address: '',
    property_city: '',
    property_zip: '',
    square_feet: '',
    year_built: '',
    foundation_type: 'Please Choose',
    property_type: 'Please Choose',
    num_buildings: '',
    num_units: '',
    additional_notes: '',
    wdi_report: true,  // Pre-checked
    sprinkler_system: false,
    detached_building: false,
    detached_building_type: 'Please Choose',
    detached_building_sqft: '',
  });

  const foundationTypes = ['Please Choose', 'Slab', 'Pier & Beam'];
  
  const propertyTypes = [
    'Please Choose',
    'Single family buyer\'s inspection',
    'Single family seller\'s pre-list inspection',
    'Multi-family building inspection',
    'Commercial inspection',
  ];

  const detachedBuildingTypes = [
    'Please Choose',
    'Garage',
    'Garage Apartment',
    'Casita',
    '2nd House',
  ];

  const showBuildingFields = 
    formData.property_type === 'Multi-family building inspection' ||
    formData.property_type === 'Commercial inspection';

  const handleSubmit = async () => {
    // Validation
    if (!formData.property_address.trim()) {
      Alert.alert('Error', 'Please enter a property address');
      return;
    }
    if (!formData.property_city.trim()) {
      Alert.alert('Error', 'Please enter a city');
      return;
    }
    if (!formData.property_zip.trim()) {
      Alert.alert('Error', 'Please enter a zip code');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        property_address: formData.property_address.trim(),
        property_city: formData.property_city.trim(),
        property_zip: formData.property_zip.trim(),
        square_feet: formData.square_feet ? parseInt(formData.square_feet) : null,
        year_built: formData.year_built ? parseInt(formData.year_built) : null,
        foundation_type: formData.foundation_type,
        property_type: formData.property_type,
        num_buildings: showBuildingFields && formData.num_buildings ? parseInt(formData.num_buildings) : null,
        num_units: showBuildingFields && formData.num_units ? parseInt(formData.num_units) : null,
        additional_notes: formData.additional_notes.trim() || null,
        wdi_report: formData.wdi_report,
        sprinkler_system: formData.sprinkler_system,
        detached_building: formData.detached_building,
        detached_building_type: formData.detached_building && formData.detached_building_type !== 'Please Choose' ? formData.detached_building_type : null,
        detached_building_sqft: formData.detached_building && formData.detached_building_sqft ? formData.detached_building_sqft : null,
      };

      console.log('Submitting quote request:', payload);
      const response = await api.post('/quotes', payload);
      console.log('Quote created:', response.data);

      // Navigate immediately
      router.push('/(tabs)');
      
      // Show success message after navigation
      setTimeout(() => {
        if (Platform.OS === 'web') {
          window.alert('Your request has been submitted. We will notify you shortly with your inspection quote!');
        } else {
          Alert.alert('Success', 'Your request has been submitted. We will notify you shortly with your inspection quote!');
        }
      }, 500);
      
    } catch (error: any) {
      console.error('Error creating quote:', error);
      console.error('Error response:', error.response?.data);
      setLoading(false);
      
      if (Platform.OS === 'web') {
        window.alert(error.response?.data?.detail || 'Failed to submit quote request. Please try again.');
      } else {
        Alert.alert(
          'Error',
          error.response?.data?.detail || 'Failed to submit quote request. Please try again.'
        );
      }
    }
  };

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
          <Text style={styles.headerTitle}>Request Quote</Text>
          <View style={styles.placeholder} />
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Property Information</Text>
            
            <View style={styles.inputGroup}>
              <Text style={styles.label}>
                Address <Text style={styles.required}>*</Text>
              </Text>
              <TextInput
                style={styles.input}
                value={formData.property_address}
                onChangeText={(text) => setFormData({ ...formData, property_address: text })}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>
                City <Text style={styles.required}>*</Text>
              </Text>
              <TextInput
                style={styles.input}
                value={formData.property_city}
                onChangeText={(text) => setFormData({ ...formData, property_city: text })}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>
                Zip Code <Text style={styles.required}>*</Text>
              </Text>
              <TextInput
                style={styles.input}
                value={formData.property_zip}
                onChangeText={(text) => setFormData({ ...formData, property_zip: text })}
                keyboardType="numeric"
                maxLength={5}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Square Feet</Text>
              <TextInput
                style={styles.input}
                value={formData.square_feet}
                onChangeText={(text) => setFormData({ ...formData, square_feet: text })}
                keyboardType="numeric"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Year Built</Text>
              <TextInput
                style={styles.input}
                value={formData.year_built}
                onChangeText={(text) => setFormData({ ...formData, year_built: text })}
                keyboardType="numeric"
                maxLength={4}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>
                Foundation Type <Text style={styles.required}>*</Text>
              </Text>
              {Platform.OS === 'ios' ? (
                <>
                  <TouchableOpacity
                    style={styles.pickerButton}
                    onPress={() => setShowFoundationPicker(true)}
                  >
                    <Text style={styles.pickerButtonText}>{formData.foundation_type}</Text>
                    <Ionicons name="chevron-down" size={20} color="#8E8E93" />
                  </TouchableOpacity>

                  <Modal
                    visible={showFoundationPicker}
                    transparent={true}
                    animationType="slide"
                  >
                    <View style={styles.modalOverlay}>
                      <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                          <Text style={styles.modalTitle}>Select Foundation Type</Text>
                          <TouchableOpacity onPress={() => setShowFoundationPicker(false)}>
                            <Text style={styles.modalDone}>Done</Text>
                          </TouchableOpacity>
                        </View>
                        <Picker
                          selectedValue={formData.foundation_type}
                          onValueChange={(itemValue) =>
                            setFormData({ ...formData, foundation_type: itemValue })
                          }
                          style={styles.iosPicker}
                        >
                          {foundationTypes.map((type) => (
                            <Picker.Item key={type} label={type} value={type} />
                          ))}
                        </Picker>
                      </View>
                    </View>
                  </Modal>
                </>
              ) : (
                <View style={styles.pickerContainer}>
                  <Picker
                    selectedValue={formData.foundation_type}
                    onValueChange={(itemValue) =>
                      setFormData({ ...formData, foundation_type: itemValue })
                    }
                    style={styles.picker}
                  >
                    {foundationTypes.map((type) => (
                      <Picker.Item key={type} label={type} value={type} />
                    ))}
                  </Picker>
                </View>
              )}
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>
                Property Type <Text style={styles.required}>*</Text>
              </Text>
              {Platform.OS === 'ios' ? (
                <>
                  <TouchableOpacity
                    style={styles.pickerButton}
                    onPress={() => setShowPropertyPicker(true)}
                  >
                    <Text style={styles.pickerButtonText}>{formData.property_type}</Text>
                    <Ionicons name="chevron-down" size={20} color="#8E8E93" />
                  </TouchableOpacity>

                  <Modal
                    visible={showPropertyPicker}
                    transparent={true}
                    animationType="slide"
                  >
                    <View style={styles.modalOverlay}>
                      <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                          <Text style={styles.modalTitle}>Select Property Type</Text>
                          <TouchableOpacity onPress={() => setShowPropertyPicker(false)}>
                            <Text style={styles.modalDone}>Done</Text>
                          </TouchableOpacity>
                        </View>
                        <Picker
                          selectedValue={formData.property_type}
                          onValueChange={(itemValue) =>
                            setFormData({ ...formData, property_type: itemValue })
                          }
                          style={styles.iosPicker}
                        >
                          {propertyTypes.map((type) => (
                            <Picker.Item key={type} label={type} value={type} />
                          ))}
                        </Picker>
                      </View>
                    </View>
                  </Modal>
                </>
              ) : (
                <View style={styles.pickerContainer}>
                  <Picker
                    selectedValue={formData.property_type}
                    onValueChange={(itemValue) =>
                      setFormData({ ...formData, property_type: itemValue })
                    }
                    style={styles.picker}
                  >
                    {propertyTypes.map((type) => (
                      <Picker.Item key={type} label={type} value={type} />
                    ))}
                  </Picker>
                </View>
              )}
            </View>

            {showBuildingFields && (
              <>
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Number of Buildings</Text>
                  <TextInput
                    style={styles.input}
                    value={formData.num_buildings}
                    onChangeText={(text) => setFormData({ ...formData, num_buildings: text })}
                    keyboardType="numeric"
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Number of Units</Text>
                  <TextInput
                    style={styles.input}
                    value={formData.num_units}
                    onChangeText={(text) => setFormData({ ...formData, num_units: text })}
                    keyboardType="numeric"
                  />
                </View>
              </>
            )}
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Additional</Text>
            <Text style={styles.subText}>
              We include a WDI inspection at no charge when we do a home inspection. WDI inspections are performed under Sergeants Termite and Pest Control - TDA SPCS #5940
            </Text>
            
            {/* WDI Report Checkbox */}
            <TouchableOpacity
              style={styles.checkboxRow}
              onPress={() => setFormData({ ...formData, wdi_report: !formData.wdi_report })}
            >
              <View style={styles.checkbox}>
                {formData.wdi_report && (
                  <Ionicons name="checkmark" size={18} color="#007AFF" />
                )}
              </View>
              <Text style={styles.checkboxLabel}>WDI (wood destroying insect) Report</Text>
            </TouchableOpacity>
            
            {/* Sprinkler System Checkbox */}
            <TouchableOpacity
              style={styles.checkboxRow}
              onPress={() => setFormData({ ...formData, sprinkler_system: !formData.sprinkler_system })}
            >
              <View style={styles.checkbox}>
                {formData.sprinkler_system && (
                  <Ionicons name="checkmark" size={18} color="#007AFF" />
                )}
              </View>
              <Text style={styles.checkboxLabel}>Sprinkler System</Text>
            </TouchableOpacity>
            
            {/* Detached Building Checkbox */}
            <TouchableOpacity
              style={styles.checkboxRow}
              onPress={() => setFormData({ ...formData, detached_building: !formData.detached_building })}
            >
              <View style={styles.checkbox}>
                {formData.detached_building && (
                  <Ionicons name="checkmark" size={18} color="#007AFF" />
                )}
              </View>
              <Text style={styles.checkboxLabel}>Detached Building</Text>
            </TouchableOpacity>
            
            {/* Detached Building Details - Show only if checked */}
            {formData.detached_building && (
              <View style={styles.detachedBuildingDetails}>
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Detached Building Type</Text>
                  {Platform.OS === 'ios' ? (
                    <>
                      <TouchableOpacity
                        style={styles.pickerButton}
                        onPress={() => setShowDetachedBuildingTypePicker(true)}
                      >
                        <Text style={styles.pickerButtonText}>{formData.detached_building_type}</Text>
                        <Ionicons name="chevron-down" size={20} color="#8E8E93" />
                      </TouchableOpacity>

                      <Modal
                        visible={showDetachedBuildingTypePicker}
                        transparent={true}
                        animationType="slide"
                      >
                        <View style={styles.modalOverlay}>
                          <View style={styles.modalContent}>
                            <View style={styles.modalHeader}>
                              <Text style={styles.modalTitle}>Select Building Type</Text>
                              <TouchableOpacity onPress={() => setShowDetachedBuildingTypePicker(false)}>
                                <Text style={styles.modalDone}>Done</Text>
                              </TouchableOpacity>
                            </View>
                            <Picker
                              selectedValue={formData.detached_building_type}
                              onValueChange={(itemValue) =>
                                setFormData({ ...formData, detached_building_type: itemValue })
                              }
                              style={styles.iosPicker}
                            >
                              {detachedBuildingTypes.map((type) => (
                                <Picker.Item key={type} label={type} value={type} />
                              ))}
                            </Picker>
                          </View>
                        </View>
                      </Modal>
                    </>
                  ) : (
                    <View style={styles.pickerContainer}>
                      <Picker
                        selectedValue={formData.detached_building_type}
                        onValueChange={(itemValue) =>
                          setFormData({ ...formData, detached_building_type: itemValue })
                        }
                        style={styles.picker}
                      >
                        {detachedBuildingTypes.map((type) => (
                          <Picker.Item key={type} label={type} value={type} />
                        ))}
                      </Picker>
                    </View>
                  )}
                </View>
                
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Detached Building Square Feet</Text>
                  <TextInput
                    style={styles.input}
                    value={formData.detached_building_sqft}
                    onChangeText={(text) => setFormData({ ...formData, detached_building_sqft: text })}
                    keyboardType="numeric"
                  />
                </View>
              </View>
            )}
            
            {/* Additional Notes Text Area */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Additional Notes (Optional)</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={formData.additional_notes}
                onChangeText={(text) => setFormData({ ...formData, additional_notes: text })}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />
            </View>
          </View>
        </ScrollView>

        <View style={styles.footer}>
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
                <Text style={styles.submitButtonText}>Submit Request</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
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
    zIndex: 10,
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
  content: {
    flex: 1,
  },
  section: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1C1C1E',
    marginBottom: 16,
  },
  subText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
    lineHeight: 20,
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    paddingVertical: 8,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#007AFF',
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  checkboxLabel: {
    fontSize: 16,
    color: '#1C1C1E',
    flex: 1,
  },
  detachedBuildingDetails: {
    marginLeft: 36,
    marginTop: 8,
    marginBottom: 16,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1C1C1E',
    marginBottom: 8,
  },
  required: {
    color: '#FF3B30',
  },
  input: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    fontSize: 16,
    color: '#1C1C1E',
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  textArea: {
    minHeight: 100,
  },
  pickerContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E5EA',
    overflow: 'hidden',
  },
  picker: {
    height: 50,
    color: '#1C1C1E',
  },
  pickerButton: {
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E5EA',
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  pickerButtonText: {
    fontSize: 16,
    color: '#1C1C1E',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 40,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1C1C1E',
  },
  modalDone: {
    fontSize: 16,
    fontWeight: '600',
    color: '#007AFF',
  },
  iosPicker: {
    width: '100%',
  },
  footer: {
    padding: 16,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#E5E5EA',
  },
  submitButton: {
    backgroundColor: '#007AFF',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
