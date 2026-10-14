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
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { verifyCode, resendVerification, isProfileSetupCompleted } from '../services/api';
import ErrorModal from '../components/ErrorModal';
import SweetToast from '../components/SweetToast';

const bg = require('../assets/images/mobileTruckBackground.png');

export default function EmailVerification() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { width, height } = useWindowDimensions();

  const [code, setCode] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [resending, setResending] = useState(false);

  // Feedback states
  const [errorModal, setErrorModal] = useState({ visible: false, message: '' });
  const [toastMessage, setToastMessage] = useState('');

  const handleVerify = async () => {
    const cleanCode = code.trim();
    if (!cleanCode) {
      setErrorModal({
        visible: true,
        message: 'Please enter the 6-digit verification code sent to your email.',
      });
      return;
    }

    if (cleanCode.length !== 6) {
      setErrorModal({
        visible: true,
        message: 'Verification code must be exactly 6 digits.',
      });
      return;
    }

    try {
      setSubmitting(true);
      const data = await verifyCode(cleanCode);

      setToastMessage('Email verified successfully!');

      setTimeout(() => {
        if (data?.user && isProfileSetupCompleted(data.user)) {
          router.replace('/(tabs)/home');
        } else {
          router.replace('/accountsetup');
        }
      }, 1000);
    } catch (error) {
      setErrorModal({
        visible: true,
        message: error?.message || 'Invalid or expired verification code. Please try again.',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleResend = async () => {
    try {
      setResending(true);
      await resendVerification();
      setToastMessage('A fresh 6-digit code has been sent to your email.');
    } catch (error) {
      setErrorModal({
        visible: true,
        message: error?.message || 'Unable to resend code right now. Please try again later.',
      });
    } finally {
      setResending(false);
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

            <View style={styles.contentContainer}>
              {/* Header Title */}
              <Text style={styles.title}>Lets Verify your{'\n'}Email Address</Text>

              {/* Subheading */}
              <Text style={styles.subtitle}>
                We sent you a 6 digit code for verification please enter them below.
              </Text>

              {/* 6-digit Code Input */}
              <View style={styles.inputWrapper}>
                <TextInput
                  placeholder="Enter 6-digit code"
                  placeholderTextColor="#777"
                  style={styles.input}
                  value={code}
                  onChangeText={(text) => setCode(text.replace(/[^0-9]/g, ''))}
                  keyboardType="number-pad"
                  maxLength={6}
                  autoFocus
                />
              </View>

              {/* Submit Button */}
              <TouchableOpacity
                style={[styles.submitBtn, (submitting || code.length !== 6) && { opacity: 0.6 }]}
                onPress={handleVerify}
                disabled={submitting}
                activeOpacity={0.8}
              >
                <Text style={styles.btnText}>
                  {submitting ? 'Verifying...' : 'Submit'}
                </Text>
              </TouchableOpacity>

              {/* Resend Code Link */}
              <View style={styles.resendRow}>
                <Text style={styles.resendPrompt}>Didn't receive the code? </Text>
                <TouchableOpacity onPress={handleResend} disabled={resending}>
                  <Text style={styles.resendLink}>
                    {resending ? 'Sending...' : 'Resend Code'}
                  </Text>
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
    paddingBottom: 40,
  },
  backBtn: {
    alignSelf: 'flex-start',
    marginBottom: 20,
    marginTop: 8,
  },
  contentContainer: {
    width: '100%',
    paddingBottom: 20,
  },
  title: {
    color: '#ffffff',
    fontSize: 32,
    fontWeight: '800',
    lineHeight: 38,
    marginBottom: 10,
  },
  subtitle: {
    color: '#CBD5E1',
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 28,
  },
  inputWrapper: {
    backgroundColor: 'rgba(30, 41, 59, 0.75)',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    paddingHorizontal: 18,
    marginBottom: 20,
    minHeight: 56,
    justifyContent: 'center',
  },
  input: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: 6,
    textAlign: 'center',
    paddingVertical: 12,
  },
  submitBtn: {
    backgroundColor: '#E53935',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    shadowColor: '#E53935',
    shadowOpacity: 0.35,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 8,
    elevation: 4,
    marginBottom: 22,
  },
  btnText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '700',
  },
  resendRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  resendPrompt: {
    color: '#CBD5E1',
    fontSize: 14,
  },
  resendLink: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
    textDecorationLine: 'underline',
  },
});