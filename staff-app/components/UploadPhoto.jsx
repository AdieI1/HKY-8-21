import * as ImagePicker from "expo-image-picker";

import {
    Alert,
    Image,
    Pressable,
    StyleSheet,
    Text,
    View,
} from "react-native";

import { Ionicons } from "@expo/vector-icons";

export default function UploadPhoto({
  photos = [],
  onPhotosChange,
}) {

  const pickPhotos = async () => {

    const permission =
      await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permission.granted) {
      Alert.alert(
        "Permission Required",
        "Please allow photo library access to upload inspection photos."
      );

      return;
    }

    const result =
      await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsMultipleSelection: true,
        quality: 0.8,
      });

    if (result.canceled) {
      return;
    }

    const selectedPhotos = result.assets.map(
      (asset) => asset.uri
    );

    onPhotosChange([
      ...photos,
      ...selectedPhotos,
    ]);
  };


  const removePhoto = (index) => {

    const updatedPhotos = photos.filter(
      (_, photoIndex) => photoIndex !== index
    );

    onPhotosChange(updatedPhotos);
  };


  return (
    <View style={styles.container}>

      <Text style={styles.title}>
        Upload Photos
      </Text>


      <View style={styles.photoRow}>

        {/* ==============================
            EXISTING PHOTOS
        ============================== */}

        {photos.map((photo, index) => (
          <View
            key={`${photo}-${index}`}
            style={styles.photoWrapper}
          >

            <Image
              source={{ uri: photo }}
              style={styles.photo}
              resizeMode="cover"
            />

            <Pressable
              style={styles.removeButton}
              onPress={() => removePhoto(index)}
            >
              <Ionicons
                name="close"
                size={13}
                color="#FFFFFF"
              />
            </Pressable>

          </View>
        ))}


        {/* ==============================
            ADD PHOTO BUTTON
        ============================== */}

        <Pressable
          style={({ pressed }) => [
            styles.addPhotoButton,
            pressed && styles.pressed,
          ]}
          onPress={pickPhotos}
        >

          <Ionicons
            name="camera-outline"
            size={25}
            color="#8A8D98"
          />

          <Text style={styles.addPhotoText}>
            Add Photos
          </Text>

        </Pressable>

      </View>

    </View>
  );
}

const styles = StyleSheet.create({

  container: {
    marginTop: 10,
  },

  title: {
    color: "#666872",
    fontSize: 12,
    fontWeight: "700",
    marginBottom: 7,
  },

  photoRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 7,
  },

  photoWrapper: {
    width: 96,
    height: 58,
    borderRadius: 4,
    overflow: "hidden",
    position: "relative",
  },

  photo: {
    width: "100%",
    height: "100%",
  },

  removeButton: {
    position: "absolute",
    top: 3,
    right: 3,
    width: 19,
    height: 19,
    borderRadius: 10,
    backgroundColor: "rgba(0,0,0,0.65)",
    justifyContent: "center",
    alignItems: "center",
  },

  addPhotoButton: {
    width: 96,
    height: 58,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: "#D2D5DE",
    backgroundColor: "#E9EBF2",
    justifyContent: "center",
    alignItems: "center",
  },

  addPhotoText: {
    color: "#777A85",
    fontSize: 9.5,
    marginTop: 2,
  },

  pressed: {
    opacity: 0.65,
  },

});