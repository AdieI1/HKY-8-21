import React, { useState } from "react";
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  TextInput,
  ActivityIndicator,
  Alert,
  ScrollView,
  Platform,
  KeyboardAvoidingView,
} from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import * as ImagePicker from "expo-image-picker";
import { submitProofOfDelivery } from "../services/api";

export default function ProofOfDeliveryModal({
  visible,
  onClose,
  delivery,
  onSuccess,
}) {
  const [photo, setPhoto] = useState(null); // { uri, base64, fileName, mimeType }
  const [receivedBy, setReceivedBy] = useState("");
  const [deliveryNotes, setDeliveryNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const deliveryId = delivery?.delivery_id || delivery?.id;
  const clientName = delivery?.clientName || delivery?.customer?.full_name || "Customer";
  const dropoffAddress = delivery?.dropoff || delivery?.request?.dropoff_address || "Drop-off Location";
  const cargoInfo = delivery?.cargo || delivery?.request?.cargo_type || "Cargo";

  const resetForm = () => {
    setPhoto(null);
    setReceivedBy("");
    setDeliveryNotes("");
    setSubmitting(false);
  };

  const handleClose = () => {
    if (submitting) return;
    resetForm();
    onClose();
  };

  const handleTakePhoto = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(
          "Camera Permission Required",
          "Permission to access camera is required to take proof of delivery photos."
        );
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ["images"],
        allowsEditing: true,
        quality: 0.65,
        base64: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        setPhoto({
          uri: asset.uri,
          base64: asset.base64 ? `data:image/jpeg;base64,${asset.base64}` : null,
          fileName: asset.fileName || `pod-${deliveryId}-${Date.now()}.jpg`,
          mimeType: asset.mimeType || "image/jpeg",
        });
      }
    } catch (err) {
      Alert.alert("Camera Error", err?.message || "Could not open camera.");
    }
  };

  const handlePickPhoto = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(
          "Gallery Permission Required",
          "Permission to access photo gallery is required to choose proof of delivery photos."
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsEditing: true,
        quality: 0.65,
        base64: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        setPhoto({
          uri: asset.uri,
          base64: asset.base64 ? `data:image/jpeg;base64,${asset.base64}` : null,
          fileName: asset.fileName || `pod-${deliveryId}-${Date.now()}.jpg`,
          mimeType: asset.mimeType || "image/jpeg",
        });
      }
    } catch (err) {
      Alert.alert("Photo Error", err?.message || "Could not choose photo.");
    }
  };

  const handleSubmit = async () => {
    if (!photo) {
      Alert.alert(
        "Photo Required",
        "Please take or upload a photo showing the delivered cargo at the destination."
      );
      return;
    }

    if (!deliveryId) {
      Alert.alert("Error", "Delivery reference not found.");
      return;
    }

    try {
      setSubmitting(true);

      const photoPayload = photo.base64 || {
        uri: photo.uri,
        fileName: photo.fileName,
        mimeType: photo.mimeType,
      };

      const result = await submitProofOfDelivery(deliveryId, {
        photo: photoPayload,
        receivedBy: receivedBy.trim(),
        deliveryNotes: deliveryNotes.trim(),
        completeDelivery: true,
      });

      resetForm();
      onClose();

      if (onSuccess) {
        onSuccess(result?.delivery || result);
      }
    } catch (err) {
      Alert.alert(
        "Submission Failed",
        err?.message || "Could not save proof of delivery. Please try again."
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View style={styles.sheetContainer}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerTitleGroup}>
              <View style={styles.iconBadge}>
                <Ionicons name="camera" size={20} color="#FFFFFF" />
              </View>
              <View>
                <Text style={styles.headerTitle}>Proof of Delivery</Text>
                <Text style={styles.headerSubtitle}>
                  {delivery?.tripTicketNo || `Delivery #${deliveryId || ""}`}
                </Text>
              </View>
            </View>

            <TouchableOpacity
              onPress={handleClose}
              style={styles.closeBtn}
              disabled={submitting}
            >
              <Ionicons name="close" size={22} color="#FFFFFF" />
            </TouchableOpacity>
          </View>

          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* Delivery Destination Summary Card */}
            <View style={styles.infoCard}>
              <View style={styles.infoRow}>
                <Ionicons name="person-circle-outline" size={18} color="#B91F27" />
                <Text style={styles.infoLabel}>Client / Receiver:</Text>
                <Text style={styles.infoValue} numberOfLines={1}>
                  {clientName}
                </Text>
              </View>

              <View style={styles.infoRow}>
                <Ionicons name="cube-outline" size={18} color="#B91F27" />
                <Text style={styles.infoLabel}>Cargo:</Text>
                <Text style={styles.infoValue} numberOfLines={1}>
                  {cargoInfo}
                </Text>
              </View>

              <View style={styles.infoRow}>
                <Ionicons name="location-outline" size={18} color="#B91F27" />
                <Text style={styles.infoLabel}>Drop-off:</Text>
                <Text style={styles.infoValue} numberOfLines={2}>
                  {dropoffAddress}
                </Text>
              </View>
            </View>

            {/* Photo Capture Section */}
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>
                Cargo Drop-off Photo <Text style={styles.requiredStar}>*</Text>
              </Text>
              <Text style={styles.sectionHelp}>
                Snap a clear photo of the delivered cargo at the customer site.
              </Text>
            </View>

            {photo ? (
              <View style={styles.previewCard}>
                <Image
                  source={{ uri: photo.uri }}
                  style={styles.previewImage}
                  resizeMode="cover"
                />

                <View style={styles.previewOverlay}>
                  <View style={styles.timestampBadge}>
                    <Ionicons name="checkmark-circle" size={14} color="#10B981" />
                    <Text style={styles.timestampText}>
                      Photo Captured • {new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </Text>
                  </View>

                  <TouchableOpacity
                    style={styles.retakeBtn}
                    onPress={() => setPhoto(null)}
                    disabled={submitting}
                  >
                    <Ionicons name="refresh-outline" size={16} color="#FFFFFF" />
                    <Text style={styles.retakeBtnText}>Retake</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <View style={styles.photoActionsRow}>
                <TouchableOpacity
                  style={[styles.photoActionButton, styles.cameraAction]}
                  onPress={handleTakePhoto}
                  activeOpacity={0.8}
                >
                  <View style={styles.actionIconCircle}>
                    <Ionicons name="camera" size={26} color="#B91F27" />
                  </View>
                  <Text style={styles.actionButtonTitle}>Take Photo</Text>
                  <Text style={styles.actionButtonSub}>Open Camera</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.photoActionButton, styles.galleryAction]}
                  onPress={handlePickPhoto}
                  activeOpacity={0.8}
                >
                  <View style={styles.actionIconCircle}>
                    <Ionicons name="images" size={26} color="#4B5563" />
                  </View>
                  <Text style={styles.actionButtonTitle}>From Gallery</Text>
                  <Text style={styles.actionButtonSub}>Upload Image</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Receiver Name Field */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>
                Received By <Text style={styles.optionalTag}>(Optional)</Text>
              </Text>
              <TextInput
                style={styles.textInput}
                placeholder="Name of recipient or authorized receiver"
                placeholderTextColor="#9CA3AF"
                value={receivedBy}
                onChangeText={setReceivedBy}
                editable={!submitting}
              />
            </View>

            {/* Delivery Notes / Remarks */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>
                Delivery Remarks / Notes <Text style={styles.optionalTag}>(Optional)</Text>
              </Text>
              <TextInput
                style={[styles.textInput, styles.textArea]}
                placeholder="e.g. Unloaded at gate 2, inspected with customer in good condition"
                placeholderTextColor="#9CA3AF"
                value={deliveryNotes}
                onChangeText={setDeliveryNotes}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
                editable={!submitting}
              />
            </View>

            {/* Confirmation Box */}
            <View style={styles.securityNotice}>
              <Ionicons name="shield-checkmark" size={18} color="#10B981" />
              <Text style={styles.securityNoticeText}>
                Submitting this proof will mark the trip completed and notify dispatch and the customer.
              </Text>
            </View>

            {/* Submit Button */}
            <TouchableOpacity
              style={[
                styles.submitButton,
                (!photo || submitting) && styles.submitButtonDisabled,
              ]}
              onPress={handleSubmit}
              disabled={!photo || submitting}
              activeOpacity={0.85}
            >
              {submitting ? (
                <View style={styles.loadingRow}>
                  <ActivityIndicator size="small" color="#FFFFFF" />
                  <Text style={styles.submitButtonText}>Uploading Proof...</Text>
                </View>
              ) : (
                <View style={styles.loadingRow}>
                  <Ionicons name="checkmark-done" size={22} color="#FFFFFF" />
                  <Text style={styles.submitButtonText}>Confirm & Complete Delivery</Text>
                </View>
              )}
            </TouchableOpacity>

            {/* Secondary Cancel */}
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={handleClose}
              disabled={submitting}
            >
              <Text style={styles.cancelButtonText}>Back to Navigation</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.65)",
    justifyContent: "flex-end",
  },
  sheetContainer: {
    backgroundColor: "#F9FAFB",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: "92%",
    overflow: "hidden",
  },
  header: {
    backgroundColor: "#951F21",
    paddingHorizontal: 20,
    paddingVertical: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerTitleGroup: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  iconBadge: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "700",
  },
  headerSubtitle: {
    color: "#FECACA",
    fontSize: 12,
    marginTop: 2,
  },
  closeBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  scroll: {
    flexGrow: 0,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 36,
  },
  infoCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    marginBottom: 18,
    gap: 8,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  infoLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: "#4B5563",
    width: 110,
  },
  infoValue: {
    fontSize: 13,
    fontWeight: "600",
    color: "#111827",
    flex: 1,
  },
  sectionHeader: {
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#1F2937",
  },
  requiredStar: {
    color: "#DC2626",
  },
  sectionHelp: {
    fontSize: 12,
    color: "#6B7280",
    marginTop: 2,
  },
  photoActionsRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 18,
  },
  photoActionButton: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    borderWidth: 1.5,
    borderStyle: "dashed",
    paddingVertical: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  cameraAction: {
    borderColor: "#B91F27",
    backgroundColor: "#FEF2F2",
  },
  galleryAction: {
    borderColor: "#D1D5DB",
    backgroundColor: "#FFFFFF",
  },
  actionIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  actionButtonTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#1F2937",
  },
  actionButtonSub: {
    fontSize: 11,
    color: "#6B7280",
    marginTop: 2,
  },
  previewCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    marginBottom: 18,
  },
  previewImage: {
    width: "100%",
    height: 220,
    backgroundColor: "#1F2937",
  },
  previewOverlay: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: "#FFFFFF",
    borderTopWidth: 1,
    borderTopColor: "#F3F4F6",
  },
  timestampBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  timestampText: {
    fontSize: 12,
    color: "#374151",
    fontWeight: "600",
  },
  retakeBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#EF4444",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  retakeBtnText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "600",
  },
  inputGroup: {
    marginBottom: 14,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 6,
  },
  optionalTag: {
    fontSize: 11,
    color: "#9CA3AF",
    fontWeight: "400",
  },
  textInput: {
    backgroundColor: "#FFFFFF",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#D1D5DB",
    paddingHorizontal: 14,
    paddingVertical: 11,
    fontSize: 14,
    color: "#111827",
  },
  textArea: {
    minHeight: 70,
    paddingTop: 10,
  },
  securityNotice: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#ECFDF5",
    borderWidth: 1,
    borderColor: "#A7F3D0",
    padding: 12,
    borderRadius: 10,
    marginBottom: 20,
  },
  securityNoticeText: {
    fontSize: 12,
    color: "#065F46",
    flex: 1,
    lineHeight: 16,
  },
  submitButton: {
    backgroundColor: "#B91F27",
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#B91F27",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  submitButtonDisabled: {
    backgroundColor: "#D1D5DB",
    shadowOpacity: 0,
    elevation: 0,
  },
  loadingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  submitButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },
  cancelButton: {
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 6,
  },
  cancelButtonText: {
    color: "#6B7280",
    fontSize: 14,
    fontWeight: "600",
  },
});
