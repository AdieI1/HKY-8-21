import { Stack } from "expo-router";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { ThemeProvider } from "../context/ThemeContext";

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="index" />
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="deliverydetails" />
          <Stack.Screen name="pretripcheck" />
          <Stack.Screen name="settings" />
          <Stack.Screen name="navigation" />
          <Stack.Screen name="reportissue" />
        </Stack>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}