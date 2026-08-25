import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { submitReview } from "../services/api";

const pfpplaceholder = require("../assets/images/profilepic.png");
const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10MB

export default function ReviewModal({ visible, delivery, onClose, onSuccess }) {
  const [serviceRating, setServiceRating] = useState(0);
  const [driverRating, setDriverRating] = useState(0);
  const [comments, setComments] = useState("");
  const [photo, setPhoto] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const resetForm = () => {
    setServiceRating(0);
    setDriverRating(0);
    setComments("");
    setPhoto(null);
    setSubmitting(false);
    setSubmitted(false);
  };

  const handleClose = () => {
    const wasSubmitted = submitted;
    resetForm();
    onClose();
    if (wasSubmitted && onSuccess) onSuccess();
  };

  const handlePickPhoto = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Permission Required", "Camera roll permission is needed to upload a photo.");
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsEditing: true,
        quality: 0.8,
      });
      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        if (asset.fileSize && asset.fileSize > MAX_FILE_SIZE_BYTES) {
          Alert.alert("File Too Large", "Photo size exceeds the 10MB limit. Please choose a smaller photo.");
          return;
        }
        setPhoto(asset);
      }
    } catch {
      Alert.alert("Error", "Failed to select photo. Please try again.");
    }
  };

  const handleSubmit = async () => {
    if (serviceRating === 0) {
      Alert.alert("Rating Required", "Please select a rating for the service.");
      return;
    }
    if (driverRating === 0) {
      Alert.alert("Rating Required", "Please select a rating for the driver.");
      return;
    }
    if (!delivery?.deliveryId && !delivery?.id) {
      Alert.alert("Error", "Delivery details are missing.");
      return;
    }

    try {
      setSubmitting(true);
      await submitReview({
        delivery_id: delivery.deliveryId || delivery.id,
        overall_rating: serviceRating,
        driver_rating: driverRating,
        comments: comments.trim(),
        photo,
      });
      setSubmitted(true);
    } catch (error) {
      Alert.alert("Submission Failed", error?.message || "Failed to submit review.");
    } finally {
      setSubmitting(false);
    }
  };

  const renderStars = (currentRating, onSelect) => (
    <View style={styles.starRow}>
      {[1, 2, 3, 4, 5].map((star) => (
        <TouchableOpacity
          key={star}
          onPress={() => onSelect(star)}
          activeOpacity={0.7}
          hitSlop={{ top: 8, bottom: 8, left: 6, right: 6 }}
        >
          <Ionicons
            name="star"
            size={34}
            color={star <= currentRating ? "#F2B632" : "#A6B0C3"}
            style={styles.starIcon}
          />
        </TouchableOpacity>
      ))}
    </View>
  );

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={handleClose}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.backdrop}>
        <View style={styles.modalCard}>
          {submitted ? (
            <View style={styles.successContainer}>
              <View style={styles.successHeader}>
                <TouchableOpacity onPress={handleClose} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
                  <Ionicons name="arrow-back" size={28} color="#FF3B30" />
                </TouchableOpacity>
              </View>
              <View style={styles.headerBorder} />

              <View style={styles.successBody}>
                <View style={styles.smileCircle}>
                  <View style={styles.eyesRow}>
                    <View style={styles.eyeArc} />
                    <View style={styles.eyeArc} />
                  </View>
                  <View style={styles.smileMouth} />
                </View>

                <Text style={styles.thankYouTitle}>Thank You!</Text>
                <Text style={styles.thankYouSubtitle}>
                  We appreciate your feedback! Your input helps us deliver better experiences every time.
                </Text>
              </View>
            </View>
          ) : (
            <>
              <View style={styles.header}>
                <View style={styles.headerTitleRow}>
                  <Ionicons name="star" size={24} color="#F2B632" />
                  <Text style={styles.headerTitle}>Rate your Delivery</Text>
                </View>
                <TouchableOpacity onPress={handleClose} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  <Ionicons name="close" size={22} color="#777987" />
                </TouchableOpacity>
              </View>
              <View style={styles.headerBorder} />

              <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollBody}>
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Hows the Service?</Text>
                  {renderStars(serviceRating, setServiceRating)}
                </View>
                <View style={styles.divider} />

                <View style={styles.section}>
                  <View style={styles.driverInfoRow}>
                    <Image source={pfpplaceholder} style={styles.driverAvatar} />
                    <View>
                      <Text style={styles.driverName}>{delivery?.driver || "Driver"}</Text>
                      <Text style={styles.driverLabel}>Driver</Text>
                    </View>
                  </View>
                  <Text style={styles.sectionTitle}>How was the driver?</Text>
                  {renderStars(driverRating, setDriverRating)}
                </View>
                <View style={styles.divider} />

                <View style={styles.section}>
                  <View style={styles.feedbackHeaderRow}>
                    <Ionicons name="chatbox-ellipses" size={17} color="#58627A" />
                    <Text style={styles.feedbackTitle}> Additional Feedback</Text>
                    <Text style={styles.optionalText}>(Optional)</Text>
                  </View>
                  <TextInput
                    style={styles.textArea}
                    multiline
                    numberOfLines={4}
                    placeholder="Tell use more..."
                    placeholderTextColor="#9CA3AF"
                    value={comments}
                    onChangeText={setComments}
                  />
                </View>

                <View style={styles.section}>
                  <TouchableOpacity style={styles.attachBtn} onPress={handlePickPhoto} activeOpacity={0.8}>
                    <Ionicons name="camera" size={19} color="#58627A" />
                    <Text style={styles.attachBtnText}> Attach photo</Text>
                    <Text style={styles.attachOptionalText}>(Optional)</Text>
                  </TouchableOpacity>

                  {photo && (
                    <View style={styles.previewContainer}>
                      <Image source={{ uri: photo.uri }} style={styles.previewImage} />
                      <View style={styles.previewInfo}>
                        <Text style={styles.previewName} numberOfLines={1}>{photo.fileName || "Selected Image"}</Text>
                        <Text style={styles.previewSize}>
                          {photo.fileSize ? `${(photo.fileSize / (1024 * 1024)).toFixed(2)} MB` : "Image attached"}
                        </Text>
                      </View>
                      <TouchableOpacity onPress={() => setPhoto(null)} style={styles.removePhotoBtn}>
                        <Ionicons name="close-circle" size={22} color="#E53935" />
                      </TouchableOpacity>
                    </View>
                  )}
                </View>

                <TouchableOpacity
                  style={[styles.submitBtn, submitting && styles.submitBtnDisabled]}
                  onPress={handleSubmit}
                  disabled={submitting}
                  activeOpacity={0.85}
                >
                  {submitting ? (
                    <ActivityIndicator color="#FFFFFF" size="small" />
                  ) : (
                    <Text style={styles.submitBtnText}>Submit Review</Text>
                  )}
                </TouchableOpacity>
              </ScrollView>
            </>
          )}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: "rgba(0, 0, 0, 0.45)", justifyContent: "center", alignItems: "center", paddingHorizontal: 16, paddingVertical: 24 },
  modalCard: { backgroundColor: "#FFFFFF", borderRadius: 20, width: "100%", maxWidth: 380, maxHeight: "92%", overflow: "hidden", shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25, shadowRadius: 10, elevation: 8 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 18, paddingTop: 16, paddingBottom: 10 },
  headerTitleRow: { flexDirection: "row", alignItems: "center" },
  headerTitle: { fontSize: 20, fontWeight: "900", color: "#DE2226", marginLeft: 8 },
  headerBorder: { height: 1, backgroundColor: "#E2E4EB" },
  scrollBody: { paddingHorizontal: 18, paddingVertical: 14 },
  section: { marginBottom: 8 },
  sectionTitle: { fontSize: 15, fontWeight: "600", color: "#2C3442", marginBottom: 8 },
  starRow: { flexDirection: "row", alignItems: "center", justifyContent: "flex-start", marginBottom: 6 },
  starIcon: { marginRight: 10 },
  divider: { height: 1, backgroundColor: "#E5E7EB", marginVertical: 10 },
  driverInfoRow: { flexDirection: "row", alignItems: "center", marginBottom: 10 },
  driverAvatar: { width: 42, height: 42, borderRadius: 21, marginRight: 10 },
  driverName: { fontSize: 14, fontWeight: "800", color: "#273342" },
  driverLabel: { fontSize: 11, color: "#777987", marginTop: 1 },
  feedbackHeaderRow: { flexDirection: "row", alignItems: "center", marginBottom: 8 },
  feedbackTitle: { fontSize: 14, fontWeight: "700", color: "#2C3442" },
  optionalText: { fontSize: 13, fontWeight: "600", color: "#7B8293", marginLeft: 3 },
  textArea: { borderWidth: 1.5, borderColor: "#D5D9E2", borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, height: 84, textAlignVertical: "top", fontSize: 13, color: "#1F2937", backgroundColor: "#FFFFFF" },
  attachBtn: { backgroundColor: "#DCE1EB", borderRadius: 10, paddingVertical: 11, paddingHorizontal: 14, flexDirection: "row", alignItems: "center", marginTop: 4 },
  attachBtnText: { fontSize: 13.5, fontWeight: "700", color: "#2C3442" },
  attachOptionalText: { fontSize: 13, fontWeight: "600", color: "#58627A", marginLeft: 3 },
  previewContainer: { flexDirection: "row", alignItems: "center", backgroundColor: "#F3F4F8", padding: 8, borderRadius: 8, marginTop: 8 },
  previewImage: { width: 36, height: 36, borderRadius: 6, marginRight: 8 },
  previewInfo: { flex: 1 },
  previewName: { fontSize: 12, fontWeight: "600", color: "#273342" },
  previewSize: { fontSize: 10, color: "#777987" },
  removePhotoBtn: { padding: 4 },
  submitBtn: { backgroundColor: "#45B84A", borderRadius: 10, paddingVertical: 13, alignItems: "center", justifyContent: "center", marginTop: 14, marginBottom: 6 },
  submitBtnDisabled: { opacity: 0.7 },
  submitBtnText: { color: "#FFFFFF", fontSize: 16, fontWeight: "800" },
  /* Success View Styles */
  successContainer: { backgroundColor: "#F9FAFC" },
  successHeader: { flexDirection: "row", justifyContent: "flex-end", alignItems: "center", paddingHorizontal: 18, paddingTop: 16, paddingBottom: 12 },
  successBody: { alignItems: "center", justifyContent: "center", paddingHorizontal: 24, paddingTop: 36, paddingBottom: 42 },
  smileCircle: { width: 116, height: 116, borderRadius: 58, borderWidth: 10, borderColor: "#FF3B30", alignItems: "center", justifyContent: "center", marginBottom: 24 },
  eyesRow: { flexDirection: "row", justifyContent: "space-between", width: 58, marginBottom: 6, marginTop: 6 },
  eyeArc: { width: 18, height: 11, borderTopLeftRadius: 11, borderTopRightRadius: 11, borderWidth: 4.5, borderBottomWidth: 0, borderColor: "#FF3B30" },
  smileMouth: { width: 54, height: 25, backgroundColor: "#FF3B30", borderBottomLeftRadius: 27, borderBottomRightRadius: 27 },
  thankYouTitle: { fontSize: 28, fontWeight: "900", color: "#DE2226", marginBottom: 16, textAlign: "center" },
  thankYouSubtitle: { fontSize: 14.5, lineHeight: 21, color: "#E05252", textAlign: "center", fontWeight: "400", paddingHorizontal: 6 },
});
