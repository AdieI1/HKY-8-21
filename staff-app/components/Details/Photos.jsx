import {
  Image,
  StyleSheet,
  View,
} from "react-native";

const PHOTOS = [
  require("../../assets/images/truckpic.jpg"),
  require("../../assets/images/truckpic.jpg"),
  require("../../assets/images/truckpic.jpg"),
  require("../../assets/images/truckpic.jpg"),
  require("../../assets/images/truckpic.jpg"),
  require("../../assets/images/truckpic.jpg"),
];

export default function Photos() {
  return (
    <View style={styles.container}>
      {PHOTOS.map((photo, index) => (
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
});