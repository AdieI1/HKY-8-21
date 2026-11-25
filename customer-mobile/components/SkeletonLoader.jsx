import React, { useEffect, useRef } from "react";
import { Animated, Dimensions, Easing, StyleSheet, View } from "react-native";
import { useTheme } from "../context/ThemeContext";

const { width } = Dimensions.get("window");

export function useSkeletonPulse() {
  const opacity = useRef(new Animated.Value(0.42)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 0.9,
          duration: 750,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.42,
          duration: 750,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );

    animation.start();
    return () => animation.stop();
  }, [opacity]);

  return opacity;
}

export function SkeletonBox({
  width: boxWidth = "100%",
  height = 14,
  borderRadius = 6,
  pulseOpacity,
  style,
}) {
  const { isDark } = useTheme();
  const fallbackPulse = useSkeletonPulse();
  const opacity = pulseOpacity || fallbackPulse;
  const boneColor = isDark ? "#334155" : "#E2E8F0";

  return (
    <Animated.View
      style={[
        {
          width: boxWidth,
          height,
          borderRadius,
          backgroundColor: boneColor,
          opacity,
        },
        style,
      ]}
    />
  );
}

export function ActiveDeliveryCardSkeleton() {
  const { isDark, colors } = useTheme();
  const pulse = useSkeletonPulse();

  return (
    <View
      style={[
        styles.activeCard,
        {
          backgroundColor: colors.card,
          borderColor: colors.cardBorder,
          borderWidth: isDark ? 1 : 0,
        },
      ]}
    >
      <SkeletonBox width="48%" height={22} borderRadius={6} pulseOpacity={pulse} />
      <View style={[styles.divider, { backgroundColor: colors.divider }]} />

      <View style={styles.rowBetween}>
        <View style={styles.row}>
          <SkeletonBox
            width={width * 0.16}
            height={width * 0.16}
            borderRadius={8}
            pulseOpacity={pulse}
          />
          <View style={{ marginLeft: 12, gap: 8 }}>
            <SkeletonBox width={135} height={16} borderRadius={6} pulseOpacity={pulse} />
            <SkeletonBox width={95} height={20} borderRadius={6} pulseOpacity={pulse} />
          </View>
        </View>
        <SkeletonBox width={68} height={13} borderRadius={5} pulseOpacity={pulse} />
      </View>

      <SkeletonBox
        width="55%"
        height={12}
        borderRadius={5}
        pulseOpacity={pulse}
        style={{ marginTop: 14 }}
      />
      <View style={[styles.divider, { backgroundColor: colors.divider }]} />
      <SkeletonBox width="82%" height={15} borderRadius={6} pulseOpacity={pulse} />
    </View>
  );
}

export function DeliveryCardSkeleton() {
  const { colors } = useTheme();
  const pulse = useSkeletonPulse();

  return (
    <View
      style={[
        styles.deliveryCard,
        {
          backgroundColor: colors.card,
          borderColor: colors.cardBorder,
        },
      ]}
    >
      <View style={styles.rowBetween}>
        <View style={[styles.row, { flex: 1 }]}>
          <SkeletonBox width={30} height={30} borderRadius={7} pulseOpacity={pulse} />
          <View style={{ marginLeft: 9, gap: 5, flex: 1 }}>
            <SkeletonBox width="62%" height={16} borderRadius={6} pulseOpacity={pulse} />
            <SkeletonBox width="40%" height={10} borderRadius={5} pulseOpacity={pulse} />
          </View>
        </View>
        <SkeletonBox width={86} height={28} borderRadius={8} pulseOpacity={pulse} />
      </View>

      <View style={[styles.routeBlock, { borderBottomColor: colors.divider }]}>
        <SkeletonBox width="78%" height={13} borderRadius={5} pulseOpacity={pulse} />
        <SkeletonBox
          width="54%"
          height={11}
          borderRadius={5}
          pulseOpacity={pulse}
          style={{ marginTop: 8 }}
        />
      </View>

      <View style={[styles.rowBetween, { paddingVertical: 13 }]}>
        <View style={styles.row}>
          <SkeletonBox width={48} height={48} borderRadius={24} pulseOpacity={pulse} />
          <View style={{ marginLeft: 10, gap: 6 }}>
            <SkeletonBox width={104} height={13} borderRadius={5} pulseOpacity={pulse} />
            <SkeletonBox width={44} height={10} borderRadius={4} pulseOpacity={pulse} />
          </View>
        </View>
        <View style={{ alignItems: "flex-end", gap: 6 }}>
          <SkeletonBox width={90} height={13} borderRadius={5} pulseOpacity={pulse} />
          <SkeletonBox width={74} height={10} borderRadius={4} pulseOpacity={pulse} />
        </View>
      </View>

      <View style={styles.progressSkeleton}>
        <View style={styles.progressLineBone}>
          {[0, 1, 2, 3, 4, 5, 6].map((dot) => (
            <SkeletonBox
              key={dot}
              width={14}
              height={14}
              borderRadius={7}
              pulseOpacity={pulse}
            />
          ))}
        </View>
      </View>
    </View>
  );
}

