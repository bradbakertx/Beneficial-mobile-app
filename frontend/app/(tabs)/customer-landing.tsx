import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ImageBackground,
  Modal,
  ScrollView,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

const { width, height } = Dimensions.get('window');

interface LandingScreenProps {
  onNavigateToDashboard: () => void;
}

export default function CustomerLandingScreen({ onNavigateToDashboard }: LandingScreenProps) {
  const [modalVisible, setModalVisible] = useState(false);
  const [modalContent, setModalContent] = useState<{ title: string; content: string }>({
    title: '',
    content: '',
  });

  const openModal = (type: 'inspection' | 'about' | 'testimonials') => {
    let title = '';
    let content = '';

    switch (type) {
      case 'inspection':
        title = 'What Does Your Inspection Cover?';
        content = 'Your comprehensive home inspection includes a thorough evaluation of the property\'s structure, systems, and components. [Content will be provided by owner]';
        break;
      case 'about':
        title = 'About Beneficial Inspections Inc.';
        content = 'Beneficial Inspections Inc. is a trusted name in home inspection services. [Content will be provided by owner]';
        break;
      case 'testimonials':
        title = 'Testimonials';
        content = '"Great service and thorough inspection!" - [Testimonials will be provided by owner]';
        break;
    }

    setModalContent({ title, content });
    setModalVisible(true);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Logo Section */}
      <View style={styles.logoContainer}>
        <View style={styles.logoBackground}>
          <Image
            source={require('../../assets/beneficial-logo-full.jpg')}
            style={styles.logo}
            resizeMode="contain"
          />
        </View>
      </View>

      {/* Background Image with Content */}
      <ImageBackground
        source={require('../../assets/san-antonio-houses.jpg')}
        style={styles.backgroundImage}
        imageStyle={{ opacity: 0.18 }}
      >
        <View style={styles.contentContainer}>
          {/* Note Card */}
          <View style={styles.noteCard}>
            <Text style={styles.noteText}>
              Beneficial Inspections, Inc. realizes there are several options when choosing your
              inspector. We are happy to serve you and help you make intelligent decisions in the
              process of buying or selling your home or property.
            </Text>
          </View>

          {/* Buttons */}
          <View style={styles.buttonsContainer}>
            <TouchableOpacity
              style={styles.button}
              onPress={() => openModal('inspection')}
              activeOpacity={0.8}
            >
              <Text style={styles.buttonText}>What Does Your Inspection Cover?</Text>
              <Ionicons name="chevron-forward" size={20} color="#1C1C1E" />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.button}
              onPress={() => openModal('about')}
              activeOpacity={0.8}
            >
              <Text style={styles.buttonText}>About Beneficial Inspections Inc.</Text>
              <Ionicons name="chevron-forward" size={20} color="#1C1C1E" />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.button}
              onPress={() => openModal('testimonials')}
              activeOpacity={0.8}
            >
              <Text style={styles.buttonText}>Testimonials</Text>
              <Ionicons name="chevron-forward" size={20} color="#1C1C1E" />
            </TouchableOpacity>
          </View>
        </View>
      </ImageBackground>

      {/* Swipe Indicator */}
      <View style={styles.indicatorContainer}>
        <View style={styles.indicatorDot} />
        <View style={styles.indicatorDotEmpty} />
        <Ionicons name="chevron-forward" size={16} color="#8E8E93" style={styles.swipeIcon} />
      </View>

      {/* Modal for Content */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setModalVisible(false)}
      >
        <SafeAreaView style={styles.modalContainer} edges={['top']}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.closeButton}>
              <Ionicons name="close" size={28} color="#007AFF" />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>{modalContent.title}</Text>
            <View style={styles.placeholder} />
          </View>

          <ScrollView style={styles.modalScroll} contentContainerStyle={styles.modalContent}>
            <Text style={styles.modalText}>{modalContent.content}</Text>
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  logoContainer: {
    paddingHorizontal: 8,
    paddingTop: 16,
    paddingBottom: 8,
  },
  logoBackground: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  logo: {
    width: width - 48,
    height: 80,
  },
  backgroundImage: {
    flex: 1,
    width: '100%',
  },
  contentContainer: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 24,
    paddingBottom: 80,
  },
  noteCard: {
    backgroundColor: '#FFD700',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
  },
  noteText: {
    fontSize: 16,
    lineHeight: 24,
    color: '#1C1C1E',
    textAlign: 'center',
    fontWeight: '500',
  },
  buttonsContainer: {
    gap: 16,
  },
  button: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1C1C1E',
    flex: 1,
  },
  indicatorContainer: {
    position: 'absolute',
    bottom: 32,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  indicatorDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#007AFF',
  },
  indicatorDotEmpty: {
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#007AFF',
    backgroundColor: 'transparent',
  },
  swipeIcon: {
    marginLeft: 4,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  closeButton: {
    padding: 4,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1C1C1E',
    flex: 1,
    textAlign: 'center',
    paddingHorizontal: 8,
  },
  placeholder: {
    width: 36,
  },
  modalScroll: {
    flex: 1,
  },
  modalContent: {
    padding: 24,
  },
  modalText: {
    fontSize: 16,
    lineHeight: 24,
    color: '#1C1C1E',
  },
});
