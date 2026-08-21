import { Stack } from "expo-router";
import { ThemeProvider } from "../context/ThemeContext";

export default function RootLayout() {
  return (
    <ThemeProvider>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="deliverydetails" />
        <Stack.Screen name="pretripcheck" />
        <Stack.Screen name="settings" />
        <Stack.Screen name="navigation" />
      </Stack>
    </ThemeProvider>
  );
}