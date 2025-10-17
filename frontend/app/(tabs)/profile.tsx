import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Platform,
  Image,
  ActionSheetIOS,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../contexts/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import api from '../../services/api';

export default function ProfileScreen() {
  const { user, logout, updateUser } = useAuth();
  const router = useRouter();
  const [showLogoutConfirm, setShowLogoutConfirm] = React.useState(false);
  const [uploadingImage, setUploadingImage] = React.useState(false);

  const handleImagePicker = async () => {
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: ['Cancel', 'Take Photo', 'Choose from Library'],
          cancelButtonIndex: 0,
        },
        async (buttonIndex) => {
          if (buttonIndex === 1) {
            await takePhoto();
          } else if (buttonIndex === 2) {
            await pickImage();
          }
        }
      );
    } else {
      Alert.alert(
        'Profile Picture',
        'Choose an option',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Take Photo', onPress: takePhoto },
          { text: 'Choose from Library', onPress: pickImage },
        ]
      );
    }
  };

  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Required', 'Camera permission is needed to take photos');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.5,
    });

    if (!result.canceled) {
      await uploadProfilePicture(result.assets[0].uri);
    }
  };

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Required', 'Photo library permission is needed');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.5,
    });

    if (!result.canceled) {
      await uploadProfilePicture(result.assets[0].uri);
    }
  };

  const uploadProfilePicture = async (uri: string) => {
    try {
      setUploadingImage(true);
      
      // Create form data
      const formData = new FormData();
      const filename = uri.split('/').pop() || 'profile.jpg';
      const match = /\.(\w+)$/.exec(filename);
      const type = match ? `image/${match[1]}` : 'image/jpeg';
      
      formData.append('file', {
        uri,
        name: filename,
        type,
      } as any);

      // Upload to backend
      const response = await api.post('/users/profile-picture', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      // Refresh user data from backend to get the new profile picture
      const userResponse = await api.get('/auth/me');
      if (userResponse.data) {
        updateUser(userResponse.data);
        Alert.alert('Success', 'Profile picture updated successfully');
      }
    } catch (error: any) {
      console.error('Error uploading profile picture:', error);
      Alert.alert('Error', error.response?.data?.detail || 'Failed to upload profile picture');
    } finally {
      setUploadingImage(false);
    }
  };

  const handleLogout = () => {
    console.log('=== LOGOUT BUTTON PRESSED ===');
    setShowLogoutConfirm(true);
  };

  const confirmLogout = async () => {
    try {
      console.log('Starting logout process...');
      setShowLogoutConfirm(false);
      await logout();
      console.log('Logout completed, state cleared');
      
      // Navigate directly to login screen
      router.replace('/(auth)/login');
    } catch (error) {
      console.error('Logout error:', error);
      Alert.alert('Error', 'Failed to logout. Please try again.');
    }
  };

  const cancelLogout = () => {
    console.log('Logout cancelled');
    setShowLogoutConfirm(false);
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <View style={styles.avatarContainer}>
            <View style={styles.avatar}>
              {user?.profile_picture ? (
                <Image 
                  source={{ uri: user.profile_picture }} 
                  style={styles.avatarImage}
                  onError={(e) => {
                    console.log('Profile picture load error:', e.nativeEvent.error);
                    // If image fails to load, show initials instead
                    updateUser({ profile_picture: undefined });
                  }}
                />
              ) : (
                <Text style={styles.avatarText}>
                  {user?.name?.charAt(0).toUpperCase()}
                </Text>
              )}
            </View>
            <TouchableOpacity 
              style={styles.editIconContainer}
              onPress={handleImagePicker}
              disabled={uploadingImage}
            >
              <Ionicons 
                name={uploadingImage ? "hourglass-outline" : "pencil"} 
                size={16} 
                color="#FFF" 
              />
            </TouchableOpacity>
          </View>
          <Text style={styles.name}>{user?.name}</Text>
          <Text style={styles.email}>{user?.email}</Text>
          <View style={styles.roleBadge}>
            <Text style={styles.roleBadgeText}>{user?.role?.toUpperCase()}</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account</Text>
          
          <TouchableOpacity 
            style={styles.menuItem}
            onPress={() => router.push('/profile/edit-profile')}
          >
            <View style={styles.menuIconContainer}>
              <Ionicons name="person-outline" size={20} color="#007AFF" />
            </View>
            <Text style={styles.menuText}>Edit Profile</Text>
            <Ionicons name="chevron-forward" size={20} color="#C7C7CC" />
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.menuItem}
            onPress={() => router.push('/profile/change-password')}
          >
            <View style={styles.menuIconContainer}>
              <Ionicons name="lock-closed-outline" size={20} color="#007AFF" />
            </View>
            <Text style={styles.menuText}>Change Password</Text>
            <Ionicons name="chevron-forward" size={20} color="#C7C7CC" />
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Preferences</Text>
          
          <TouchableOpacity 
            style={styles.menuItem}
            onPress={() => router.push('/profile/notifications')}
          >
            <View style={styles.menuIconContainer}>
              <Ionicons name="notifications-outline" size={20} color="#007AFF" />
            </View>
            <Text style={styles.menuText}>Notifications</Text>
            <Ionicons name="chevron-forward" size={20} color="#C7C7CC" />
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Support</Text>
          
          <TouchableOpacity 
            style={styles.menuItem}
            onPress={() => router.push('/profile/contact-us')}
          >
            <View style={styles.menuIconContainer}>
              <Ionicons name="mail-outline" size={20} color="#007AFF" />
            </View>
            <Text style={styles.menuText}>Contact Us</Text>
            <Ionicons name="chevron-forward" size={20} color="#C7C7CC" />
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.menuItem}
            onPress={() => router.push('/profile/terms-of-service')}
          >
            <View style={styles.menuIconContainer}>
              <Ionicons name="document-text-outline" size={20} color="#007AFF" />
            </View>
            <Text style={styles.menuText}>Terms of Service</Text>
            <Ionicons name="chevron-forward" size={20} color="#C7C7CC" />
          </TouchableOpacity>
        </View>
            <Text style={styles.menuText}>Terms of Service</Text>
            <Ionicons name="chevron-forward" size={20} color="#C7C7CC" />
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={20} color="#FF3B30" />
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>

        <Text style={styles.version}>Version 1.0.0</Text>
      </ScrollView>

      {/* Custom Logout Confirmation Modal */}
      {showLogoutConfirm && (
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Logout</Text>
            <Text style={styles.modalMessage}>Are you sure you want to logout?</Text>
            <View style={styles.modalButtons}>
              <TouchableOpacity style={styles.modalButtonCancel} onPress={cancelLogout}>
                <Text style={styles.modalButtonCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalButtonConfirm} onPress={confirmLogout}>
                <Text style={styles.modalButtonConfirmText}>Logout</Text>
              </TouchableOpacity>
            </View>
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
  scrollContent: {
    padding: 16,
  },
  header: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 16,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  avatarText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
  },
  editIconContainer: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#007AFF',
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFF',
  },
  name: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1C1C1E',
    marginBottom: 4,
  },
  email: {
    fontSize: 14,
    color: '#8E8E93',
    marginBottom: 12,
  },
  roleBadge: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 12,
  },
  roleBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#8E8E93',
    marginBottom: 12,
    marginLeft: 4,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
  },
  menuIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F2F2F7',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  menuContent: {
    flex: 1,
  },
  menuText: {
    flex: 1,
    fontSize: 16,
    color: '#1C1C1E',
  },
  menuValue: {
    fontSize: 14,
    color: '#8E8E93',
    marginTop: 2,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginTop: 16,
    borderWidth: 1,
    borderColor: '#FF3B30',
  },
  logoutText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FF3B30',
    marginLeft: 8,
  },
  version: {
    textAlign: 'center',
    fontSize: 12,
    color: '#8E8E93',
    marginTop: 24,
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
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
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
    marginBottom: 24,
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
});
