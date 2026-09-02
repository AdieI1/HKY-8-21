import { Stack } from "expo-router";

export default function RootLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="recorddetails" />
      <Stack.Screen name="pre-inspection" />
      <Stack.Screen name="ReportIssue" />
    </Stack>
  );
}