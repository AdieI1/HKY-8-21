import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  Modal,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  ActivityIndicator,
  Linking,
  Alert,
} from "react-native";
import { Image } from "expo-image";
import * as WebBrowser from "expo-web-browser";
import Ionicons from "@expo/vector-icons/Ionicons";
import { resolveStorageUrl } from "../utils/imageUrl";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

const PERMIT_IMAGE_HEADERS = {
  "ngrok-skip-browser-warning": "true",
};

const isPdfUrl = (url) => {
  if (!url) return false;
  const s = String(url).toLowerCase();
  return s.startsWith("data:application/pdf") || /\.pdf(\?.*)?$/i.test(s);
};

const isDocumentUrl = (url) => {
  if (!url) return false;
  const s = String(url).toLowerCase();
  return (
    isPdfUrl(s) ||
    s.startsWith("data:application/") ||
    s.startsWith("data:text/") ||
    /\.(doc|docx|xls|xlsx|txt|csv)(\?.*)?$/i.test(s)
  );
};

const getFileLabel = (url, fallback = "Permit Document") => {
  if (!url) return fallback;
  try {
    const clean = String(url).split("?")[0];
    const parts = clean.split("/");
    const last = parts[parts.length - 1];
    return last ? decodeURIComponent(last) : fallback;
  } catch {
    return fallback;
  }
};

