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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Picker } from '@react-native-picker/picker';
import api from '../../services/api';

export default function RequestQuoteScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    property_address: '',
    property_city: '',
    property_zip: '',
    square_feet: '',
    year_built: '',
    foundation_type: 'Slab',
    property_type: 'Single family buyer\'s inspection',
    num_buildings: '',
    num_units: '',
    additional_notes: '',
  });

  const foundationTypes = ['Slab', 'Pier & Beam'];
  
  const propertyTypes = [
    'Single family buyer\'s inspection',
    'Single family seller\'s pre-list inspection',
    'Multi-family building inspection',
    'Commercial inspection',
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
                placeholder="123 Main St"
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
                placeholder="Austin"
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
                placeholder="78701"
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
                placeholder="2000"
                value={formData.square_feet}
                onChangeText={(text) => setFormData({ ...formData, square_feet: text })}
                keyboardType="numeric"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Year Built</Text>
              <TextInput
                style={styles.input}
                placeholder="2010"
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
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>
                Property Type <Text style={styles.required}>*</Text>
              </Text>
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
            </View>

            {showBuildingFields && (
              <>
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Number of Buildings</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="1"
                    value={formData.num_buildings}
                    onChangeText={(text) => setFormData({ ...formData, num_buildings: text })}
                    keyboardType="numeric"
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Number of Units</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="4"
                    value={formData.num_units}
                    onChangeText={(text) => setFormData({ ...formData, num_units: text })}
                    keyboardType="numeric"
                  />
                </View>
              </>
            )}
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Additional Notes</Text>
            <View style={styles.inputGroup}>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Any specific concerns or requirements..."
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
