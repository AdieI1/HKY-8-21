import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Image,
  ActivityIndicator,
  Alert,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import Ionicons from "@expo/vector-icons/Ionicons";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import * as ImagePicker from "expo-image-picker";
import * as Location from "expo-location";
import {
  getDelivery,
  submitIncidentReport,
  getActiveAcceptedDeliveryId,
} from "../../services/api";

const ISSUE_TYPES = [
  {
    id: "vehicle_breakdown",
    label: "Vehicle Breakdown",
    iconFamily: "MaterialCommunityIcons",
    iconName: "truck-alert",
  },
  {
    id: "flat_tire",
    label: "Flat / Damaged Tire",
    iconFamily: "MaterialCommunityIcons",
    iconName: "tire",
  },
  {
    id: "accident",
    label: "Accident",
    iconFamily: "MaterialCommunityIcons",
    iconName: "car-emergency",
  },
  {
    id: "vehicle_problem",
    label: "Vehicle Problem",
    iconFamily: "MaterialCommunityIcons",
    iconName: "engine",
  },
  {
    id: "cargo_damage",
    label: "Cargo / Damage Issue",
    iconFamily: "MaterialCommunityIcons",
    iconName: "package-variant-closed-remove",
  },
  {
    id: "road_issue",
    label: "Road / Route Issue",
    iconFamily: "MaterialCommunityIcons",
    iconName: "road-variant",
  },
  {
    id: "other",
    label: "Other",
    iconFamily: "MaterialCommunityIcons",
    iconName: "dots-horizontal",
  },
];

