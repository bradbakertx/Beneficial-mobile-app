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
  const [modalContent, setModalContent] = useState<{ title: string; content: string; type?: string }>({
    title: '',
    content: '',
    type: '',
  });

  const openModal = (type: 'inspection' | 'about' | 'testimonials') => {
    let title = '';
    let content = '';

    switch (type) {
      case 'inspection':
        title = 'What Does Your Inspection Cover?';
        content = `What a Beneficial Home Inspection Covers

A Beneficial Home Inspection is a comprehensive, top-to-bottom evaluation of a property's structural and mechanical systems. We inspect every major component — inside and out — to give you a clear picture of the home's condition.

Roof

We always prefer to walk the roof for a close, hands-on inspection.
If the roof is unsafe or inaccessible, we'll fly a drone to capture detailed photos.
Walking the roof is always our best practice whenever possible.

Attic

We enter accessible attic spaces to evaluate:

• Roof framing and structure
• Insulation levels
• Ductwork
• Ventilation and moisture control

Structure

Inside the home, we check walls, ceilings, floors, doors, windows, and closets for signs of:

• Stress or movement
• Settlement or structural repairs
• Moisture stains or damage

Outside the home, we examine siding, trim, window and door openings, flashings, grading, drainage, porches, and driveways for issues that could affect performance or durability.

HVAC (Heating & Cooling)

We inspect the installation, operation, and performance of the HVAC system.
This includes checking for proper airflow, temperature control, and equipment condition.

Plumbing

We run a lot of water during our inspections — not just to test faucets, but to evaluate the entire drainage system.
We look for leaks, slow drains, and any signs of backup or poor flow.

Electrical

We perform a detailed inspection of the electrical system, including:

• Removing panel box covers to check wire and breaker sizes for proper matching
• Testing every accessible outlet for correct polarity and grounding
• Reviewing visible junction boxes and connections for proper installation and safety

Foundation

Our foundation evaluation is based on the big picture, not just one sign.
We look for indications of movement, settlement, or performance issues by assessing all related systems and symptoms throughout the home.

The Purpose of a Home Inspection

A home inspection is not a pass/fail test — it's a condition report designed to give you the knowledge and confidence to make informed decisions about your home purchase or maintenance.`;
        break;
      case 'about':
        title = 'About Beneficial Inspections Inc.';
        content = `About Beneficial Inspections

Beneficial Inspections, Inc. was founded in 2004 by Brad Baker with a simple goal — to provide homebuyers and homeowners with clear, honest, and thorough inspections they can trust.

We're a family-owned and operated business. My wife, Kristi, and I started Beneficial Inspections right here in San Antonio, and from the beginning, we knew we wanted to serve more than just one city. Over the years, we've expanded to cover surrounding communities including Boerne, Spring Branch, Bulverde, New Braunfels, Seguin, La Vernia, Floresville, Pleasanton, Jourdanton, Lytle, Castroville, and Helotes.

For more than two decades, we've watched the real estate industry grow, change, fall, and rise again — and through it all, we've stayed committed to one thing: helping people make confident, informed decisions about their homes.

We're proud of the reputation we've built and excited to see what comes next for Beneficial Inspections and the communities we serve.`;
        break;
      case 'testimonials':
        title = 'Testimonials';
        content = ''; // Content will be handled differently
        break;
    }

    setModalContent({ title, content, type });
    setModalVisible(true);
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={true}
      >
        {/* Logo Banner - No spacing, full width */}
        <View style={styles.logoBanner}>
          <Image
            source={{ uri: 'https://customer-assets.emergentagent.com/job_profile-update-10/artifacts/n12x5753_beneficial_inspections_inc_large-edit-20251018231819.jpg' }}
            style={styles.logo}
            resizeMode="contain"
          />
        </View>

        {/* Background Image with Content */}
        <ImageBackground
          source={require('../assets/images/san-antonio-houses.jpg')}
          style={styles.backgroundImage}
          imageStyle={{ opacity: 0.45 }}
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
      </ScrollView>

      {/* Floating Swipe Indicator - Always visible at bottom */}
      <View style={styles.floatingIndicatorContainer}>
        <View style={styles.indicatorOvalBackground}>
          <View style={styles.indicatorDot} />
          <View style={styles.indicatorDotEmpty} />
          <Ionicons name="chevron-forward" size={16} color="#007AFF" style={styles.swipeIcon} />
        </View>
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
            {modalContent.type === 'testimonials' ? (
              <View style={styles.testimonialsContainer}>
                {/* Testimonial 1 */}
                <View style={styles.testimonialCard}>
                  <Text style={styles.testimonialAuthor}>John Russo wrote:</Text>
                  <Text style={styles.testimonialCategories}>Timeliness, Customer service, Quality</Text>
                  <Text style={styles.testimonialText}>
                    Brad was professional, informative and did a great job on the inspection. The inspection report was thorough and completed in the same day as the inspection which helped me give repair requests early. Very happy with his services.
                  </Text>
                </View>

                {/* Testimonial 2 */}
                <View style={styles.testimonialCard}>
                  <Text style={styles.testimonialAuthor}>Ned Wolf wrote:</Text>
                  <Text style={styles.testimonialCategories}>Quality, Customer service</Text>
                  <Text style={styles.testimonialText}>
                    Good summaries, and worth the money.
                  </Text>
                </View>

                {/* Testimonial 3 */}
                <View style={styles.testimonialCard}>
                  <Text style={styles.testimonialAuthor}>Shirley GodinezMartinez wrote:</Text>
                  <Text style={styles.testimonialCategories}>Quality, Offerings, Customer service, Timeliness</Text>
                  <Text style={styles.testimonialText}>
                    Brad is very professional and extremely good at inspections. Any questions you may have will be answered by him. The inspections he performs are extensive for the soon to be homeowner.
                  </Text>
                </View>

                {/* Testimonial 4 */}
                <View style={styles.testimonialCard}>
                  <Text style={styles.testimonialAuthor}>Darliece Green wrote:</Text>
                  <Text style={styles.testimonialCategories}>Timeliness, Customer service, Quality</Text>
                  <Text style={styles.testimonialText}>
                    Brad you're very personable, professional and knowledgeable. Thank you very much for your honesty. Darliece Green.
                  </Text>
                </View>

                {/* Testimonial 5 */}
                <View style={styles.testimonialCard}>
                  <Text style={styles.testimonialAuthor}>Francisca Waite wrote:</Text>
                  <Text style={styles.testimonialCategories}>Timeliness, Customer service, Quality</Text>
                  <Text style={styles.testimonialText}>
                    Brad is very friendly, communicative and thorough. We would definitely recommend Brad's services.
                  </Text>
                </View>

                {/* Testimonial 6 */}
                <View style={styles.testimonialCard}>
                  <Text style={styles.testimonialAuthor}>Adriana R Cabrera wrote:</Text>
                  <Text style={styles.testimonialCategories}>Quality, Customer service, Timeliness</Text>
                  <Text style={styles.testimonialText}>
                    Bo was very efficient. Very informative and kind. Really appreciate all the information he provided to us.
                  </Text>
                </View>

                {/* Testimonial 7 */}
                <View style={styles.testimonialCard}>
                  <Text style={styles.testimonialAuthor}>Teresa Perez wrote:</Text>
                  <Text style={styles.testimonialCategories}>Timeliness, Quality, Customer service</Text>
                  <Text style={styles.testimonialText}>
                    Very informative and professional. Honest and thorough. Great customer service and seemed to care about us as customers.
                  </Text>
                </View>

                {/* Testimonial 8 */}
                <View style={styles.testimonialCard}>
                  <Text style={styles.testimonialAuthor}>William Hawk wrote:</Text>
                  <Text style={styles.testimonialCategories}>Quality, Customer service, Timeliness</Text>
                  <Text style={styles.testimonialText}>
                    Very prompt & gave great explaination when further needed. Would certainly recommend any chance given.
                  </Text>
                </View>

                {/* Testimonial 9 */}
                <View style={styles.testimonialCard}>
                  <Text style={styles.testimonialAuthor}>Kristina Perry wrote:</Text>
                  <Text style={styles.testimonialCategories}>Timeliness, Customer service, Offerings, Other, Quality</Text>
                  <Text style={styles.testimonialText}>
                    Thorough quality inspections...Brad's the right guy if you want to have a good inspection.
                  </Text>
                </View>

                {/* Testimonial 10 */}
                <View style={styles.testimonialCard}>
                  <Text style={styles.testimonialAuthor}>Ryan O wrote:</Text>
                  <Text style={styles.testimonialText}>
                    I could not have been more pleased with the service I received. I read tons of reviews on different inspectors before I made the decision to go with Beneficial Inspections, Inc. The reviews were mixed and usually posts from both ends of the spectrum but nothing really in the middle (I think a lot of this depends on if you are the buyer or the seller).{'\n\n'}
                    Brad gave me the option to join him as he went through the house or let him go about it by himself and he would explain later - I chose the latter. He took photographs of everything and documented the details of the areas where there were problems in a way that I could understand. He explained to me areas that needed to be fixed, areas that were identified as "problems" but were standard practice for builders (usually for aesthetic reasons), etc. This was exceptionally helpful when putting together the work order requests for my builder (before my one year warranty was up).{'\n\n'}
                    Before he left he reminded me that I could call him at any time if I had questions about anything, if I needed a recommendation or guidance on getting something fixed, etc.{'\n\n'}
                    Bottom line: Great guy. Excellent service. And someone I will hire in the future when in need of an inspection.
                  </Text>
                </View>
              </View>
            ) : (
              <Text style={styles.modalText}>{modalContent.content}</Text>
            )}
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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  logoBanner: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 8,
    alignItems: 'center',
  },
  logo: {
    width: width - 16,
    height: 200,
  },
  backgroundImage: {
    minHeight: height - 250,
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
  testimonialsContainer: {
    gap: 16,
  },
  testimonialCard: {
    borderWidth: 1,
    borderColor: '#D1D1D6',
    borderRadius: 12,
    padding: 16,
    backgroundColor: '#FFFFFF',
  },
  testimonialAuthor: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1C1C1E',
    marginBottom: 6,
  },
  testimonialCategories: {
    fontSize: 13,
    fontWeight: '500',
    color: '#8E8E93',
    marginBottom: 8,
    fontStyle: 'italic',
  },
  testimonialText: {
    fontSize: 14,
    lineHeight: 20,
    color: '#1C1C1E',
  },
});