export function DeliveryListSkeleton({ count = 3 }) {
  return (
    <View>
      {Array.from({ length: count }).map((_, idx) => (
        <DeliveryCardSkeleton key={idx} />
      ))}
    </View>
  );
}

export function NotificationCardSkeleton() {
  const { colors } = useTheme();
  const pulse = useSkeletonPulse();

  return (
    <View
      style={[
        styles.notificationCard,
        {
          backgroundColor: colors.card,
          borderColor: colors.cardBorder,
        },
      ]}
    >
      <View style={styles.rowBetween}>
        <View style={[styles.row, { flex: 1 }]}>
          <SkeletonBox width={34} height={34} borderRadius={10} pulseOpacity={pulse} />
          <SkeletonBox
            width="58%"
            height={15}
            borderRadius={5}
            pulseOpacity={pulse}
            style={{ marginLeft: 10 }}
          />
        </View>
        <SkeletonBox width={42} height={18} borderRadius={9} pulseOpacity={pulse} />
      </View>

      <View style={[styles.divider, { backgroundColor: colors.divider }]} />
      <SkeletonBox width="92%" height={12} borderRadius={5} pulseOpacity={pulse} />
      <SkeletonBox
        width="72%"
        height={12}
        borderRadius={5}
        pulseOpacity={pulse}
        style={{ marginTop: 6 }}
      />
      <SkeletonBox
        width="45%"
        height={11}
        borderRadius={5}
        pulseOpacity={pulse}
        style={{ marginTop: 10 }}
      />
      <View style={{ alignItems: "flex-end", marginTop: 10 }}>
        <SkeletonBox width={54} height={10} borderRadius={4} pulseOpacity={pulse} />
      </View>
    </View>
  );
}

export function NotificationListSkeleton({ count = 4 }) {
  return (
    <View>
      {Array.from({ length: count }).map((_, idx) => (
        <NotificationCardSkeleton key={idx} />
      ))}
    </View>
  );
}

export function DraftCardSkeleton() {
  const { colors } = useTheme();
  const pulse = useSkeletonPulse();

  return (
    <View
      style={[
        styles.draftCard,
        {
          backgroundColor: colors.card,
          borderColor: colors.cardBorder,
        },
      ]}
    >
      <View style={{ flexDirection: "row", gap: 12 }}>
        <SkeletonBox width={44} height={44} borderRadius={10} pulseOpacity={pulse} />
        <View style={{ flex: 1 }}>
          <View style={styles.rowBetween}>
            <SkeletonBox width="62%" height={16} borderRadius={5} pulseOpacity={pulse} />
            <SkeletonBox width={22} height={22} borderRadius={6} pulseOpacity={pulse} />
          </View>
          <View style={[styles.row, { gap: 10, marginTop: 8 }]}>
            <SkeletonBox width={74} height={12} borderRadius={4} pulseOpacity={pulse} />
            <SkeletonBox width={56} height={18} borderRadius={9} pulseOpacity={pulse} />
          </View>
          <View
            style={[
              styles.draftRouteBox,
              { backgroundColor: colors.inputBg, borderColor: colors.cardBorder },
            ]}
          >
            <SkeletonBox width="80%" height={12} borderRadius={5} pulseOpacity={pulse} />
            <SkeletonBox
              width="70%"
              height={12}
              borderRadius={5}
              pulseOpacity={pulse}
              style={{ marginTop: 12 }}
            />
          </View>
        </View>
      </View>

      <View style={[styles.divider, { backgroundColor: colors.divider }]} />

      <View style={styles.rowBetween}>
        <SkeletonBox width={96} height={12} borderRadius={5} pulseOpacity={pulse} />
        <SkeletonBox width={108} height={32} borderRadius={8} pulseOpacity={pulse} />
      </View>
    </View>
  );
}

export function DraftListSkeleton({ count = 3 }) {
  return (
    <View>
      {Array.from({ length: count }).map((_, idx) => (
        <DraftCardSkeleton key={idx} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
  },
  rowBetween: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  divider: {
    height: 1,
    marginVertical: 12,
    width: "100%",
  },
  activeCard: {
    borderRadius: 12,
    marginTop: 16,
    padding: 16,
  },
  deliveryCard: {
    borderRadius: 12,
    marginBottom: 16,
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 14,
    borderWidth: 1,
  },
  routeBlock: {
    paddingTop: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  progressSkeleton: {
    paddingTop: 6,
    paddingBottom: 6,
  },
  progressLineBone: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  notificationCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
    marginBottom: 12,
  },
  draftCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
    marginBottom: 12,
  },
  draftRouteBox: {
    marginTop: 10,
    borderRadius: 8,
    borderWidth: 1,
    padding: 10,
  },
});
