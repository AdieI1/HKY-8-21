import React from "react";
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Pressable,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

export default function TermsModal({ visible, onClose }) {
  if (!visible) return null;

  return (
    <Modal
      transparent
      animationType="slide"
      visible={visible}
      onRequestClose={onClose}
    >
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={styles.card} onPress={(e) => e.stopPropagation()}>
          {/* Header */}
          <View style={styles.header}>
            <View>
              <Text style={styles.headerTitle}>Terms and Agreements</Text>
              <Text style={styles.headerSubtitle}>HJY Trucking Services</Text>
            </View>
            <TouchableOpacity
              onPress={onClose}
              style={styles.closeBtn}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="close" size={22} color="#64748B" />
            </TouchableOpacity>
          </View>

          {/* Scrollable Terms Content */}
          <ScrollView
            style={styles.scrollView}
            showsVerticalScrollIndicator={true}
            contentContainerStyle={styles.scrollContent}
          >
            <Text style={styles.effectiveDate}>Effective Date: October 2026</Text>

            <Text style={styles.sectionTitle}>1. Acceptance of Terms</Text>
            <Text style={styles.paragraph}>
              By creating an account or booking services through the HJY Trucking Services customer application, you agree to be bound by these Terms and Agreements and our Privacy Policy. If you do not agree to these terms, please do not use our services.
            </Text>

            <Text style={styles.sectionTitle}>2. Account Registration & Security</Text>
            <Text style={styles.paragraph}>
              Customers must provide accurate, current, and complete information during registration. You are responsible for maintaining the confidentiality of your account credentials and for all activities that occur under your account.
            </Text>

            <Text style={styles.sectionTitle}>3. Booking & Delivery Services</Text>
            <Text style={styles.paragraph}>
              All shipment delivery requests are subject to fleet availability, scheduling confirmation, and route validation. Estimated delivery times provided are approximations and may vary depending on road conditions, weather events, or traffic constraints.
            </Text>

            <Text style={styles.sectionTitle}>4. Prohibited Items & Cargo Safety</Text>
            <Text style={styles.paragraph}>
              Customers agree not to dispatch hazardous, illegal, undeclared, or prohibited materials. HJY Trucking Services reserves the right to inspect cargo documentation and refuse carriage of any items that violate local regulations or safety standards.
            </Text>

            <Text style={styles.sectionTitle}>5. Payments & Pricing</Text>
            <Text style={styles.paragraph}>
              Rates and fees are calculated based on vehicle type, cargo weight, distance, and associated service fees. Incurred fees must be settled according to agreed payment terms upon dispatch or upon delivery receipt.
            </Text>

            <Text style={styles.sectionTitle}>6. Cancellation & Rescheduling</Text>
            <Text style={styles.paragraph}>
              Shipment cancellations or reschedule requests must be submitted through the app prior to driver dispatch to avoid cancellation charges.
            </Text>

            <Text style={styles.sectionTitle}>7. Privacy & Data Protection</Text>
            <Text style={styles.paragraph}>
              We respect your privacy. Personal data including your name, contact information, email, and delivery addresses are collected solely to facilitate trucking logistics and service notifications. We do not sell your personal data to third parties.
            </Text>

            <Text style={styles.sectionTitle}>8. Contact Us</Text>
            <Text style={styles.paragraph}>
              For inquiries regarding shipments, billing, or these terms, please reach out via our support channel or email us at truckingserviceshjy@gmail.com.
            </Text>
          </ScrollView>

          {/* Footer Action */}
          <View style={styles.footer}>
            <TouchableOpacity style={styles.understandBtn} onPress={onClose}>
              <Text style={styles.understandText}>I Understand & Agree</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.65)",
    justifyContent: "flex-end",
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: "85%",
    paddingTop: 20,
    paddingBottom: 24,
    shadowColor: "#000",
    shadowOpacity: 0.25,
    shadowOffset: { width: 0, height: -4 },
    shadowRadius: 12,
    elevation: 10,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 22,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#0F172A",
  },
  headerSubtitle: {
    fontSize: 12,
    color: "#64748B",
    marginTop: 2,
  },
  closeBtn: {
    padding: 6,
  },
  scrollView: {
    paddingHorizontal: 22,
  },
  scrollContent: {
    paddingVertical: 16,
  },
  effectiveDate: {
    fontSize: 12,
    fontStyle: "italic",
    color: "#94A3B8",
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#1E293B",
    marginTop: 12,
    marginBottom: 6,
  },
  paragraph: {
    fontSize: 13,
    lineHeight: 19,
    color: "#475569",
    marginBottom: 8,
  },
  footer: {
    paddingHorizontal: 22,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#E2E8F0",
  },
  understandBtn: {
    backgroundColor: "#E53935",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
  },
  understandText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "600",
  },
});
