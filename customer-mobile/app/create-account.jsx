import {StyleSheet,Text,View,TextInput,TouchableOpacity,ImageBackground,useWindowDimensions,Alert} from 'react-native'
import React, { useState } from 'react'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { register } from '../services/api'

const bg = require('../assets/images/mobileTruckBackground.png')

export default function CreateAccount() {
  const router = useRouter()
  const { width, height } = useWindowDimensions()

  // password toggle visibility
  const [showPass, setShowPass] = useState(false)
  //confirm button toggle
  const [showConfirm, setShowConfirm] = useState(false)

  // checkbox toggle
  const [accepted, setAccepted] = useState(false)
  const [phone, setPhone] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [submitting, setSubmitting] = useState(false)

  const handleCreateAccount = async () => {
    if (password !== confirmPassword) {
      Alert.alert("Invalid Password", "Passwords do not match.")
      return
    }

    try {
      setSubmitting(true)
      const data = await register(phone, email.trim(), password, confirmPassword)

      router.push({
        pathname: "/accountsetup",
        params: { username: data.username },
      })
    } catch (error) {
      Alert.alert("Unable to Create Account", error?.message || "Please check your details.")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ImageBackground source={bg} style={[styles.container, { padding: width * 0.05 }]} blurRadius={8}>

        {/* Back Button */}
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={36} color="#fff" marginBottom="20" />
        </TouchableOpacity>

        {/* header */}
        <Text style={[styles.title, { fontSize: width * 0.1 }]}>
          Create your{'\n'}Account.
        </Text>

        <Text style={[styles.subtitle, { fontSize: width * 0.045 }]}>
          You're just one step away from becoming{'\n'}one of our valued customers.
        </Text>

        {/* Inputs */}
        <View style={styles.form}>

          <TextInput placeholder="Contact Number" placeholderTextColor="#aaa"
            style={[styles.input, {
              padding: height * 0.018,
              borderRadius: width * 0.03
            }]}
            value={phone}
            onChangeText={setPhone} />

          <TextInput placeholder="Email Address" placeholderTextColor="#aaa"
            style={[styles.input, {
              padding: height * 0.018,
              borderRadius: width * 0.03
            }]}
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none" />

          {/* Password */}
          <View style={[styles.inputWrapper, {
            borderRadius: width * 0.03,
            paddingHorizontal: width * 0.04
          }]}>
            <TextInput
              placeholder="Password"
              placeholderTextColor="#aaa"
              secureTextEntry={!showPass}
              style={[styles.inputFlex, { paddingVertical: height * 0.018 }]}
              value={password}
              onChangeText={setPassword}
            />
            <TouchableOpacity onPress={() => setShowPass(!showPass)}>
              <Ionicons name={showPass ? "eye" : "eye-off"} size={20} color="#aaa" />
            </TouchableOpacity>
          </View>

          {/* Confirm Password */}
          <View style={[styles.inputWrapper, {
            borderRadius: width * 0.03,
            paddingHorizontal: width * 0.04
          }]}>
            <TextInput
              placeholder="Confirm Password"
              placeholderTextColor="#aaa"
              secureTextEntry={!showConfirm}
              style={[styles.inputFlex, { paddingVertical: height * 0.018 }]}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
            />
            <TouchableOpacity onPress={() => setShowConfirm(!showConfirm)}>
              <Ionicons name={showConfirm ? "eye" : "eye-off"} size={20} color="#aaa" />
            </TouchableOpacity>
          </View>

          {/* Checkbox */}
          <TouchableOpacity
            style={[styles.termsRow, { marginBottom: height * 0.02 }]}
            onPress={() => setAccepted(!accepted)}
          >
            <View style={[
              styles.checkbox,
              {
                width: width * 0.06,
                height: width * 0.06,
                marginRight: width * 0.02
              },
              accepted && styles.checkedBox
            ]}>
              {accepted && (
                <Ionicons name="checkmark" size={16} color="#fff" />
              )}
            </View>

            <Text style={[styles.termsText, { fontSize: width * 0.04 }]}>
              I accept{' '}
              <Text style={styles.link}>Terms and Agreements</Text>
            </Text>
          </TouchableOpacity>

          {/* Button */}
          <TouchableOpacity
            style={[
              styles.button,
              {
                padding: height * 0.02,
                borderRadius: width * 0.035
              },
              (!accepted || submitting) && { opacity: 0.5 }
            ]}
            disabled={!accepted || submitting}
            onPress={handleCreateAccount}
          >
            <Text style={[styles.buttonText, { fontSize: width * 0.05 }]}>
              Create Account
            </Text>
          </TouchableOpacity>

          {/* Login */}
          <TouchableOpacity
              onPress={() => router.push("/login-page")}>
          <Text style={[styles.login, { marginTop: height * 0.02 }]} >
            Already have an account?{' '}
            <Text
              style={styles.loginBold}
            
            >
              Login
            </Text>
          </Text>
          </TouchableOpacity>

        </View>

      </ImageBackground>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#000' },

  container: {
    flex: 1,
    justifyContent: 'center'
  },

  title: {
    color: '#fff',
    fontWeight: 'bold',
  },

  subtitle: {
    color: '#dbd8d8',
  },

  form: {
    marginTop: 20
  },

  input: {
    backgroundColor: '#333',
    color: '#fff',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#F7373C'
  },

  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#333',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#F7373C'
  },

  inputFlex: {
    flex: 1,
    color: '#fff',
  },

  termsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center'
  },

  checkbox: {
    borderWidth: 2,
    borderColor: '#fff',
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },

  checkedBox: {
    backgroundColor: '#DE2226',
    borderColor: '#DE2226',
  },

  termsText: {
    color: '#ccc',
  },

  link: {
    textDecorationLine: 'underline',
    color: '#fff',
  },

  button: {
    backgroundColor: '#DE2226',
    alignItems: 'center',
  },

  buttonText: {
    color: '#fff',
    fontWeight: 'bold',
  },

  login: {
    color: '#ccc',
    textAlign: 'center',
    fontSize: 16
  },

  loginBold: {
    color: '#fff',
    fontWeight: 'bold'
  }
})