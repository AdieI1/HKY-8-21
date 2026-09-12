import {createContext,useContext,useEffect,useState,} from "react";
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
      const savedTheme =
        await AsyncStorage.getItem("darkMode");

      if (savedTheme !== null) {
        setDarkMode(savedTheme === "true");
      }
    } catch (error) {
      console.log("Unable to load theme");
    } finally {
      setLoading(false);
    }
  };

  const toggleDarkMode = async () => {
    const newValue = !darkMode;

    setDarkMode(newValue);

    try {
      await AsyncStorage.setItem(
        "darkMode",
        newValue.toString()
      );
    } catch (error) {
      console.log("Unable to save theme");
    }
  };

  const theme = darkMode
    ? {
        background: "#1C1D23",
        card: "#292B34",
        cardSecondary: "#32343E",
        text: "#F4F5FC",
        secondaryText: "#B9BBC5",
        border: "#444651",
        input: "#3A3C47",
        header: "#8F2024",
        primary: "#F24848",
        icon: "#9FA2B2",
        tabBar: "#24252C",
      }
    : {
        background: "#DDE0EE",
        card: "#F4F5FC",
        cardSecondary: "#E7E8F0",
        text: "#303746",
        secondaryText: "#777987",
        border: "#C7C9D1",
        input: "#D8DAE3",
        header: "#A91F24",
        primary: "#E02E2E",
        icon: "#7B7E90",
        tabBar: "#FFFFFF",
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
  return useContext(ThemeContext);
}