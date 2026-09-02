import { Ionicons } from "@expo/vector-icons";
import { useEffect, useMemo, useState } from "react";
import {
    Pressable,
    StyleSheet,
    Text,
    View,
} from "react-native";

import UploadPhoto from "../UploadPhoto";

export default function InspectionChecklistCard({
  onProgressChange,
}) {

  const [items, setItems] = useState([
    {
      id: 1,
      title: "Vehicle Inspection Conducted",
      checked: false,
    },
    {
      id: 2,
      title: "Valid Drivers License",
      checked: false,
    },
    {
      id: 3,
      title: "OR/CR Available",
      checked: false,
    },
    {
      id: 4,
      title: "Tires Checked",
      checked: false,
    },
    {
      id: 5,
      title: "Operational Lights and Signals",
      checked: false,
    },
    {
      id: 6,
      title: "Fire Extinguisher Available",
      checked: false,
    },
    {
      id: 7,
      title: "Complete Emergency Tools",
      checked: false,
    },
    {
      id: 8,
      title: "PPE Available",
      checked: false,
    },
  ]);

  const [photos, setPhotos] = useState([]);


  /* =================================
     COMPLETED COUNT
  ================================= */

  const completedCount = useMemo(() => {
    return items.filter((item) => item.checked).length;
  }, [items]);

  const totalCount = items.length;


  /* =================================
     SEND PROGRESS TO PARENT
  ================================= */

  useEffect(() => {
    onProgressChange?.({
      completed: completedCount,
      total: totalCount,
    });
  }, [completedCount, totalCount]);


  /* =================================
     TOGGLE ITEM
  ================================= */

  const toggleItem = (id) => {
    setItems((currentItems) =>
      currentItems.map((item) =>
        item.id === id
          ? {
              ...item,
              checked: !item.checked,
            }
          : item
      )
    );
  };


  return (
    <View style={styles.card}>

      {/* =================================
          HEADER
      ================================= */}

      <View style={styles.header}>
        <Text style={styles.title}>
          Inspection Checklist
        </Text>

        <Text style={styles.count}>
          {completedCount}/{totalCount}
        </Text>
      </View>


      {/* =================================
          DIVIDER
      ================================= */}

      <View style={styles.divider} />


      {/* =================================
          CHECKLIST ITEMS
      ================================= */}

      <View style={styles.checklist}>

        {items.map((item) => (

          <Pressable
            key={item.id}
            style={({ pressed }) => [
              styles.checkItem,
              pressed && styles.checkItemPressed,
            ]}
            onPress={() => toggleItem(item.id)}
          >

            <Text style={styles.checkText}>
              {item.title}
            </Text>

            <View
              style={[
                styles.checkbox,
                item.checked && styles.checkboxChecked,
              ]}
            >

              {item.checked && (
                <Ionicons
                  name="checkmark"
                  size={15}
                  color="#FFFFFF"
                />
              )}

            </View>

          </Pressable>

        ))}

      </View>


      {/* =================================
          UPLOAD PHOTOS
      ================================= */}

      <View style={styles.photoSection}>

        <UploadPhoto
          photos={photos}
          onPhotosChange={setPhotos}
        />

      </View>

    </View>
  );
}


const styles = StyleSheet.create({

  /* =================================
     CARD
  ================================= */

  card: {
    width: "100%",

    /*
      Makes the checklist container
      noticeably taller.
    */
    minHeight: 445,

    backgroundColor: "#F5F7FF",

    borderWidth: 1,
    borderColor: "#D5D8E2",

    borderRadius: 9,

    paddingHorizontal: 10,
    paddingTop: 13,
    paddingBottom: 14,

    marginTop: 10,
  },


  /* =================================
     HEADER
  ================================= */

  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",

    paddingHorizontal: 0,
  },

  title: {
    color: "#4E5058",

    fontSize: 13,

    fontWeight: "700",
  },

  count: {
    color: "#777982",

    fontSize: 12,

    fontWeight: "600",
  },


  /* =================================
     DIVIDER
  ================================= */

  divider: {
    height: 1,

    backgroundColor: "#D0D2DA",

    marginTop: 10,
    marginBottom: 6,
  },


  /* =================================
     CHECKLIST
  ================================= */

  checklist: {
    width: "100%",
  },


  /* =================================
     CHECK ITEM
  ================================= */

  checkItem: {
    /*
      Larger touch area.
    */
    minHeight: 43,

    flexDirection: "row",

    alignItems: "center",

    justifyContent: "space-between",

    paddingLeft: 15,
    paddingRight: 2,

    borderRadius: 3,
  },

  checkItemPressed: {
    opacity: 0.65,
  },


  /* =================================
     CHECK TEXT
  ================================= */

  checkText: {
    flex: 1,

    color: "#555761",

    fontSize: 12.5,

    lineHeight: 18,

    paddingRight: 12,
  },


  /* =================================
     CHECKBOX
  ================================= */

  checkbox: {
    width: 16,
    height: 16,

    borderWidth: 1.5,

    borderColor: "#555761",

    borderRadius: 2,

    justifyContent: "center",
    alignItems: "center",

    backgroundColor: "#F5F7FF",
  },

  checkboxChecked: {
    backgroundColor: "#E32E2E",

    borderColor: "#E32E2E",
  },


  /* =================================
     PHOTO SECTION
  ================================= */

  photoSection: {
    marginTop: 4,
  },

});