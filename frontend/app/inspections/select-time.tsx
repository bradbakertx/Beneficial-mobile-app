import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { format } from 'date-fns';
import api from '../../services/api';
import { parseDateLocal } from '../../utils/dateUtils';

interface TimeSlot {
  date: string;
  times: string[];
}

export default function SelectTimeSlotScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
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

  const handleSelectSlot = (date: string, time: string) => {
    setSelectedSlot({ date, time });
  };

  const handleConfirmSelection = async () => {
    if (!selectedSlot) {
      if (Platform.OS === 'web') {
        window.alert('Please select a time slot');
      }
      return;
    }

    setSubmitting(true);
    try {
      console.log('Confirming time slot:', selectedSlot);
      
      const response = await api.patch(`/inspections/${id}/confirm-time`, {
        scheduled_date: selectedSlot.date,
        scheduled_time: selectedSlot.time,
      });
      
      console.log('Time slot confirmed:', response.data);

      // Navigate to dashboard
      router.replace('/(tabs)');

      // Show success message
      setTimeout(() => {
        if (Platform.OS === 'web') {
          window.alert('Inspection scheduled successfully! You will receive a confirmation.');
        }
      }, 500);

    } catch (error: any) {
      console.error('Error confirming time slot:', error);
      setSubmitting(false);
      
      if (Platform.OS === 'web') {
        window.alert(error.response?.data?.detail || 'Failed to confirm time slot. Please try again.');
      }
    }
  };

  const handleDecline = async () => {
    setSubmitting(true);
    try {
      // Delete the inspection
      await api.delete(`/inspections/${id}`);
      
      // Close modal
      setShowDeclineModal(false);
      
      // Show thank you message
      if (Platform.OS === 'web') {
        window.alert('Thank You for Your Time.');
      }
      
      // Navigate back to dashboard
      router.replace('/(tabs)');
    } catch (error: any) {
      console.error('Error declining inspection:', error);
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

        {/* Available Time Slots */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Available Time Slots:</Text>
          
          {offeredTimeSlots.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>No time slots available</Text>
            </View>
          ) : (
            offeredTimeSlots.map((slot, index) => (
              <View key={index} style={styles.dateCard}>
                <View style={styles.dateHeader}>
                  <Ionicons name="calendar" size={20} color="#007AFF" />
                  <Text style={styles.dateText}>
                    {format(new Date(slot.date + 'T00:00:00'), 'EEEE, MMMM dd, yyyy')}
                  </Text>
                </View>
                
                <View style={styles.timeSlots}>
                  {slot.times.map((time) => {
                    const isSelected = selectedSlot?.date === slot.date && selectedSlot?.time === time;
                    
                    return (
                      <TouchableOpacity
                        key={time}
                        style={[
                          styles.timeSlotButton,
                          isSelected && styles.timeSlotButtonSelected
                        ]}
                        onPress={() => handleSelectSlot(slot.date, time)}
                      >
                        <Ionicons 
                          name={isSelected ? "checkmark-circle" : "time-outline"} 
                          size={20} 
                          color={isSelected ? "#fff" : "#007AFF"} 
                        />
                        <Text style={[
                          styles.timeSlotText,
                          isSelected && styles.timeSlotTextSelected
                        ]}>
                          {time}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            ))
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
