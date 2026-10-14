import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useContext, useEffect, useState } from "react";

const PREF_DARK_KEY = "@customer_pref_dark_mode";

const lightColors = {
  isDark: false,
  bg: "#F1F5F9",
  card: "#FFFFFF",
  cardBorder: "#E2E8F0",
  text: "#0F172A",
  textMuted: "#64748B",
  textSubtle: "#94A3B8",
  inputBg: "#F8FAFC",
  inputBorder: "#CBD5E1",
  divider: "#E2E8F0",
  navBg: "#FFFFFF",
  navBorder: "#E2E8F0",
  chipBg: "#F1F5F9",
  chipActiveBg: "#FEE2E2",
  chipActiveBorder: "#DC2626",
  modalBg: "#FFFFFF",
  modalBackdrop: "rgba(15, 23, 42, 0.65)",
  danger: "#DC2626",
  success: "#16A34A",
  accent: "#DC2626",
  accentSoft: "#FEE2E2",
  statusBarStyle: "light",
};

const darkColors = {
  isDark: true,
  bg: "#0B1120",
  card: "#1E293B",
  cardBorder: "#334155",
  text: "#F8FAFC",
  textMuted: "#94A3B8",
  textSubtle: "#64748B",
  inputBg: "#0F172A",
  inputBorder: "#334155",
  divider: "#334155",
  navBg: "#111827",
  navBorder: "#1F2937",
  chipBg: "#1E293B",
  chipActiveBg: "#7F1D1D",
  chipActiveBorder: "#EF4444",
  modalBg: "#1E293B",
  modalBackdrop: "rgba(0, 0, 0, 0.85)",
  danger: "#EF4444",
  success: "#22C55E",
  accent: "#EF4444",
  accentSoft: "#450A0A",
  statusBarStyle: "light",
};

const ThemeContext = createContext({
  isDark: false,
  toggleDarkMode: () => {},
  colors: lightColors,
});

export function ThemeProvider({ children }) {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const stored = await AsyncStorage.getItem(PREF_DARK_KEY);
        if (stored !== null) {
          setIsDark(stored === "true");
        }
      } catch (err) {
        console.log("Error loading theme preference:", err);
      }
    })();
  }, []);

  const toggleDarkMode = async (value) => {
    const nextVal = typeof value === "boolean" ? value : !isDark;
    setIsDark(nextVal);
    try {
      await AsyncStorage.setItem(PREF_DARK_KEY, String(nextVal));
    } catch (err) {
      console.log("Error saving theme preference:", err);
    }
  };

  const colors = isDark ? darkColors : lightColors;

  return (
    <ThemeContext.Provider value={{ isDark, toggleDarkMode, colors }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    return {
      isDark: false,
      toggleDarkMode: () => {},
      colors: lightColors,
    };
  }
  return context;
}
