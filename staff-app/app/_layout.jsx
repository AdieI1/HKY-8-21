import { Stack } from "expo-router";
import { ThemeProvider } from "../context/ThemeContext";

export default function RootLayout() {
  return (
    <ThemeProvider>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="settings" />
        <Stack.Screen name="recorddetails" />
        <Stack.Screen name="pre-inspection" />
        <Stack.Screen name="ReportIssue" />
      </Stack>
    </ThemeProvider>
  );
}