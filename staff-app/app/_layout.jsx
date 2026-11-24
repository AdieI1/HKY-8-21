import { Stack } from "expo-router";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { ThemeProvider } from "../context/ThemeContext";
import StaffNotificationManager from "../components/StaffNotificationManager";

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="index" />
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="settings" />
          <Stack.Screen name="recorddetails" />
          <Stack.Screen name="pre-inspection" />
          <Stack.Screen name="ReportIssue" />
        </Stack>
        <StaffNotificationManager />
      </ThemeProvider>
    </SafeAreaProvider>
  );
}