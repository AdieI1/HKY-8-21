import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  Image,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import { updateCustomerProfile, getSavedUser } from '../services/api';
import ErrorModal from '../components/ErrorModal';
import SweetToast from '../components/SweetToast';

const DefaultProfile = require('../assets/images/defaultavatar.png');
const PersonInfoIcon = require('../assets/images/personediticon.png');

export default function AccountSetup() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { width } = useWindowDimensions();

  const [photo, setPhoto] = useState(null);
  const [phone, setPhone] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [gender, setGender] = useState('');
  const [showGenderDropdown, setShowGenderDropdown] = useState(false);

  const [dob, setDob] = useState(null);
  const [showDatePicker, setShowDatePicker] = useState(false);

  const [submitting, setSubmitting] = useState(false);

  // Field validation error states
  const [fieldErrors, setFieldErrors] = useState({});

  // Feedback states
  const [errorModal, setErrorModal] = useState({ visible: false, message: '' });
  const [toastConfig, setToastConfig] = useState({ visible: false, message: '', type: 'success' });

  useEffect(() => {
    let active = true;
    getSavedUser().then((user) => {
      if (active && user) {
        if (user.phone) setPhone(user.phone);
        if (user.gender) setGender(user.gender);
        if (user.full_name) {
          const parts = String(user.full_name).trim().split(/\s+/);
          setFirstName(parts[0] || '');
          setLastName(parts.slice(1).join(' ') || '');
        }
        if (user.date_of_birth) {
          const parsed = new Date(user.date_of_birth);
          if (!isNaN(parsed.getTime())) {
            setDob(parsed);
          }
        }
      }
    });
    return () => {
      active = false;
    };
  }, []);

  const pickImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        setErrorModal({
          visible: true,
          message: 'Permission to access your gallery is required to choose a profile photo.',
        });
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setPhoto(result.assets[0]);
      }
    } catch {
      setErrorModal({
        visible: true,
        message: 'Unable to select photo. Please try again.',
      });
    }
  };

  const handlePhoneChange = (text) => {
    const cleaned = text.replace(/[^0-9]/g, '');
    if (cleaned.length <= 11) {
      setPhone(cleaned);
      if (fieldErrors.phone) {
        setFieldErrors((prev) => ({ ...prev, phone: false }));
      }
    }
  };

  const formatDate = (date) => {
    if (!(date instanceof Date)) return 'Open Calendar';
    const mm = (date.getMonth() + 1).toString().padStart(2, '0');
    const dd = date.getDate().toString().padStart(2, '0');
    const yyyy = date.getFullYear();
    return `${mm}/${dd}/${yyyy}`;
  };

  const handleContinue = async () => {
    const trimmedFirst = firstName.trim();
    const trimmedLast = lastName.trim();
    const trimmedPhone = phone.trim();

    const errors = {};
    if (!trimmedPhone || trimmedPhone.length < 11 || !trimmedPhone.startsWith('09')) {
      errors.phone = true;
    }
    if (!trimmedFirst) {
      errors.firstName = true;
    }
    if (!trimmedLast) {
      errors.lastName = true;
    }
    if (!gender) {
      errors.gender = true;
    }
    if (!dob) {
      errors.dob = true;
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      setToastConfig({
        visible: true,
        message: 'Please fill in all the requirements',
        type: 'error',
      });
      return;
    }

    setFieldErrors({});

    try {
      setSubmitting(true);
      await updateCustomerProfile({
        first_name: trimmedFirst,
        last_name: trimmedLast,
        phone: trimmedPhone,
        gender: gender,
        date_of_birth: formatDate(dob),
        photo: photo || null,
      });

      setToastConfig({
        visible: true,
        message: 'Profile completed! Welcome to HJY Trucking Services.',
        type: 'success',
      });

      setTimeout(() => {
        router.replace('/(tabs)/home');
      }, 1000);
    } catch (error) {
      setErrorModal({
        visible: true,
        message: error?.message || 'Unable to save profile details. Please try again.',
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Top Pill Header matching Figma */}
          <View style={styles.topHeaderPill}>
            <TouchableOpacity
              style={styles.pillBackBtn}
              onPress={() => {
                if (router.canGoBack()) {
                  router.back();
                } else {
                  router.replace('/login-page');
                }
              }}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="arrow-back" size={20} color="#FFFFFF" />
            </TouchableOpacity>
            <Text style={styles.pillHeaderText}>Profile Setup</Text>
            <View style={{ width: 32 }} />
          </View>

          {/* Avatar Section matching Figma */}
          <View style={styles.avatarSection}>
            <View style={styles.avatarWrapper}>
              <Image
                source={photo?.uri ? { uri: photo.uri } : DefaultProfile}
                style={styles.avatarImage}
              />
              <TouchableOpacity
                style={styles.addPhotoBtn}
                onPress={pickImage}
                activeOpacity={0.8}
              >
                <Ionicons name="add" size={18} color="#FFFFFF" />
              </TouchableOpacity>
            </View>

            <View style={styles.avatarTextContainer}>
              <Text style={styles.avatarTitle}>
                Lets finish setting{'\n'}up your Profile!
              </Text>
              <Text style={styles.avatarSubtitle}>Tell us a bit about yourself!</Text>
            </View>
          </View>

          {/* Personal Information Card matching Figma */}
          <View style={styles.card}>
            {/* Card Header with red person icon */}
            <View style={styles.cardHeader}>
              <View style={styles.cardHeaderIconCircle}>
                <Ionicons name="person" size={16} color="#E53935" />
              </View>
              <Text style={styles.cardHeaderText}>Personal Information</Text>
            </View>
            <View style={styles.cardDivider} />

            {/* Phone Number */}
            <Text style={styles.label}>Phone number:</Text>
            <TextInput
              style={[styles.input, fieldErrors.phone && styles.inputError]}
              placeholder="Enter Phone Number (09...)"
              placeholderTextColor={fieldErrors.phone ? '#EF4444' : '#94A3B8'}
              value={phone}
              onChangeText={handlePhoneChange}
              keyboardType="phone-pad"
              maxLength={11}
            />

            {/* First Name */}
            <Text style={styles.label}>First Name:</Text>
            <TextInput
              style={[styles.input, fieldErrors.firstName && styles.inputError]}
              placeholder="Enter First name"
              placeholderTextColor={fieldErrors.firstName ? '#EF4444' : '#94A3B8'}
              value={firstName}
              onChangeText={(text) => {
                setFirstName(text);
                if (fieldErrors.firstName) {
                  setFieldErrors((prev) => ({ ...prev, firstName: false }));
                }
              }}
            />

            {/* Last Name */}
            <Text style={styles.label}>Last Name:</Text>
            <TextInput
              style={[styles.input, fieldErrors.lastName && styles.inputError]}
              placeholder="Enter Last name"
              placeholderTextColor={fieldErrors.lastName ? '#EF4444' : '#94A3B8'}
              value={lastName}
              onChangeText={(text) => {
                setLastName(text);
                if (fieldErrors.lastName) {
                  setFieldErrors((prev) => ({ ...prev, lastName: false }));
                }
              }}
            />

            {/* Gender Dropdown */}
            <Text style={styles.label}>Gender:</Text>
            <TouchableOpacity
              style={[styles.dropdownTrigger, fieldErrors.gender && styles.inputError]}
              onPress={() => {
                setShowGenderDropdown(!showGenderDropdown);
                if (fieldErrors.gender) {
                  setFieldErrors((prev) => ({ ...prev, gender: false }));
                }
              }}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.dropdownText,
                  gender ? { color: '#0F172A' } : { color: fieldErrors.gender ? '#EF4444' : '#94A3B8' },
                ]}
              >
                {gender || 'Select Gender'}
              </Text>
              <Ionicons
                name={showGenderDropdown ? 'chevron-up' : 'chevron-down'}
                size={18}
                color={fieldErrors.gender ? '#EF4444' : '#64748B'}
              />
            </TouchableOpacity>

            {showGenderDropdown && (
              <View style={styles.dropdownMenu}>
                {['Male', 'Female', 'Prefer not to say'].map((item) => (
                  <TouchableOpacity
                    key={item}
                    style={styles.dropdownMenuItem}
                    onPress={() => {
                      setGender(item);
                      setShowGenderDropdown(false);
                      if (fieldErrors.gender) {
                        setFieldErrors((prev) => ({ ...prev, gender: false }));
                      }
                    }}
                  >
                    <Text style={styles.dropdownMenuItemText}>{item}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {/* Date of Birth */}
            <Text style={styles.label}>Date of Birth:</Text>
            <TouchableOpacity
              style={[styles.datePickerTrigger, fieldErrors.dob && styles.inputError]}
              onPress={() => {
                setShowDatePicker(true);
                if (fieldErrors.dob) {
                  setFieldErrors((prev) => ({ ...prev, dob: false }));
                }
              }}
              activeOpacity={0.7}
            >
              <Ionicons
                name="calendar-outline"
                size={20}
                color={fieldErrors.dob ? '#EF4444' : '#64748B'}
                style={{ marginRight: 10 }}
              />
              <Text
                style={[
                  styles.dateText,
                  dob ? { color: '#0F172A' } : { color: fieldErrors.dob ? '#EF4444' : '#94A3B8' },
                ]}
              >
                {formatDate(dob)}
              </Text>
            </TouchableOpacity>

            {showDatePicker && (
              <DateTimePicker
                value={dob instanceof Date ? dob : new Date(2000, 0, 1)}
                mode="date"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                maximumDate={new Date()}
                onChange={(event, selectedDate) => {
                  setShowDatePicker(false);
                  if (event.type === 'set' && selectedDate) {
                    setDob(selectedDate);
                    if (fieldErrors.dob) {
                      setFieldErrors((prev) => ({ ...prev, dob: false }));
                    }
                  }
                }}
              />
            )}

            {/* Continue Button */}
            <TouchableOpacity
              style={[styles.continueBtn, submitting && { opacity: 0.7 }]}
              onPress={handleContinue}
              disabled={submitting}
              activeOpacity={0.8}
            >
              <Text style={styles.continueBtnText}>
                {submitting ? 'Saving...' : 'Continue'}
              </Text>
            </TouchableOpacity>
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
        visible={toastConfig.visible}
        message={toastConfig.message}
        type={toastConfig.type}
        duration={2500}
        onDismiss={() => setToastConfig({ visible: false, message: '', type: 'success' })}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#E2E8F0',
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 40,
  },
  topHeaderPill: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 6,
    elevation: 3,
  },
  pillBackBtn: {
    backgroundColor: '#E53935',
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pillHeaderText: {
    fontSize: 17,
    fontWeight: '700',
    color: '#1E293B',
  },
  avatarSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
    paddingHorizontal: 6,
  },
  avatarWrapper: {
    position: 'relative',
    marginRight: 16,
  },
  avatarImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#CBD5E1',
  },
  addPhotoBtn: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#64748B',
    borderWidth: 2,
    borderColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarTextContainer: {
    flex: 1,
  },
  avatarTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#1E293B',
    lineHeight: 25,
    marginBottom: 4,
  },
  avatarSubtitle: {
    fontSize: 13,
    color: '#64748B',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 24,
    shadowColor: '#000',
    shadowOpacity: 0.07,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 10,
    elevation: 4,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  cardHeaderIconCircle: {
    marginRight: 8,
  },
  cardHeaderText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1E293B',
  },
  cardDivider: {
    height: 1,
    backgroundColor: '#E2E8F0',
    marginBottom: 18,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: 6,
  },
  input: {
    backgroundColor: '#F1F5F9',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: '#0F172A',
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  dropdownTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F1F5F9',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 13,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  dropdownText: {
    fontSize: 14,
  },
  dropdownMenu: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginTop: -8,
    marginBottom: 14,
    overflow: 'hidden',
    elevation: 4,
  },
  dropdownMenuItem: {
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  dropdownMenuItemText: {
    fontSize: 14,
    color: '#1E293B',
  },
  datePickerTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 13,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  dateText: {
    fontSize: 14,
  },
  continueBtn: {
    backgroundColor: '#E53935',
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: 'center',
    shadowColor: '#E53935',
    shadowOpacity: 0.35,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 8,
    elevation: 4,
  },
  continueBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  inputError: {
    borderColor: '#EF4444',
    borderWidth: 1.5,
    backgroundColor: '#FEF2F2',
  },
});