import React from "react";
import { View, Text, StyleSheet } from "react-native";

export const getPasswordStrength = (password = "") => {
  if (!password) return { score: 0, label: "", color: "#E2E8F0" };

  let score = 0;
  if (password.length >= 8) score++;
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++;
  else if (/[a-zA-Z]/.test(password)) score += 0.5;
  if (/\d/.test(password)) score++;
  if (/[!@#$%^&*(),.?":{}|<>_\-]/.test(password)) score++;

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
      return { score: 0, label: "Too Short", color: "#94A3B8" };
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
                  backgroundColor: filled ? color : "rgba(255, 255, 255, 0.15)",
                },
              ]}
            />
          );
        })}
      </View>
      <View style={styles.labelRow}>
        <Text style={[styles.labelText, { color }]}>
          Password Strength: {label}
        </Text>
        <Text style={styles.hintText}>8+ chars, numbers & symbols</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: -4,
    marginBottom: 14,
    paddingHorizontal: 2,
  },
  barsContainer: {
    flexDirection: "row",
    gap: 6,
    marginBottom: 6,
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
    fontWeight: "600",
  },
  hintText: {
    fontSize: 11,
    color: "#94A3B8",
  },
});
