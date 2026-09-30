import React, { useEffect, useState, useMemo } from "react";
import {
  ActivityIndicator,
  Dimensions,
  Image,
  Modal,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useTheme } from "../src/context/ThemeContext";
import { getDriverReviews } from "../services/api";

const { width, height } = Dimensions.get("window");

export default function CustomerFeedbackModal({ visible, onClose }) {
  const { theme } = useTheme();

  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState("all");
  const [previewPhoto, setPreviewPhoto] = useState(null);

  const fetchReviews = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const data = await getDriverReviews();
      setReviews(Array.isArray(data) ? data : []);
    } catch (err) {
      console.log("Failed to load customer reviews:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (visible) {
      fetchReviews();
    }
  }, [visible]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchReviews(true);
  };

  const stats = useMemo(() => {
    if (reviews.length === 0) {
      return { average: "0.0", count: 0, fiveStars: 0 };
    }
    const total = reviews.reduce((sum, r) => sum + Number(r.driver_rating || r.overall_rating || 5), 0);
    const avg = (total / reviews.length).toFixed(1);
    const five = reviews.filter((r) => Number(r.driver_rating || r.overall_rating || 5) === 5).length;
    return {
      average: avg,
      count: reviews.length,
      fiveStars: five,
    };
  }, [reviews]);

  const filteredReviews = useMemo(() => {
    if (selectedFilter === "5") {
      return reviews.filter((r) => Number(r.driver_rating || r.overall_rating) === 5);
    }
    if (selectedFilter === "4") {
      return reviews.filter((r) => Number(r.driver_rating || r.overall_rating) === 4);
    }
    if (selectedFilter === "critical") {
      return reviews.filter((r) => Number(r.driver_rating || r.overall_rating) <= 3);
    }
    return reviews;
  }, [reviews, selectedFilter]);

  const renderStars = (rating) => {
    const num = Math.round(Number(rating || 5));
    return (
      <View style={styles.starRow}>
        {[1, 2, 3, 4, 5].map((star) => (
          <Ionicons
            key={star}
            name={star <= num ? "star" : "star-outline"}
            size={15}
            color="#F59E0B"
            style={{ marginRight: 2 }}
          />
        ))}
      </View>
    );
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return "Recent delivery";
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return String(dateStr);
    return d.toLocaleDateString("en-PH", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={false}
      onRequestClose={onClose}
    >
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        {/* HEADER */}
        <View style={[styles.header, { backgroundColor: theme.header }]}>
          <TouchableOpacity
            style={styles.closeBtn}
            onPress={onClose}
            activeOpacity={0.7}
          >
            <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>

          <Text style={styles.headerTitle}>Customer Feedbacks</Text>

          <View style={{ width: 40 }} />
        </View>

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={theme.primary} />
            <Text style={[styles.loadingText, { color: theme.secondaryText }]}>
              Loading customer reviews...
            </Text>
          </View>
        ) : (
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.content}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={handleRefresh}
                colors={[theme.primary]}
              />
            }
          >
            {/* SCORE SUMMARY BANNER */}
            <View
              style={[
                styles.summaryCard,
                { backgroundColor: theme.card, borderColor: theme.border },
              ]}
            >
              <View style={styles.summaryLeft}>
                <Text style={[styles.avgScore, { color: theme.text }]}>
                  {stats.average}
                </Text>
                {renderStars(Number(stats.average))}
                <Text style={[styles.reviewCount, { color: theme.secondaryText }]}>
                  Based on {stats.count} {stats.count === 1 ? "review" : "reviews"}
                </Text>
              </View>

              <View style={[styles.summaryDivider, { backgroundColor: theme.border }]} />

              <View style={styles.summaryRight}>
                <View style={styles.metricRow}>
                  <Ionicons name="shield-checkmark" size={16} color="#10B981" />
                  <Text style={[styles.metricText, { color: theme.text }]}>
                    {stats.count > 0
                      ? `${Math.round((stats.fiveStars / stats.count) * 100)}% 5-Star Service`
                      : "No ratings yet"}
                  </Text>
                </View>
                <Text style={[styles.metricSub, { color: theme.secondaryText }]}>
                  Ratings are submitted after delivery completion.
                </Text>
              </View>
            </View>

            {/* FILTER PILLS */}
            <View style={styles.filterRow}>
              {[
                { key: "all", label: "All" },
                { key: "5", label: "★ 5 Stars" },
                { key: "4", label: "★ 4 Stars" },
                { key: "critical", label: "★ 1-3 Stars" },
              ].map((pill) => {
                const active = selectedFilter === pill.key;
                return (
                  <TouchableOpacity
                    key={pill.key}
                    style={[
                      styles.filterPill,
                      {
                        backgroundColor: active ? theme.primary : theme.card,
                        borderColor: active ? theme.primary : theme.border,
                      },
                    ]}
                    onPress={() => setSelectedFilter(pill.key)}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={[
                        styles.filterPillText,
                        { color: active ? "#FFFFFF" : theme.text },
                      ]}
                    >
                      {pill.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* REVIEWS LIST */}
            {filteredReviews.length > 0 ? (
              filteredReviews.map((review, idx) => {
                const customerName =
                  review.customer?.full_name ||
                  review.delivery?.request?.customer?.full_name ||
                  "Verified Customer";
                const rating = review.driver_rating || review.overall_rating || 5;
                const cargoName =
                  review.delivery?.request?.item_name ||
                  review.delivery?.request?.cargo_type ||
                  "Cargo";
                const deliveryCode = review.delivery_id
                  ? `DLV${String(review.delivery_id).padStart(4, "0")}`
                  : null;

                return (
                  <View
                    key={review.review_id || idx}
                    style={[
                      styles.reviewCard,
                      {
                        backgroundColor: theme.card,
                        borderColor: theme.border,
                      },
                    ]}
                  >
                    <View style={styles.cardHeader}>
                      <View style={styles.customerAvatar}>
                        <Text style={styles.avatarLetter}>
                          {customerName.charAt(0).toUpperCase()}
                        </Text>
                      </View>

                      <View style={styles.customerMeta}>
                        <Text style={[styles.customerName, { color: theme.text }]}>
                          {customerName}
                        </Text>
                        <Text style={[styles.reviewDate, { color: theme.secondaryText }]}>
                          {formatDate(review.created_at)}
                        </Text>
                      </View>

                      <View style={styles.ratingBadge}>
                        {renderStars(rating)}
                      </View>
                    </View>

                    {Boolean(review.comments) && (
                      <Text style={[styles.commentText, { color: theme.text }]}>
                        "{review.comments}"
                      </Text>
                    )}

                    {/* PHOTO THUMBNAIL IF PRESENT */}
                    {Boolean(review.photo_url) && (
                      <TouchableOpacity
                        onPress={() => setPreviewPhoto(review.photo_url)}
                        activeOpacity={0.8}
                        style={styles.photoContainer}
                      >
                        <Image
                          source={{ uri: review.photo_url }}
                          style={styles.reviewPhoto}
                        />
                        <View style={styles.photoZoomBadge}>
                          <Ionicons name="expand" size={13} color="#FFFFFF" />
                        </View>
                      </TouchableOpacity>
                    )}

                    {/* DELIVERY TAG */}
                    <View style={styles.cardFooter}>
                      <View style={[styles.deliveryTag, { backgroundColor: theme.input }]}>
                        <Ionicons name="cube-outline" size={13} color={theme.icon} />
                        <Text style={[styles.deliveryTagText, { color: theme.secondaryText }]}>
                          {deliveryCode ? `${deliveryCode} • ` : ""}{cargoName}
                        </Text>
                      </View>
                    </View>
                  </View>
                );
              })
            ) : (
              <View style={styles.emptyContainer}>
                <Ionicons
                  name="chatbubble-ellipses-outline"
                  size={56}
                  color={theme.icon}
                />
                <Text style={[styles.emptyTitle, { color: theme.text }]}>
                  No Feedback Yet
                </Text>
                <Text style={[styles.emptySubtitle, { color: theme.secondaryText }]}>
                  Customer reviews and ratings for your deliveries will show up here.
                </Text>
              </View>
            )}
          </ScrollView>
        )}

        {/* FULL PHOTO PREVIEW MODAL */}
        <Modal
          visible={Boolean(previewPhoto)}
          transparent
          animationType="fade"
          onRequestClose={() => setPreviewPhoto(null)}
        >
          <View style={styles.previewBackdrop}>
            <TouchableOpacity
              style={styles.previewCloseBtn}
              onPress={() => setPreviewPhoto(null)}
            >
              <Ionicons name="close-circle" size={36} color="#FFFFFF" />
            </TouchableOpacity>
            {previewPhoto && (
              <Image
                source={{ uri: previewPhoto }}
                style={styles.previewImage}
                resizeMode="contain"
              />
            )}
          </View>
        </Modal>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    height: 70,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 10,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    elevation: 4,
  },
  closeBtn: {
    padding: 6,
  },
  headerTitle: {
    color: "#FFFFFF",
    fontSize: 19,
    fontWeight: "800",
  },
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  loadingText: {
    fontSize: 14,
    fontWeight: "600",
    marginTop: 12,
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  summaryCard: {
    flexDirection: "row",
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
    marginBottom: 16,
    alignItems: "center",
  },
  summaryLeft: {
    alignItems: "center",
    justifyContent: "center",
    paddingRight: 16,
  },
  avgScore: {
    fontSize: 34,
    fontWeight: "900",
    lineHeight: 40,
  },
  starRow: {
    flexDirection: "row",
    marginVertical: 4,
  },
  reviewCount: {
    fontSize: 11.5,
    fontWeight: "600",
  },
  summaryDivider: {
    width: 1,
    height: "80%",
    marginRight: 14,
  },
  summaryRight: {
    flex: 1,
    justifyContent: "center",
  },
  metricRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 4,
  },
  metricText: {
    fontSize: 13.5,
    fontWeight: "700",
  },
  metricSub: {
    fontSize: 11,
    lineHeight: 15,
  },
  filterRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 16,
  },
  filterPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
  },
  filterPillText: {
    fontSize: 12,
    fontWeight: "700",
  },
  reviewCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
    marginBottom: 12,
    elevation: 1,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },
  customerAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#DC2626",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarLetter: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "800",
  },
  customerMeta: {
    flex: 1,
    marginLeft: 10,
  },
  customerName: {
    fontSize: 14,
    fontWeight: "700",
  },
  reviewDate: {
    fontSize: 11,
    marginTop: 1,
  },
  ratingBadge: {
    alignItems: "flex-end",
  },
  commentText: {
    fontSize: 13.5,
    lineHeight: 19,
    fontStyle: "italic",
    marginBottom: 10,
  },
  photoContainer: {
    position: "relative",
    width: 100,
    height: 100,
    borderRadius: 8,
    overflow: "hidden",
    marginBottom: 10,
  },
  reviewPhoto: {
    width: "100%",
    height: "100%",
  },
  photoZoomBadge: {
    position: "absolute",
    bottom: 4,
    right: 4,
    backgroundColor: "rgba(0,0,0,0.6)",
    borderRadius: 4,
    padding: 3,
  },
  cardFooter: {
    flexDirection: "row",
    alignItems: "center",
  },
  deliveryTag: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    gap: 4,
  },
  deliveryTagText: {
    fontSize: 11,
    fontWeight: "600",
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 60,
    paddingHorizontal: 24,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: "800",
    marginTop: 12,
  },
  emptySubtitle: {
    fontSize: 13,
    textAlign: "center",
    marginTop: 6,
    lineHeight: 18,
  },
  previewBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.9)",
    justifyContent: "center",
    alignItems: "center",
  },
  previewCloseBtn: {
    position: "absolute",
    top: 50,
    right: 20,
    zIndex: 10,
  },
  previewImage: {
    width: width * 0.9,
    height: height * 0.7,
  },
});
