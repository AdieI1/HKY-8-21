import React from "react";
import { View, Text, StyleSheet } from "react-native";

export const getPasswordStrength = (password = "") => {
  if (!password) return { score: 0, label: "", color: "#E2E8F0" };

  if (password.length < 6) {
    return { score: 0, label: "Too Short", color: "#94A3B8" };
  }

  let score = 1; // Base score for reaching minimum length (6+ chars)
  if (password.length >= 8) score += 0.5;
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score += 1;
  else if (/[a-zA-Z]/.test(password)) score += 0.5;
  if (/\d/.test(password)) score += 0.8;
  if (/[!@#$%^&*(),.?":{}|<>_\-]/.test(password)) score += 0.7;

  const roundedScore = Math.min(4, Math.floor(score));

  switch (roundedScore) {
    case 1:
      return { score: 1, label: "Weak", color: "#EF4444" };
    case 2:
      return { score: 2, label: "Fair", color: "#F59E0B" };
    case 3:
      return { score: 3, label: "Good", color: "#3B82F6" };
    case 4:
      return { score: 4, label: "Strong", color: "#10B981" };
    default:
      return { score: 1, label: "Weak", color: "#EF4444" };
  }
};

export default function PasswordStrengthMeter({ password = "" }) {
  if (!password) return null;

  const { score, label, color } = getPasswordStrength(password);

  return (
    <View style={styles.container}>
      <View style={styles.barsContainer}>
        {[1, 2, 3, 4].map((step) => {
          const filled = score >= step;
          return (
            <View
              key={step}
              style={[
                styles.bar,
                {
                  backgroundColor: filled ? color : "rgba(255, 255, 255, 0.12)",
                },
              ]}
            />
          );
        })}
      </View>
      <View style={styles.labelRow}>
        <Text style={[styles.labelText, { color }]}>
          Strength: {label}
        </Text>
        <Text style={styles.hintText}>Min. 6 chars (letters & numbers)</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: -6,
    marginBottom: 12,
    paddingHorizontal: 2,
  },
  barsContainer: {
    flexDirection: "row",
    gap: 6,
    marginBottom: 5,
  },
  bar: {
    flex: 1,
    height: 4,
    borderRadius: 2,
  },
  labelRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  labelText: {
    fontSize: 12,
    fontWeight: "700",
  },
  hintText: {
    fontSize: 11,
    color: "#8E8E93",
  },
});
