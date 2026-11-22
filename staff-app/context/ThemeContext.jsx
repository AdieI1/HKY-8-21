import { createContext, useContext, useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

const ThemeContext = createContext();

export function ThemeProvider({ children }) {
  const [darkMode, setDarkMode] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTheme();
  }, []);

  const loadTheme = async () => {
    try {
      const savedTheme = await AsyncStorage.getItem("staff_darkMode");
      if (savedTheme !== null) {
        setDarkMode(savedTheme === "true");
      }
    } catch (error) {
      console.log("Unable to load theme:", error);
    } finally {
      setLoading(false);
    }
  };

  const toggleDarkMode = async () => {
    const newValue = !darkMode;
    setDarkMode(newValue);
    try {
      await AsyncStorage.setItem("staff_darkMode", newValue.toString());
    } catch (error) {
      console.log("Unable to save theme:", error);
    }
  };

  const theme = darkMode
    ? {
        darkMode: true,
        background: "#13141A",
        surface: "#1C1E26",
        card: "#242733",
        cardSecondary: "#2C303E",
        text: "#F8FAFC",
        secondaryText: "#94A3B8",
        border: "#373B4D",
        header: ["#3D070B", "#7A1417"],
        primary: "#EF4444",
        tabBar: "#181A22",
        tabBarBorder: "#262936",
        input: "#2C303E",
        icon: "#94A3B8",
      }
    : {
        darkMode: false,
        background: "#F1F3F9",
        surface: "#FFFFFF",
        card: "#FFFFFF",
        cardSecondary: "#F8FAFC",
        text: "#0F172A",
        secondaryText: "#64748B",
        border: "#E2E8F0",
        header: ["#4F0A11", "#9E1E21"],
        primary: "#C52227",
        tabBar: "#FFFFFF",
        tabBarBorder: "#E2E8F0",
        input: "#FFFFFF",
        icon: "#64748B",
      };

  return (
    <ThemeContext.Provider
      value={{
        darkMode,
        toggleDarkMode,
        theme,
        loading,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    return {
      darkMode: false,
      toggleDarkMode: () => {},
      theme: {
        darkMode: false,
        background: "#F1F3F9",
        surface: "#FFFFFF",
        card: "#FFFFFF",
        cardSecondary: "#F8FAFC",
        text: "#0F172A",
        secondaryText: "#64748B",
        border: "#E2E8F0",
        header: ["#4F0A11", "#9E1E21"],
        primary: "#C52227",
        tabBar: "#FFFFFF",
        tabBarBorder: "#E2E8F0",
        input: "#FFFFFF",
        icon: "#64748B",
      },
      loading: false,
    };
  }
  return context;
}