export default function ReportIssueScreen() {
  const { deliveryId } = useLocalSearchParams();
  const rawId =
    deliveryId && deliveryId !== "undefined" && deliveryId !== "null"
      ? String(deliveryId)
      : null;
  const [resolvedDeliveryId, setResolvedDeliveryId] = useState(rawId);
  const [delivery, setDelivery] = useState(null);
  const [loadingDelivery, setLoadingDelivery] = useState(true);

  const [selectedIssues, setSelectedIssues] = useState(["vehicle_breakdown"]);
  const [description, setDescription] = useState("");
  const [photos, setPhotos] = useState([]);
  const [coords, setCoords] = useState(null);
  const [locationAddress, setLocationAddress] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleToggleIssue = (issueId) => {
    setSelectedIssues((prev) => {
      if (prev.includes(issueId)) {
        if (prev.length === 1) {
          Alert.alert("Selection Required", "Please keep at least one issue selected.");
          return prev;
        }
        return prev.filter((id) => id !== issueId);
      } else {
        return [...prev, issueId];
      }
    });
  };

  // Fetch delivery details for top card
  useEffect(() => {
    let isMounted = true;

    (async () => {
      let targetId = rawId;
      if (!targetId) {
        try {
          const stored = await getActiveAcceptedDeliveryId();
          if (stored && stored !== "undefined" && stored !== "null") {
            targetId = String(stored);
          }
        } catch (e) {
          console.warn("Could not read stored active delivery ID:", e);
        }
      }

      if (targetId && isMounted) {
        setResolvedDeliveryId(targetId);
        try {
          const data = await getDelivery(targetId);
          if (isMounted) setDelivery(data);
        } catch (err) {
          console.warn("Failed to fetch delivery for report:", err);
        } finally {
          if (isMounted) setLoadingDelivery(false);
        }
      } else {
        if (isMounted) setLoadingDelivery(false);
      }
    })();

    return () => {
      isMounted = false;
    };
  }, [rawId]);

  // Fetch GPS location
  useEffect(() => {
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === "granted") {
          const loc = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.Balanced,
          });
          if (loc?.coords) {
            setCoords({
              latitude: loc.coords.latitude,
              longitude: loc.coords.longitude,
            });

            // Reverse geocode to get street / city address
            const geocode = await Location.reverseGeocodeAsync({
              latitude: loc.coords.latitude,
              longitude: loc.coords.longitude,
            });
            if (geocode && geocode.length > 0) {
              const item = geocode[0];
              const parts = [
                item.streetNumber,
                item.street,
                item.district,
                item.city,
                item.region,
              ].filter(Boolean);
              setLocationAddress(parts.join(", "));
            }
          }
        }
      } catch (e) {
        console.warn("Could not obtain location:", e);
      }
    })();
  }, []);

  const handleTakePhoto = async () => {
    if (photos.length >= 5) {
      Alert.alert("Maximum Photos", "You can upload up to 5 photos.");
      return;
    }

    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(
          "Permission Required",
          "Camera permission is required to take photos."
        );
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ["images"],
        allowsEditing: false,
        quality: 0.25,
        base64: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        const uriString = asset.base64
          ? `data:image/jpeg;base64,${asset.base64}`
          : asset.uri;
        setPhotos((prev) => [...prev, uriString]);
      }
    } catch (err) {
      Alert.alert("Camera Error", err?.message || "Could not take photo.");
    }
  };

  const handlePickPhoto = async () => {
    if (photos.length >= 5) {
      Alert.alert("Maximum Photos", "You can upload up to 5 photos.");
      return;
    }

    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(
          "Permission Required",
          "Permission to access photo gallery is required to upload images."
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsEditing: false,
        quality: 0.25,
        base64: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        const uriString = asset.base64
          ? `data:image/jpeg;base64,${asset.base64}`
          : asset.uri;
        setPhotos((prev) => [...prev, uriString]);
      }
    } catch (err) {
      Alert.alert("Photo Error", err?.message || "Could not select photo.");
    }
  };

  const handleAddPhotoPrompt = () => {
    if (photos.length >= 5) {
      Alert.alert("Maximum Photos", "You can upload up to 5 photos.");
      return;
    }

    Alert.alert("Add Incident Photo", "Choose an option:", [
      { text: "Take Photo", onPress: handleTakePhoto },
      { text: "Choose from Gallery", onPress: handlePickPhoto },
      { text: "Cancel", style: "cancel" },
    ]);
  };

  const handleRemovePhoto = (index) => {
    setPhotos((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (!description.trim()) {
      Alert.alert("Missing Details", "Please provide a description of the issue.");
      return;
    }

    const finalDeliveryId =
      resolvedDeliveryId ||
      delivery?.delivery_id ||
      delivery?.id;

    if (!finalDeliveryId || isNaN(Number(finalDeliveryId))) {
      Alert.alert(
        "Missing Delivery Information",
        "Could not identify the delivery for this report. Please return to navigation and try again."
      );
      return;
    }

    setSubmitting(true);
    try {
      const isHighSeverity =
        selectedIssues.includes("accident") ||
        (selectedIssues.includes("cargo_damage") &&
          (selectedIssues.includes("vehicle_breakdown") ||
            selectedIssues.includes("flat_tire") ||
            selectedIssues.includes("vehicle_problem")));

      const payload = {
        delivery_id: Number(finalDeliveryId),
        incident_type: selectedIssues[0] || "other",
        incident_types: selectedIssues,
        severity: isHighSeverity ? "high" : "medium",
        description: description.trim(),
        location_address: locationAddress || null,
        latitude: coords?.latitude || null,
        longitude: coords?.longitude || null,
        photo_proof: photos.length > 0 ? photos[0] : null,
        photos: photos,
        status: "pending",
      };

      await submitIncidentReport(payload);

      Alert.alert(
        "Report Submitted",
        "Your incident report has been dispatched to management and staff.",
        [
          {
            text: "OK",
            onPress: () => router.back(),
          },
        ]
      );
    } catch (error) {
      Alert.alert(
        "Submission Failed",
        error?.message || "Could not submit the incident report. Please try again."
      );
    } finally {
      setSubmitting(false);
    }
  };

  const requestCode = delivery?.request?.request_id
    ? `RQ${String(delivery.request.request_id).padStart(5, "0")}`
    : resolvedDeliveryId
      ? `DEL-${String(resolvedDeliveryId).padStart(5, "0")}`
      : "DEL-00001";

  const customerName =
    delivery?.request?.customer?.full_name ||
    delivery?.request?.contact_person ||
    "Customer";

  const pickupLocation =
    delivery?.request?.pickup_address ||
    delivery?.request?.pickup_location ||
    "Origin / Pickup location";

  const dropoffLocation =
    delivery?.request?.delivery_address ||
    delivery?.request?.dropoff_location ||
    "Destination / Drop-off location";

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      {/* Top Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="chevron-back" size={26} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Report Issue</Text>
        <View style={styles.headerRightPlaceholder} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Active Delivery Summary Card */}
        <View style={styles.deliveryCard}>
          <View style={styles.deliveryCardHeader}>
            <View style={styles.deliveryIconCircle}>
              <Ionicons name="map-outline" size={20} color="#8B1E1E" />
            </View>
            <View style={styles.deliveryInfoBlock}>
              <Text style={styles.requestCode}>{requestCode}</Text>
              <Text style={styles.customerName}>{customerName}</Text>
            </View>
            <View style={styles.inTransitBadge}>
              <Ionicons name="car-outline" size={14} color="#DC2626" />
              <Text style={styles.inTransitText}>In Transit</Text>
            </View>
          </View>

          <View style={styles.deliveryRouteContainer}>
            <View style={styles.routeRow}>
              <Ionicons name="radio-button-on" size={14} color="#6B7280" />
              <Text style={styles.routeText} numberOfLines={1}>
                {pickupLocation}
              </Text>
            </View>
            <View style={styles.routeLine} />
            <View style={styles.routeRow}>
              <Ionicons name="location-sharp" size={15} color="#DC2626" />
              <Text style={styles.routeDropoffText} numberOfLines={1}>
                Drop-off: {dropoffLocation}
              </Text>
            </View>
          </View>

          {locationAddress ? (
            <View style={styles.currentGpsBadge}>
              <Ionicons name="navigate-circle-outline" size={15} color="#4B5563" />
              <Text style={styles.gpsText} numberOfLines={1}>
                Current Spot: {locationAddress}
              </Text>
            </View>
          ) : null}
        </View>

        {/* Section 1: Select Issue Type */}
        <View style={styles.sectionHeader}>
          <View style={styles.sectionTitleRow}>
            <Text style={styles.sectionTitle}>Select Issue Type(s)</Text>
            <View style={styles.selectedCountBadge}>
              <Text style={styles.selectedCountText}>
                {selectedIssues.length} Selected
              </Text>
            </View>
          </View>
          <Text style={styles.sectionSubtitle}>
            Tap to select one or multiple issues (e.g. Flat Tire + Cargo Damage).
          </Text>
        </View>

        <View style={styles.issuesGrid}>
          {ISSUE_TYPES.map((issue) => {
            const isSelected = selectedIssues.includes(issue.id);
            return (
              <TouchableOpacity
                key={issue.id}
                style={[
                  styles.issueCard,
                  isSelected && styles.issueCardSelected,
                ]}
                onPress={() => handleToggleIssue(issue.id)}
                activeOpacity={0.8}
              >
                {isSelected ? (
                  <View style={styles.selectedBadge}>
                    <Ionicons name="checkmark-circle" size={19} color="#DC2626" />
                  </View>
                ) : (
                  <View style={styles.unselectedBadge}>
                    <Ionicons name="ellipse-outline" size={17} color="#D1D5DB" />
                  </View>
                )}

                <View style={styles.issueIconWrapper}>
                  <MaterialCommunityIcons
                    name={issue.iconName}
                    size={28}
                    color={isSelected ? "#DC2626" : "#4B5563"}
                  />
                </View>
                <Text
                  style={[
                    styles.issueLabel,
                    isSelected && styles.issueLabelSelected,
                  ]}
                  numberOfLines={2}
                >
                  {issue.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Compound Advisory Notice if Vehicle + Cargo are both selected */}
        {selectedIssues.includes("cargo_damage") &&
          (selectedIssues.includes("vehicle_breakdown") ||
            selectedIssues.includes("flat_tire") ||
            selectedIssues.includes("vehicle_problem")) && (
          <View style={styles.compoundNotice}>
            <Ionicons name="alert-circle" size={20} color="#B91C1C" />
            <View style={{ flex: 1 }}>
              <Text style={styles.compoundNoticeTitle}>Compound Issue Detected</Text>
              <Text style={styles.compoundNoticeText}>
                Vehicle issue + Cargo damage reported. Dispatch will evaluate cargo before transshipment. Please attach photos of both!
              </Text>
            </View>
          </View>
        )}

        {/* Section 2: Description */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Description</Text>
          <Text style={styles.sectionSubtitle}>
            Provide more details about the issue (location, what happened, etc.).
          </Text>
        </View>

        <View style={styles.descriptionContainer}>
          <TextInput
            style={styles.descriptionInput}
            multiline
            placeholder="Enter description here..."
            placeholderTextColor="#9CA3AF"
            value={description}
            onChangeText={(text) => {
              if (text.length <= 500) setDescription(text);
            }}
          />
          <Text style={styles.counterText}>{description.length}/500</Text>
        </View>

        {/* Section 3: Add Photos */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Add Photos (Optional)</Text>
          <Text style={styles.sectionSubtitle}>
            Attach images to help us understand the issue better.
          </Text>
        </View>

        <TouchableOpacity
          style={styles.uploadDashedBox}
          onPress={handleAddPhotoPrompt}
          activeOpacity={0.7}
        >
          <Ionicons name="camera" size={32} color="#6B7280" />
          <Text style={styles.uploadTitle}>Tap to add photos</Text>
          <Text style={styles.uploadSubtitle}>
            You can add up to 5 photos ({photos.length}/5 added)
          </Text>
        </TouchableOpacity>

        {/* Photo Thumbnails */}
        {photos.length > 0 && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.thumbnailsScroll}
          >
            {photos.map((photoUri, index) => (
              <View key={index} style={styles.thumbnailWrapper}>
                <Image source={{ uri: photoUri }} style={styles.thumbnailImage} />
                <TouchableOpacity
                  style={styles.removePhotoBtn}
                  onPress={() => handleRemovePhoto(index)}
                >
                  <Ionicons name="close-circle" size={20} color="#DC2626" />
                </TouchableOpacity>
              </View>
            ))}
          </ScrollView>
        )}

        {/* Submit Button */}
        <TouchableOpacity
          style={[styles.submitButton, submitting && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={submitting}
          activeOpacity={0.85}
        >
          {submitting ? (
            <ActivityIndicator color="#FFFFFF" size="small" />
          ) : (
            <View style={styles.submitContentRow}>
              <Ionicons name="send" size={18} color="#FFFFFF" />
              <Text style={styles.submitButtonText}>Submit Report</Text>
            </View>
          )}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#731A1A",
  },
  header: {
    height: 56,
    backgroundColor: "#731A1A",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
  },
  backButton: {
    width: 38,
    height: 38,
    justifyContent: "center",
    alignItems: "flex-start",
  },
  headerTitle: {
    color: "#FFFFFF",
    fontSize: 20,
    fontWeight: "700",
  },
  headerRightPlaceholder: {
    width: 38,
  },
  scroll: {
    flex: 1,
    backgroundColor: "#F9FAFB",
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 40,
  },

  /* Active Delivery Summary Card */
  deliveryCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 14,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
  },
  deliveryCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  deliveryIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#FEE2E2",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  deliveryInfoBlock: {
    flex: 1,
  },
  requestCode: {
    fontSize: 12,
    fontWeight: "600",
    color: "#6B7280",
    letterSpacing: 0.5,
  },
  customerName: {
    fontSize: 15,
    fontWeight: "700",
    color: "#1F2937",
    marginTop: 1,
  },
  inTransitBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FEE2E2",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  inTransitText: {
    color: "#DC2626",
    fontSize: 11,
    fontWeight: "700",
  },
  deliveryRouteContainer: {
    backgroundColor: "#F9FAFB",
    borderRadius: 8,
    padding: 10,
    borderLeftWidth: 3,
    borderLeftColor: "#DC2626",
  },
  routeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  routeLine: {
    height: 10,
    marginLeft: 6,
    borderLeftWidth: 1.5,
    borderLeftColor: "#D1D5DB",
    borderStyle: "dashed",
    marginVertical: 2,
  },
  routeText: {
    fontSize: 12,
    color: "#4B5563",
    flex: 1,
  },
  routeDropoffText: {
    fontSize: 12,
    color: "#1F2937",
    fontWeight: "600",
    flex: 1,
  },
  currentGpsBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#F3F4F6",
  },
  gpsText: {
    fontSize: 11,
    color: "#6B7280",
    flex: 1,
  },

  /* Section Headings */
  sectionHeader: {
    marginBottom: 10,
  },
  sectionTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#1F2937",
  },
  selectedCountBadge: {
    backgroundColor: "#FEE2E2",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  selectedCountText: {
    color: "#DC2626",
    fontSize: 11,
    fontWeight: "700",
  },
  sectionSubtitle: {
    fontSize: 12,
    color: "#6B7280",
    marginTop: 2,
  },

  /* Issue Grid */
  issuesGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 16,
  },
  issueCard: {
    width: "48%",
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderWidth: 1.5,
    borderColor: "#E5E7EB",
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
    minHeight: 90,
  },
  issueCardSelected: {
    backgroundColor: "#FFF5F5",
    borderColor: "#DC2626",
  },
  selectedBadge: {
    position: "absolute",
    top: 6,
    right: 6,
  },
  unselectedBadge: {
    position: "absolute",
    top: 6,
    right: 6,
  },
  issueIconWrapper: {
    marginBottom: 8,
  },
  issueLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#374151",
    textAlign: "center",
  },
  issueLabelSelected: {
    color: "#DC2626",
    fontWeight: "700",
  },

  /* Compound Notice */
  compoundNotice: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    backgroundColor: "#FEF2F2",
    borderWidth: 1.5,
    borderColor: "#FCA5A5",
    borderRadius: 12,
    padding: 12,
    marginBottom: 20,
  },
  compoundNoticeTitle: {
    color: "#991B1B",
    fontSize: 12,
    fontWeight: "700",
    marginBottom: 2,
  },
  compoundNoticeText: {
    color: "#B91C1C",
    fontSize: 11,
    lineHeight: 16,
  },

  /* Description Box */
  descriptionContainer: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    padding: 12,
    marginBottom: 20,
  },
  descriptionInput: {
    minHeight: 90,
    fontSize: 14,
    color: "#1F2937",
    textAlignVertical: "top",
  },
  counterText: {
    textAlign: "right",
    fontSize: 11,
    color: "#9CA3AF",
    marginTop: 4,
  },

  /* Photos Upload */
  uploadDashedBox: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: "#D1D5DB",
    borderStyle: "dashed",
    paddingVertical: 20,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  uploadTitle: {
    fontSize: 13,
    fontWeight: "600",
    color: "#374151",
    marginTop: 6,
  },
  uploadSubtitle: {
    fontSize: 11,
    color: "#9CA3AF",
    marginTop: 2,
  },
  thumbnailsScroll: {
    flexDirection: "row",
    marginBottom: 20,
  },
  thumbnailWrapper: {
    position: "relative",
    marginRight: 10,
  },
  thumbnailImage: {
    width: 64,
    height: 64,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  removePhotoBtn: {
    position: "absolute",
    top: -6,
    right: -6,
    backgroundColor: "#FFFFFF",
    borderRadius: 10,
  },

  /* Submit Button */
  submitButton: {
    backgroundColor: "#A91F24",
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
    shadowColor: "#A91F24",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitContentRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  submitButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },
});
