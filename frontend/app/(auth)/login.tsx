import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
  Alert,
  Image,
  Linking,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../../contexts/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';

const BIOMETRIC_CREDENTIALS_KEY = 'biometric_credentials';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [stayLoggedIn, setStayLoggedIn] = useState(true); // Default to true for convenience
  const [loading, setLoading] = useState(false);
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [biometricEnabled, setBiometricEnabled] = useState(false);
  const [biometricType, setBiometricType] = useState<string>('');
  const { login } = useAuth();
  const router = useRouter();

  useEffect(() => {
    checkBiometricAvailability();
  }, []);

  const checkBiometricAvailability = async () => {
    try {
      const compatible = await LocalAuthentication.hasHardwareAsync();
      const enrolled = await LocalAuthentication.isEnrolledAsync();
      const available = compatible && enrolled;
      
      setBiometricAvailable(available);

      if (available) {
        // Check what type of biometric is available
        const types = await LocalAuthentication.supportedAuthenticationTypesAsync();
        if (types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) {
          setBiometricType('Face ID');
        } else if (types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) {
          setBiometricType('Fingerprint');
        } else if (types.includes(LocalAuthentication.AuthenticationType.IRIS)) {
          setBiometricType('Iris');
        } else {
          setBiometricType('Biometric');
        }

        // Check if user has biometric credentials saved
        const credentials = await SecureStore.getItemAsync(BIOMETRIC_CREDENTIALS_KEY);
        setBiometricEnabled(!!credentials);
      }
    } catch (error) {
      console.error('Biometric check error:', error);
    }
  };

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    setLoading(true);
    try {
      await login(email.toLowerCase().trim(), password, stayLoggedIn);
      
      // After successful login, ask if they want to enable biometric login
      if (biometricAvailable && !biometricEnabled) {
        Alert.alert(
          'Enable Biometric Login?',
          `Would you like to use ${biometricType} for faster login next time?`,
          [
            {
              text: 'No Thanks',
              style: 'cancel',
              onPress: () => router.replace('/(tabs)')
            },
            {
              text: 'Enable',
              onPress: async () => {
                await saveBiometricCredentials(email.toLowerCase().trim(), password);
                router.replace('/(tabs)');
              }
            }
          ]
        );
      } else {
        router.replace('/(tabs)');
      }
    } catch (error: any) {
      Alert.alert('Login Failed', error.message);
    } finally {
      setLoading(false);
    }
  };

  const saveBiometricCredentials = async (email: string, password: string) => {
    try {
      const credentials = JSON.stringify({ email, password });
      await SecureStore.setItemAsync(BIOMETRIC_CREDENTIALS_KEY, credentials);
      setBiometricEnabled(true);
      Alert.alert('Success', `${biometricType} login enabled!`);
    } catch (error) {
      console.error('Error saving biometric credentials:', error);
      Alert.alert('Error', 'Failed to enable biometric login');
    }
  };

  const handleBiometricLogin = async () => {
    try {
      // Authenticate with biometrics
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Login with biometrics',
        fallbackLabel: 'Use password',
        cancelLabel: 'Cancel',
      });

      if (result.success) {
        // Retrieve stored credentials
        const credentialsJson = await SecureStore.getItemAsync(BIOMETRIC_CREDENTIALS_KEY);
        if (credentialsJson) {
          const { email, password } = JSON.parse(credentialsJson);
          setLoading(true);
          try {
            await login(email, password, true);
            router.replace('/(tabs)');
          } catch (error: any) {
            Alert.alert('Login Failed', error.message);
          } finally {
            setLoading(false);
          }
        }
      } else {
        // Authentication cancelled or failed
        if (result.error === 'user_cancel') {
          // User cancelled, do nothing
        } else {
          Alert.alert('Authentication Failed', 'Please try again or use your password');
        }
      }
    } catch (error) {
      console.error('Biometric login error:', error);
      Alert.alert('Error', 'Biometric authentication failed');
    }
  };

  const disableBiometricLogin = async () => {
    Alert.alert(
      'Disable Biometric Login',
      `Are you sure you want to disable ${biometricType} login?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Disable',
          style: 'destructive',
          onPress: async () => {
            await SecureStore.deleteItemAsync(BIOMETRIC_CREDENTIALS_KEY);
            setBiometricEnabled(false);
            Alert.alert('Disabled', 'Biometric login has been disabled');
          }
        }
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.header}>
            <Image 
              source={{ uri: 'https://customer-assets.emergentagent.com/job_inspect-scheduler/artifacts/dzdr8ijd_beneficial_inspections_inc_large.jpg' }}
              style={styles.logo}
              resizeMode="contain"
            />
          </View>

          <View style={styles.form}>
            <View style={styles.inputContainer}>
              <Ionicons name="mail-outline" size={20} color="#666" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
                placeholder="Email Address"
                placeholderTextColor="#999"
              />
            </View>

            <View style={styles.inputContainer}>
              <Ionicons name="lock-closed-outline" size={20} color="#666" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                placeholder="Password"
                placeholderTextColor="#999"
              />
              <TouchableOpacity
                onPress={() => setShowPassword(!showPassword)}
                style={styles.eyeIcon}
              >
                <Ionicons
                  name={showPassword ? 'eye-outline' : 'eye-off-outline'}
                  size={20}
                  color="#666"
                />
              </TouchableOpacity>
            </View>

            <View style={styles.optionsRow}>
              <TouchableOpacity
                style={styles.checkboxContainer}
                onPress={() => setStayLoggedIn(!stayLoggedIn)}
              >
                <View style={[styles.checkbox, stayLoggedIn && styles.checkboxChecked]}>
                  {stayLoggedIn && (
                    <Ionicons name="checkmark" size={16} color="#fff" />
                  )}
                </View>
                <Text style={styles.checkboxLabel}>Stay logged in</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => router.push('/(auth)/forgot-password')}
                disabled={loading}
              >
                <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={[styles.button, loading && styles.buttonDisabled]}
              onPress={handleLogin}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.buttonText}>Login</Text>
              )}
            </TouchableOpacity>

            {/* Biometric Login Button */}
            {biometricEnabled && (
              <TouchableOpacity
                style={styles.biometricButton}
                onPress={handleBiometricLogin}
                disabled={loading}
              >
                <Ionicons 
                  name={biometricType === 'Face ID' ? 'scan' : 'finger-print'} 
                  size={24} 
                  color="#007AFF" 
                />
                <Text style={styles.biometricButtonText}>
                  Login with {biometricType}
                </Text>
              </TouchableOpacity>
            )}

            {/* Disable Biometric Option */}
            {biometricEnabled && (
              <TouchableOpacity
                onPress={disableBiometricLogin}
                style={styles.disableBiometricButton}
              >
                <Text style={styles.disableBiometricText}>
                  Disable {biometricType} Login
                </Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              onPress={() => router.push('/(auth)/register')}
              style={styles.linkButton}
            >
              <Text style={styles.linkText}>
                Don't have an account? <Text style={styles.linkTextBold}>Sign Up</Text>
              </Text>
            </TouchableOpacity>
          </View>

          {/* Footer */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>
              Beneficial Inspections Inc - Brad Baker TREC Lic #7522 since 2004
            </Text>
            <TouchableOpacity
              onPress={() => Linking.openURL('https://www.trec.texas.gov/sites/default/files/pdf-forms/CN%201-5_0.pdf')}
            >
              <Text style={styles.footerLink}>
                Texas Real Estate Commission Consumer Protection Notice
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 32,
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
  },
  logo: {
    width: 800,
    height: 280,
    marginBottom: 8,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginTop: 16,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginTop: 8,
  },
  form: {
    width: '100%',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    marginBottom: 16,
    paddingHorizontal: 16,
    height: 56,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#1a1a1a',
  },
  eyeIcon: {
    padding: 4,
  },
  optionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    marginBottom: 4,
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  checkboxChecked: {
    backgroundColor: '#007AFF',
  },
  checkboxLabel: {
    fontSize: 15,
    color: '#1a1a1a',
  },
  forgotPasswordText: {
    fontSize: 15,
    color: '#007AFF',
    fontWeight: '500',
  },
  button: {
    backgroundColor: '#007AFF',
    borderRadius: 12,
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  biometricButton: {
    flexDirection: 'row',
    backgroundColor: '#F0F7FF',
    borderWidth: 2,
    borderColor: '#007AFF',
    borderRadius: 12,
    padding: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 16,
    gap: 8,
  },
  biometricButtonText: {
    color: '#007AFF',
    fontSize: 16,
    fontWeight: '600',
  },
  disableBiometricButton: {
    marginTop: 12,
    alignItems: 'center',
    padding: 8,
  },
  disableBiometricText: {
    fontSize: 13,
    color: '#666',
    textDecorationLine: 'underline',
  },
  linkButton: {
    marginTop: 24,
    alignItems: 'center',
  },
  linkText: {
    fontSize: 14,
    color: '#666',
  },
  linkTextBold: {
    color: '#007AFF',
    fontWeight: '600',
  },
  footer: {
    marginTop: 24,
    paddingTop: 16,
    paddingBottom: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E5EA',
    alignItems: 'center',
  },
  footerText: {
    fontSize: 13,
    color: '#666',
    textAlign: 'center',
    marginBottom: 8,
    fontWeight: '500',
  },
  footerLink: {
    fontSize: 11,
    color: '#007AFF',
    textAlign: 'center',
    textDecorationLine: 'underline',
  },
});
