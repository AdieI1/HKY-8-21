import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  ImageBackground,
  useWindowDimensions,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { register } from '../services/api';
import ErrorModal from '../components/ErrorModal';
import SweetToast from '../components/SweetToast';
import TermsModal from '../components/TermsModal';
import PasswordStrengthMeter, { getPasswordStrength } from '../components/PasswordStrengthMeter';

const bg = require('../assets/images/mobileTruckBackground.png');

export default function CreateAccount() {
  const router = useRouter();
  const { width, height } = useWindowDimensions();

  const [showPass, setShowPass] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [accepted, setAccepted] = useState(true);

  const [submitting, setSubmitting] = useState(false);

  // Modals & feedback
  const [errorModal, setErrorModal] = useState({ visible: false, message: '' });
  const [showTerms, setShowTerms] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  const validateEmail = (val) => {
    return /\S+@\S+\.\S+/.test(val);
  };

  const handleCreateAccount = async () => {
    const trimmedEmail = email.trim();

    if (!trimmedEmail) {
      setErrorModal({
        visible: true,
        message: 'Please enter your email address to continue.',
      });
      return;
    }

    if (!validateEmail(trimmedEmail)) {
      setErrorModal({
        visible: true,
        message: 'Please enter a valid email address (e.g. name@gmail.com).',
      });
      return;
    }

    if (!password) {
      setErrorModal({
        visible: true,
        message: 'Please enter a secure password.',
      });
      return;
    }

    if (password.length < 8) {
      setErrorModal({
        visible: true,
        message: 'Password must be at least 8 characters long.',
      });
      return;
    }

    const { score } = getPasswordStrength(password);
    if (score < 2) {
      setErrorModal({
        visible: true,
        message: 'Please choose a stronger password containing numbers and letters.',
      });
      return;
    }

    if (password !== confirmPassword) {
      setErrorModal({
        visible: true,
        message: 'Passwords do not match. Please re-enter your confirm password.',
      });
      return;
    }

    if (!accepted) {
      setErrorModal({
        visible: true,
        message: 'Please agree to the Terms and Agreements to create an account.',
      });
      return;
    }

    try {
      setSubmitting(true);
      // Auto-derive username from email on the backend
      const data = await register('', trimmedEmail, password, confirmPassword);

      setToastMessage('Account created! A 6-digit code was sent to your email.');

      setTimeout(() => {
        router.push({
          pathname: '/email-verification',
          params: {
            email: trimmedEmail,
          },
        });
      }, 1200);
    } catch (error) {
      setErrorModal({
        visible: true,
        message: error?.message || 'Unable to create your account. Please check your details.',
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ImageBackground source={bg} style={styles.background} blurRadius={6}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardView}
        >
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {/* Back Button */}
            <TouchableOpacity
              onPress={() => router.back()}
              style={styles.backBtn}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            >
              <Ionicons name="arrow-back" size={32} color="#fff" />
            </TouchableOpacity>

            <View style={styles.formContainer}>
              {/* Header */}
              <Text style={styles.title}>Create your{'\n'}Account.</Text>
              <Text style={styles.subtitle}>
                You’re just one step away from becoming one of our valued customers.
              </Text>

              {/* Email Address */}
              <View style={styles.inputWrapper}>
                <TextInput
                  placeholder="Email Address"
                  placeholderTextColor="#888"
                  style={styles.inputFlex}
                  value={email}
                  onChangeText={setEmail}
                  autoCapitalize="none"
                  keyboardType="email-address"
                />
              </View>

              {/* Password */}
              <View style={styles.inputWrapper}>
                <TextInput
                  placeholder="Password"
                  placeholderTextColor="#888"
                  secureTextEntry={!showPass}
                  style={styles.inputFlex}
                  value={password}
                  onChangeText={setPassword}
                  autoCapitalize="none"
                />
                <TouchableOpacity
                  onPress={() => setShowPass(!showPass)}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Ionicons
                    name={showPass ? 'eye-outline' : 'eye-off-outline'}
                    size={22}
                    color="#aaa"
                  />
                </TouchableOpacity>
              </View>

              {/* Password Strength Meter */}
              <PasswordStrengthMeter password={password} />

              {/* Confirm Password */}
              <View style={styles.inputWrapper}>
                <TextInput
                  placeholder="Confirm Password"
                  placeholderTextColor="#888"
                  secureTextEntry={!showConfirm}
                  style={styles.inputFlex}
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  autoCapitalize="none"
                />
                <TouchableOpacity
                  onPress={() => setShowConfirm(!showConfirm)}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Ionicons
                    name={showConfirm ? 'eye-outline' : 'eye-off-outline'}
                    size={22}
                    color="#aaa"
                  />
                </TouchableOpacity>
              </View>

              {/* Terms and Agreements Row */}
              <View style={styles.termsRow}>
                <TouchableOpacity
                  style={styles.checkboxTouch}
                  onPress={() => setAccepted(!accepted)}
                  activeOpacity={0.7}
                >
                  <View style={[styles.checkbox, accepted && styles.checkedBox]}>
                    {accepted && <Ionicons name="checkmark" size={14} color="#fff" />}
                  </View>
                  <Text style={styles.termsText}>I accept </Text>
                </TouchableOpacity>

                <TouchableOpacity onPress={() => setShowTerms(true)} activeOpacity={0.7}>
                  <Text style={styles.link}>Terms and Agreements.</Text>
                </TouchableOpacity>
              </View>

              {/* Create Account Button */}
              <TouchableOpacity
                style={[
                  styles.button,
                  submitting && { opacity: 0.7 },
                ]}
                disabled={submitting}
                onPress={handleCreateAccount}
                activeOpacity={0.8}
              >
                <Text style={styles.buttonText}>
                  {submitting ? 'Creating Account...' : 'Create Account'}
                </Text>
              </TouchableOpacity>

              {/* Footer Login link */}
              <View style={styles.loginRow}>
                <Text style={styles.loginPrompt}>Already have an account? </Text>
                <TouchableOpacity onPress={() => router.push('/login-page')}>
                  <Text style={styles.loginLink}>Login</Text>
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>

        {/* Custom Error Modal */}
        <ErrorModal
          visible={errorModal.visible}
          message={errorModal.message}
          onClose={() => setErrorModal({ visible: false, message: '' })}
        />

        {/* Terms and Agreements Modal */}
        <TermsModal
          visible={showTerms}
          onClose={() => setShowTerms(false)}
        />

        {/* Sweet Toast Feedback */}
        <SweetToast
          visible={Boolean(toastMessage)}
          message={toastMessage}
          onDismiss={() => setToastMessage('')}
        />
      </ImageBackground>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#000',
  },
  background: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 36,
  },
  backBtn: {
    alignSelf: 'flex-start',
    marginBottom: 20,
    marginTop: 8,
  },
  formContainer: {
    width: '100%',
    paddingBottom: 10,
  },
  title: {
    color: '#ffffff',
    fontSize: 34,
    fontWeight: '800',
    lineHeight: 40,
    marginBottom: 10,
  },
  subtitle: {
    color: '#CBD5E1',
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 24,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(30, 41, 59, 0.75)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    paddingHorizontal: 16,
    marginBottom: 14,
    minHeight: 52,
  },
  inputFlex: {
    flex: 1,
    color: '#ffffff',
    fontSize: 15,
    paddingVertical: 14,
  },
  termsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    marginTop: 4,
    marginBottom: 22,
  },
  checkboxTouch: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 5,
    borderWidth: 1.5,
    borderColor: '#94A3B8',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  checkedBox: {
    backgroundColor: '#E53935',
    borderColor: '#E53935',
  },
  termsText: {
    color: '#E2E8F0',
    fontSize: 13,
  },
  link: {
    color: '#FFFFFF',
    fontWeight: '700',
    textDecorationLine: 'underline',
    fontSize: 13,
  },
  button: {
    backgroundColor: '#E53935',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    shadowColor: '#E53935',
    shadowOpacity: 0.35,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 8,
    elevation: 4,
    marginBottom: 20,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '700',
  },
  loginRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loginPrompt: {
    color: '#CBD5E1',
    fontSize: 14,
  },
  loginLink: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
    textDecorationLine: 'underline',
  },
});