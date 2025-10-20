import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { format } from 'date-fns';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../services/api';
import { parseDateLocal } from '../../utils/dateUtils';

interface TimeSlot {
  date: string;
  times: string[];
}

export default function SelectTimeSlotScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [inspection, setInspection] = useState<any>(null);
  const [selectedSlot, setSelectedSlot] = useState<{ date: string; time: string } | null>(null);
  const [showDeclineModal, setShowDeclineModal] = useState(false);
  const [showRequestAnotherModal, setShowRequestAnotherModal] = useState(false);

  useEffect(() => {
    fetchInspection();
  }, [id]);

  const fetchInspection = async () => {
    try {
      const response = await api.get('/inspections');
      const found = response.data.find((i: any) => i.id === id);
      if (found) {
        setInspection(found);
      } else {
        if (Platform.OS === 'web') {
          window.alert('Inspection not found');
        }
        router.back();
      }
    } catch (error) {
      console.error('Error fetching inspection:', error);
      if (Platform.OS === 'web') {
        window.alert('Failed to fetch inspection details');
      }
      router.back();
    } finally {
      setLoading(false);
    }
  };

  const handleSelectSlot = (date: string, time: string, inspector?: string, inspectorLicense?: string, inspectorPhone?: string) => {
    setSelectedSlot({ 
      date, 
      time,
      inspector,
      inspectorLicense,
      inspectorPhone
    });
  };

  const handleConfirmSelection = async () => {
    console.log('=== handleConfirmSelection CALLED ===');
    console.log('Selected slot:', selectedSlot);
    console.log('Inspection ID:', id);
    
    if (!selectedSlot) {
      console.log('No slot selected, showing alert');
      if (Platform.OS === 'web') {
        window.alert('Please select a time slot');
      }
      return;
    }

    console.log('Setting submitting to true');
    setSubmitting(true);
    
    try {
      console.log('Making API call to confirm time slot');
      console.log('URL:', `/inspections/${id}/confirm-time`);
      console.log('Payload:', {
        scheduled_date: selectedSlot.date,
        scheduled_time: selectedSlot.time,
      });
      
      const response = await api.patch(`/inspections/${id}/confirm-time`, {
        scheduled_date: selectedSlot.date,
        scheduled_time: selectedSlot.time,
      });
      
      console.log('API response received:', response.data);

      // Navigate based on user role
      if (user?.role === 'agent') {
        console.log('Agent user - navigating to dashboard');
        router.replace('/(tabs)');
        
        setTimeout(() => {
          if (Platform.OS === 'web') {
            window.alert('Inspection scheduled successfully! The customer will be notified to sign the agreement.');
          } else {
            Alert.alert('Success', 'Inspection scheduled successfully! The customer will be notified to sign the agreement.');
          }
        }, 500);
      } else {
        console.log('Customer user - navigating to tabs (will show agreement in active inspections)');
        router.replace('/(tabs)');
        
        setTimeout(() => {
          if (Platform.OS === 'web') {
            window.alert('Inspection scheduled successfully! Please sign the agreement in Active Inspections.');
          } else {
            Alert.alert('Success', 'Inspection scheduled successfully! Please sign the agreement in Active Inspections.');
          }
        }, 500);
      }

    } catch (error: any) {
      console.error('=== ERROR confirming time slot ===');
      console.error('Error object:', error);
      console.error('Error response:', error.response?.data);
      console.error('Error message:', error.message);
      setSubmitting(false);
      
      // Show error on both web and mobile
      const errorMessage = error.response?.data?.detail || 'Failed to confirm time slot. Please try again.';
      
      if (Platform.OS === 'web') {
        window.alert(errorMessage);
      } else {
        Alert.alert('Error', errorMessage);
      }
    }
  };

  const handleDecline = async () => {
    setSubmitting(true);
    try {
      // Decline the offered time slots (backend changes status back to pending_scheduling)
      await api.patch(`/inspections/${id}/decline-offered-times`);
      
      // Close modal
      setShowDeclineModal(false);
      
      // Show message
      if (Platform.OS === 'web') {
        window.alert('You have declined the offered time slots. The inspector will offer new dates.');
      }
      
      // Navigate back to pending scheduling list
      router.replace('/inspections/customer-pending-scheduling');
    } catch (error: any) {
      console.error('Error declining times:', error);
      setSubmitting(false);
      setShowDeclineModal(false);
      
      if (Platform.OS === 'web') {
        window.alert('Failed to decline. Please try again.');
      }
    }
  };

  const handleRequestAnother = () => {
    setShowRequestAnotherModal(true);
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  if (!inspection) {
    return null;
  }

  const offeredTimeSlots: TimeSlot[] = inspection.offered_time_slots || [];

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#007AFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Select Time Slot</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Property Info */}
        <View style={styles.infoCard}>
          <Text style={styles.propertyAddress}>{inspection.property_address}</Text>
          <Text style={styles.infoSubtitle}>Select your preferred date and time</Text>
        </View>

        {/* Inspector Info */}
        {inspection.inspector_name && (
          <View style={styles.inspectorCard}>
            <View style={styles.inspectorHeader}>
              <Ionicons name="person-circle" size={24} color="#007AFF" />
              <Text style={styles.inspectorTitle}>Your Inspector</Text>
            </View>
            <Text style={styles.inspectorName}>{inspection.inspector_name}</Text>
            {inspection.inspector_license && (
              <Text style={styles.inspectorDetail}>{inspection.inspector_license}</Text>
            )}
            {inspection.inspector_phone && (
              <Text style={styles.inspectorDetail}>Phone: {inspection.inspector_phone}</Text>
            )}
          </View>
        )}

        {/* Available Time Slots */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Available Time Slots:</Text>
          
          {!offeredTimeSlots || offeredTimeSlots.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>No time slots available</Text>
            </View>
          ) : (
            (() => {
              // Group slots by date for display
              const groupedSlots: { [key: string]: any[] } = {};
              offeredTimeSlots.forEach((slot: any) => {
                if (!groupedSlots[slot.date]) {
                  groupedSlots[slot.date] = [];
                }
                groupedSlots[slot.date].push(slot);
              });
              
              return Object.keys(groupedSlots).sort().map((date, index) => (
                <View key={index} style={styles.dateCard}>
                  <View style={styles.dateHeader}>
                    <Ionicons name="calendar" size={20} color="#007AFF" />
                    <Text style={styles.dateText}>
                      {format(parseDateLocal(date), 'EEEE, MMMM dd, yyyy')}
                    </Text>
                  </View>
                  
                  <View style={styles.timeSlots}>
                    {groupedSlots[date].map((slot) => {
                      const isSelected = selectedSlot?.date === slot.date && selectedSlot?.time === slot.time;
                      
                      return (
                        <TouchableOpacity
                          key={slot.time}
                          style={[
                            styles.timeSlotButton,
                            isSelected && styles.timeSlotButtonSelected
                          ]}
                          onPress={() => handleSelectSlot(slot.date, slot.time, slot.inspector, slot.inspectorLicense, slot.inspectorPhone)}
                        >
                          <View style={styles.timeSlotContent}>
                            <View style={styles.timeSlotTop}>
                              <Ionicons 
                                name={isSelected ? "checkmark-circle" : "time-outline"} 
                                size={20} 
                                color={isSelected ? "#fff" : "#007AFF"} 
                              />
                              <Text style={[
                                styles.timeSlotText,
                                isSelected && styles.timeSlotTextSelected
                              ]}>
                                {slot.time}
                              </Text>
                            </View>
                            <Text style={[
                              styles.inspectorText,
                              isSelected && styles.inspectorTextSelected
                            ]}>
                              Inspector: {slot.inspector}
                            </Text>
                          </View>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
              ));
            })()
          )}
        </View>

        {/* Action Buttons */}
        <View style={styles.actionsSection}>
          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={() => setShowDeclineModal(true)}
            disabled={submitting}
          >
            <Ionicons name="close-circle-outline" size={20} color="#FF3B30" />
            <Text style={styles.secondaryButtonText}>Decline Offer</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={handleRequestAnother}
            disabled={submitting}
          >
            <Ionicons name="call-outline" size={20} color="#007AFF" />
            <Text style={styles.secondaryButtonTextBlue}>Request Another Time</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Confirm Button */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[
            styles.confirmButton,
            (!selectedSlot || submitting) && styles.confirmButtonDisabled
          ]}
          onPress={handleConfirmSelection}
          disabled={!selectedSlot || submitting}
        >
          {submitting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Ionicons name="checkmark-circle" size={20} color="#fff" />
              <Text style={styles.confirmButtonText}>Confirm Selected Time</Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      {/* Decline Modal */}
      {showDeclineModal && (
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Decline Offer</Text>
            <Text style={styles.modalMessage}>
              Are you sure you want to decline this inspection? This action cannot be undone.
            </Text>
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.modalButtonCancel}
                onPress={() => setShowDeclineModal(false)}
                disabled={submitting}
              >
                <Text style={styles.modalButtonCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalButtonConfirm}
                onPress={handleDecline}
                disabled={submitting}
              >
                {submitting ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.modalButtonConfirmText}>Decline</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}

      {/* Request Another Time Modal */}
      {showRequestAnotherModal && (
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Ionicons name="call" size={48} color="#007AFF" style={styles.modalIcon} />
            <Text style={styles.modalTitle}>Request Another Time</Text>
            <Text style={styles.modalMessage}>
              Please call to discuss other inspection day/time options:
            </Text>
            <TouchableOpacity style={styles.phoneButton}>
              <Text style={styles.phoneNumber}>(210) 526-0673</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.modalButtonSingle}
              onPress={() => {
                setShowRequestAnotherModal(false);
                // Optionally, also move inspection back to owner's pending scheduling
                router.replace('/(tabs)');
              }}
            >
              <Text style={styles.modalButtonSingleText}>OK</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
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
  content: {
    flex: 1,
  },
  infoCard: {
    backgroundColor: '#fff',
    padding: 16,
    marginBottom: 8,
  },
  propertyAddress: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1C1C1E',
    marginBottom: 4,
  },
  infoSubtitle: {
    fontSize: 14,
    color: '#8E8E93',
  },
  inspectorCard: {
    backgroundColor: '#E3F2FD',
    padding: 16,
    marginBottom: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#007AFF',
  },
  inspectorHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  inspectorTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#007AFF',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  inspectorName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1C1C1E',
    marginBottom: 4,
  },
  inspectorDetail: {
    fontSize: 14,
    color: '#8E8E93',
    marginBottom: 2,
  },
  section: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1C1C1E',
    marginBottom: 12,
  },
  emptyState: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#8E8E93',
  },
  dateCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  dateHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F2F2F7',
  },
  dateText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1C1C1E',
    flex: 1,
  },
  timeSlots: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  timeSlotButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#007AFF',
    backgroundColor: '#fff',
  },
  timeSlotButtonSelected: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  timeSlotText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#007AFF',
  },
  timeSlotTextSelected: {
    color: '#fff',
  },
  timeSlotContent: {
    flex: 1,
    gap: 4,
  },
  timeSlotTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  inspectorText: {
    fontSize: 13,
    color: '#666',
    marginLeft: 32,
  },
  inspectorTextSelected: {
    color: '#E5E5EA',
  },
  actionsSection: {
    padding: 16,
    gap: 12,
  },
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 14,
    borderRadius: 12,
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: '#E5E5EA',
  },
  secondaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FF3B30',
  },
  secondaryButtonTextBlue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#007AFF',
  },
  footer: {
    padding: 16,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#E5E5EA',
  },
  confirmButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#34C759',
    borderRadius: 12,
    padding: 16,
  },
  confirmButtonDisabled: {
    opacity: 0.4,
  },
  confirmButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    width: '80%',
    maxWidth: 400,
  },
  modalIcon: {
    alignSelf: 'center',
    marginBottom: 12,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1C1C1E',
    marginBottom: 12,
    textAlign: 'center',
  },
  modalMessage: {
    fontSize: 16,
    color: '#8E8E93',
    marginBottom: 20,
    textAlign: 'center',
    lineHeight: 22,
  },
  phoneButton: {
    backgroundColor: '#E3F2FD',
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
  },
  phoneNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#007AFF',
    textAlign: 'center',
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  modalButtonCancel: {
    flex: 1,
    padding: 14,
    borderRadius: 12,
    backgroundColor: '#F2F2F7',
    alignItems: 'center',
  },
  modalButtonCancelText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1C1C1E',
  },
  modalButtonConfirm: {
    flex: 1,
    padding: 14,
    borderRadius: 12,
    backgroundColor: '#FF3B30',
    alignItems: 'center',
  },
  modalButtonConfirmText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  modalButtonSingle: {
    padding: 14,
    borderRadius: 12,
    backgroundColor: '#007AFF',
    alignItems: 'center',
  },
  modalButtonSingleText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
});
