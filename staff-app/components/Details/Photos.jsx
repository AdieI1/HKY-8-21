import { Ionicons } from "@expo/vector-icons";
import {
  Image,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useTheme } from "../../context/ThemeContext";

export default function Photos({ photos = [] }) {
  const { theme, darkMode } = useTheme();
  const displayPhotos = Array.isArray(photos) ? photos : [];

  if (displayPhotos.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="images-outline" size={44} color={theme.textSecondary} />
        <Text style={[styles.emptyTitle, { color: theme.text }]}>No Photos Uploaded</Text>
        <Text style={[styles.emptySubtitle, { color: theme.textSecondary }]}>
          There are no photos attached to this inspection record.
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {displayPhotos.map((photo, index) => (
        <Image
          key={index}
          source={photo}
          style={styles.photo}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 18,
    paddingTop: 11,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },

  photo: {
    width: 77,
    height: 82,
    borderRadius: 8,
    resizeMode: "cover",
  },

  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 50,
    paddingHorizontal: 20,
  },

  emptyTitle: {
    color: "#4E5058",
    fontSize: 15,
    fontWeight: "700",
    marginTop: 10,
    marginBottom: 4,
  },

  emptySubtitle: {
    color: "#888B97",
    fontSize: 12,
    textAlign: "center",
    lineHeight: 16,
  },
});