function PermitAttachmentPreview({ url, title, onEnlargeImage, onOpenDocument }) {
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [retryKey, setRetryKey] = useState(0);

  useEffect(() => {
    setLoading(true);
    setFailed(false);
  }, [url, retryKey]);

  const isDoc = isDocumentUrl(url);
  const isPdf = isPdfUrl(url);

  if (isDoc) {
    return (
      <TouchableOpacity
        activeOpacity={0.85}
        onPress={() => onOpenDocument(url)}
        style={styles.documentCard}
      >
        <View style={[styles.docIconCircle, isPdf ? styles.docIconPdf : styles.docIconFile]}>
          <Ionicons
            name={isPdf ? "document-text" : "document-attach"}
            size={28}
            color={isPdf ? "#DC2626" : "#2563EB"}
          />
        </View>
        <View style={styles.docInfo}>
          <Text style={styles.docBadgeText}>{isPdf ? "PDF DOCUMENT" : "ATTACHED FILE"}</Text>
          <Text style={styles.docFileName} numberOfLines={1}>
            {getFileLabel(url, title)}
          </Text>
          <Text style={styles.docHint}>Tap to view or download official copy</Text>
        </View>
        <View style={styles.docOpenBtn}>
          <Ionicons name="open-outline" size={18} color="#FFFFFF" />
          <Text style={styles.docOpenBtnText}>View</Text>
        </View>
      </TouchableOpacity>
    );
  }

  return (
    <View style={styles.permitPreviewContainer}>
      <TouchableOpacity
        activeOpacity={0.9}
        onPress={() => {
          if (failed) {
            setRetryKey((k) => k + 1);
          } else {
            onEnlargeImage(url, title);
          }
        }}
        style={styles.imageTouchable}
      >
        {!failed ? (
          <>
            <Image
              key={`${url}-${retryKey}`}
              source={{ uri: url, headers: PERMIT_IMAGE_HEADERS }}
              style={styles.permitThumbnail}
              contentFit="cover"
              cachePolicy="memory-disk"
              transition={150}
              onLoadStart={() => setLoading(true)}
              onLoad={() => setLoading(false)}
              onError={() => {
                setLoading(false);
                setFailed(true);
              }}
            />
            {loading && (
              <View style={styles.loadingOverlay}>
                <ActivityIndicator size="small" color="#951F21" />
                <Text style={styles.loadingText}>Loading permit image...</Text>
              </View>
            )}
            {!loading && (
              <View style={styles.tapToZoomOverlay}>
                <Ionicons name="expand" size={16} color="#FFFFFF" />
                <Text style={styles.tapToZoomText}>Tap to enlarge</Text>
              </View>
            )}
          </>
        ) : (
          <View style={styles.errorPreviewBox}>
            <Ionicons name="cloud-offline-outline" size={28} color="#9CA3AF" />
            <Text style={styles.errorPreviewTitle}>Could not load image preview</Text>
            <View style={styles.errorActionRow}>
              <TouchableOpacity
                style={styles.retryBtn}
                onPress={() => setRetryKey((k) => k + 1)}
              >
                <Ionicons name="refresh" size={14} color="#FFFFFF" />
                <Text style={styles.retryBtnText}>Retry</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.openBrowserBtn}
                onPress={() => onOpenDocument(url)}
              >
                <Ionicons name="open-outline" size={14} color="#1D4ED8" />
                <Text style={styles.openBrowserBtnText}>Open File</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </TouchableOpacity>
    </View>
  );
}

export default function DeliveryPermitsModal({
  visible,
  onClose,
  delivery = {},
}) {
  const [fullscreenImage, setFullscreenImage] = useState(null);
  const [fullscreenTitle, setFullscreenTitle] = useState("");
  const [fullscreenLoading, setFullscreenLoading] = useState(false);

  const openPermitDocument = async (url) => {
    if (!url) return;
    try {
      await WebBrowser.openBrowserAsync(url, {
        presentationStyle: WebBrowser.WebBrowserPresentationStyle.FULL_SCREEN,
      });
    } catch {
      try {
        const supported = await Linking.canOpenURL(url);
        if (supported) {
          await Linking.openURL(url);
        } else {
          Alert.alert("Cannot Open File", "Unable to open this permit document on your device.");
        }
      } catch {
        Alert.alert("Cannot Open File", "Unable to open this permit document on your device.");
      }
    }
  };

  const request = delivery?.request || {};

  const rawItemPermit =
    delivery?.item_permit_url ||
    request?.item_permit_url ||
    delivery?.itemPermitUrl ||
    request?.item_permit_path ||
    delivery?.item_permit_path ||
    null;

  const itemPermitUrl = resolveStorageUrl(rawItemPermit);

  const itemPermitType =
    delivery?.item_permit_type ||
    request?.item_permit_type ||
    delivery?.itemPermitType ||
    "Cargo Clearance / Quarantine Pass";

  const rawAreaPermit =
    delivery?.area_permit_url ||
    delivery?.areaPermitUrl ||
    delivery?.area_permit_path ||
    request?.area_permit_url ||
    null;

  const areaPermitUrl = resolveStorageUrl(rawAreaPermit);

  const areaPermitType =
    delivery?.area_permit_type ||
    delivery?.areaPermitType ||
    "Mindanao Regional Route Clearance";

  const permitNotes =
    delivery?.permit_notes ||
    delivery?.permitNotes ||
    "";

  const hasItemPermit = Boolean(itemPermitUrl);
  const hasAreaPermit = Boolean(areaPermitUrl);
  const hasAnyPermit = hasItemPermit || hasAreaPermit;

  const cargoType = request?.cargo_type || delivery?.cargo_type || delivery?.cargoDescription || "General Cargo";
  const itemName = request?.item_name || delivery?.item_name || "—";
  const dropoff = request?.dropoff_address || delivery?.dropoff || delivery?.destination || "—";

  return (
    <>
      <Modal
        visible={visible}
        animationType="slide"
        transparent
        onRequestClose={onClose}
      >
        <View style={styles.overlay}>
          <View style={styles.modal}>
            {/* Header */}
            <View style={styles.header}>
              <View style={styles.headerLeft}>
                <View style={styles.shieldIconWrap}>
                  <Ionicons name="shield-checkmark" size={24} color="#FFFFFF" />
                </View>
                <View>
                  <Text style={styles.headerTitle}>Delivery Permits</Text>
                  <Text style={styles.headerSub}>
                    Official Checkpoint Soft Copies
                  </Text>
                </View>
              </View>

              <TouchableOpacity
                onPress={onClose}
                style={styles.closeButton}
                activeOpacity={0.8}
              >
                <Ionicons name="close" size={24} color="#FFFFFF" />
              </TouchableOpacity>
            </View>

            {/* Scrollable Content */}
            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.content}
            >
              {/* Checkpoint Notice Banner */}
              <View style={styles.noticeBanner}>
                <Ionicons
                  name="information-circle"
                  size={20}
                  color="#1D4ED8"
                  style={{ marginTop: 1 }}
                />
                <Text style={styles.noticeText}>
                  Present these digital copies to quarantine officers, LGU
                  inspectors, and PNP highway checkpoints upon request.
                </Text>
              </View>

              {/* SECTION 1: ITEM DELIVERY PERMIT */}
              <View style={styles.sectionCard}>
                <View style={styles.sectionHeader}>
                  <View style={styles.sectionHeaderLeft}>
                    <Ionicons name="cube" size={18} color="#951F21" />
                    <Text style={styles.sectionTitle}>
                      Item Delivery Permit
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.badge,
                      hasItemPermit ? styles.badgeSuccess : styles.badgeMuted,
                    ]}
                  >
                    <Ionicons
                      name={hasItemPermit ? "checkmark-circle" : "alert-circle"}
                      size={13}
                      color={hasItemPermit ? "#047857" : "#6B7280"}
                    />
                    <Text
                      style={[
                        styles.badgeText,
                        hasItemPermit
                          ? styles.badgeTextSuccess
                          : styles.badgeTextMuted,
                      ]}
                    >
                      {hasItemPermit ? "Attached" : "Not Required"}
                    </Text>
                  </View>
                </View>

                <View style={styles.metaRow}>
                  <Text style={styles.metaLabel}>Cargo Type:</Text>
                  <Text style={styles.metaValue}>{cargoType}</Text>
                </View>
                <View style={styles.metaRow}>
                  <Text style={styles.metaLabel}>Item Name:</Text>
                  <Text style={styles.metaValue}>{itemName}</Text>
                </View>
                <View style={styles.metaRow}>
                  <Text style={styles.metaLabel}>Permit Category:</Text>
                  <Text style={styles.metaValueHighlight}>
                    {hasItemPermit ? itemPermitType : "General / Exempt Commodity"}
                  </Text>
                </View>

                {hasItemPermit ? (
                  <PermitAttachmentPreview
                    url={itemPermitUrl}
                    title={itemPermitType || "Item Delivery Permit"}
                    onEnlargeImage={(uri, ttl) => {
                      setFullscreenLoading(true);
                      setFullscreenImage(uri);
                      setFullscreenTitle(ttl);
                    }}
                    onOpenDocument={openPermitDocument}
                  />
                ) : (
                  <View style={styles.emptyPermitNotice}>
                    <Ionicons name="shield-outline" size={20} color="#9CA3AF" />
                    <Text style={styles.emptyPermitText}>
                      No specific commodity quarantine permit is required for this cargo.
                    </Text>
                  </View>
                )}
              </View>

              {/* SECTION 2: AREA / ROUTE DELIVERY PERMIT */}
              <View style={styles.sectionCard}>
                <View style={styles.sectionHeader}>
                  <View style={styles.sectionHeaderLeft}>
                    <Ionicons name="map" size={18} color="#951F21" />
                    <Text style={styles.sectionTitle}>
                      Area / Route Delivery Permit
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.badge,
                      hasAreaPermit ? styles.badgeSuccess : styles.badgeMuted,
                    ]}
                  >
                    <Ionicons
                      name={hasAreaPermit ? "checkmark-circle" : "alert-circle"}
                      size={13}
                      color={hasAreaPermit ? "#047857" : "#6B7280"}
                    />
                    <Text
                      style={[
                        styles.badgeText,
                        hasAreaPermit
                          ? styles.badgeTextSuccess
                          : styles.badgeTextMuted,
                      ]}
                    >
                      {hasAreaPermit ? "Attached" : "Open Route"}
                    </Text>
                  </View>
                </View>

                <View style={styles.metaRow}>
                  <Text style={styles.metaLabel}>Permit Type:</Text>
                  <Text style={styles.metaValueHighlight}>
                    {hasAreaPermit ? areaPermitType : "Standard Route Transit"}
                  </Text>
                </View>
                <View style={styles.metaRow}>
                  <Text style={styles.metaLabel}>Destination:</Text>
                  <Text style={styles.metaValue} numberOfLines={1}>
                    {dropoff}
                  </Text>
                </View>
                {permitNotes ? (
                  <View style={styles.metaRow}>
                    <Text style={styles.metaLabel}>Permit Notes:</Text>
                    <Text style={styles.metaValueNotes}>{permitNotes}</Text>
                  </View>
                ) : null}

                {hasAreaPermit ? (
                  <PermitAttachmentPreview
                    url={areaPermitUrl}
                    title={areaPermitType || "Area Delivery Permit"}
                    onEnlargeImage={(uri, ttl) => {
                      setFullscreenLoading(true);
                      setFullscreenImage(uri);
                      setFullscreenTitle(ttl);
                    }}
                    onOpenDocument={openPermitDocument}
                  />
                ) : (
                  <View style={styles.emptyPermitNotice}>
                    <Ionicons name="compass-outline" size={20} color="#9CA3AF" />
                    <Text style={styles.emptyPermitText}>
                      No restricted territory travel clearance attached for this route.
                    </Text>
                  </View>
                )}
              </View>

              {/* Status footer info */}
              <View style={styles.footerNoteCard}>
                <Ionicons name="checkmark-done-circle" size={18} color="#059669" />
                <Text style={styles.footerNoteText}>
                  {hasAnyPermit
                    ? "Permits verified and issued by HJY Dispatch. Driver is cleared to proceed along designated route."
                    : "Standard logistics protocol applies. Driver Trip Ticket serves as primary dispatch authorization."}
                </Text>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Fullscreen Document Viewer Modal */}
      <Modal
        visible={Boolean(fullscreenImage)}
        animationType="fade"
        transparent
        onRequestClose={() => setFullscreenImage(null)}
      >
        <View style={styles.fullscreenOverlay}>
          <View style={styles.fullscreenHeader}>
            <Text style={styles.fullscreenTitle} numberOfLines={1}>
              {fullscreenTitle}
            </Text>
            <TouchableOpacity
              onPress={() => openPermitDocument(fullscreenImage)}
              style={styles.fullscreenCloseButton}
            >
              <Ionicons name="open-outline" size={22} color="#FFFFFF" />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setFullscreenImage(null)}
              style={styles.fullscreenCloseButton}
            >
              <Ionicons name="close" size={26} color="#FFFFFF" />
            </TouchableOpacity>
          </View>

          <View style={styles.fullscreenBody}>
            {fullscreenImage && (
              <>
                <Image
                  source={{ uri: fullscreenImage, headers: PERMIT_IMAGE_HEADERS }}
                  style={styles.fullscreenImage}
                  contentFit="contain"
                  cachePolicy="memory-disk"
                  transition={150}
                  onLoadStart={() => setFullscreenLoading(true)}
                  onLoad={() => setFullscreenLoading(false)}
                  onError={() => setFullscreenLoading(false)}
                />
                {fullscreenLoading && (
                  <View style={styles.fullscreenLoader}>
                    <ActivityIndicator size="large" color="#FFFFFF" />
                  </View>
                )}
              </>
            )}
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.55)",
    justifyContent: "flex-end",
  },
  modal: {
    height: "88%",
    backgroundColor: "#F3F4F6",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    overflow: "hidden",
  },
  header: {
    backgroundColor: "#951F21",
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  shieldIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  headerSub: {
    fontSize: 12,
    color: "rgba(255, 255, 255, 0.8)",
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255, 255, 255, 0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  content: {
    padding: 16,
    paddingBottom: 40,
    gap: 14,
  },
  noticeBanner: {
    flexDirection: "row",
    gap: 10,
    backgroundColor: "#EFF6FF",
    borderLeftWidth: 4,
    borderLeftColor: "#2563EB",
    padding: 12,
    borderRadius: 8,
  },
  noticeText: {
    flex: 1,
    fontSize: 12.5,
    color: "#1E40AF",
    lineHeight: 18,
  },
  sectionCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  sectionHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#1F2937",
  },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  badgeSuccess: {
    backgroundColor: "#D1FAE5",
  },
  badgeMuted: {
    backgroundColor: "#F3F4F6",
  },
  badgeText: {
    fontSize: 11,
    fontWeight: "600",
  },
  badgeTextSuccess: {
    color: "#047857",
  },
  badgeTextMuted: {
    color: "#6B7280",
  },
  metaRow: {
    flexDirection: "row",
    marginBottom: 6,
    gap: 6,
  },
  metaLabel: {
    fontSize: 12.5,
    color: "#6B7280",
    width: 110,
  },
  metaValue: {
    flex: 1,
    fontSize: 12.5,
    color: "#1F2937",
    fontWeight: "500",
  },
  metaValueHighlight: {
    flex: 1,
    fontSize: 12.5,
    color: "#0369A1",
    fontWeight: "600",
  },
  metaValueNotes: {
    flex: 1,
    fontSize: 12,
    color: "#4B5563",
    fontStyle: "italic",
  },
  permitPreviewContainer: {
    marginTop: 8,
    borderRadius: 8,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  imageTouchable: {
    position: "relative",
  },
  permitThumbnail: {
    width: "100%",
    height: 180,
    backgroundColor: "#F9FAFB",
  },
  tapToZoomOverlay: {
    position: "absolute",
    bottom: 8,
    right: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  tapToZoomText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "600",
  },
  emptyPermitNotice: {
    marginTop: 6,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#F9FAFB",
    padding: 10,
    borderRadius: 6,
  },
  emptyPermitText: {
    flex: 1,
    fontSize: 12,
    color: "#6B7280",
  },
  footerNoteCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    backgroundColor: "#ECFDF5",
    borderWidth: 1,
    borderColor: "#A7F3D0",
    borderRadius: 8,
    padding: 10,
  },
  footerNoteText: {
    flex: 1,
    fontSize: 11.5,
    color: "#065F46",
    lineHeight: 16,
  },
  fullscreenOverlay: {
    flex: 1,
    backgroundColor: "#000000",
  },
  fullscreenHeader: {
    height: 60,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    backgroundColor: "rgba(0, 0, 0, 0.8)",
  },
  fullscreenTitle: {
    flex: 1,
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
    marginRight: 12,
  },
  fullscreenCloseButton: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  fullscreenBody: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  fullscreenImage: {
    width: SCREEN_WIDTH,
    height: "100%",
  },
  fullscreenLoader: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: "center",
    justifyContent: "center",
  },
  loadingOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(249, 250, 251, 0.85)",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  loadingText: {
    fontSize: 12,
    color: "#6B7280",
    fontWeight: "500",
  },
  errorPreviewBox: {
    height: 160,
    backgroundColor: "#F9FAFB",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
    gap: 8,
  },
  errorPreviewTitle: {
    fontSize: 12.5,
    color: "#4B5563",
    fontWeight: "600",
  },
  errorActionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: 4,
  },
  retryBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "#951F21",
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 6,
  },
  retryBtnText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "700",
  },
  openBrowserBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "#EFF6FF",
    borderWidth: 1,
    borderColor: "#BFDBFE",
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 6,
  },
  openBrowserBtnText: {
    color: "#1D4ED8",
    fontSize: 12,
    fontWeight: "700",
  },
  documentCard: {
    marginTop: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 10,
    padding: 12,
  },
  docIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  docIconPdf: {
    backgroundColor: "#FEF2F2",
    borderWidth: 1,
    borderColor: "#FECACA",
  },
  docIconFile: {
    backgroundColor: "#EFF6FF",
    borderWidth: 1,
    borderColor: "#BFDBFE",
  },
  docInfo: {
    flex: 1,
  },
  docBadgeText: {
    fontSize: 10,
    fontWeight: "800",
    color: "#991B1B",
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  docFileName: {
    fontSize: 13,
    fontWeight: "700",
    color: "#0F172A",
  },
  docHint: {
    fontSize: 11,
    color: "#64748B",
    marginTop: 2,
  },
  docOpenBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#951F21",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  docOpenBtnText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "700",
  },
});
