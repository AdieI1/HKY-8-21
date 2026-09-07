import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useState } from "react";
import {
    Pressable,
    StyleSheet,
    Text,
    TextInput,
    View,
} from "react-native";
import UploadPhoto from "../UploadPhoto";

export default function ReportIssueForm({ initialSeverity = "Low", initialDescription = "" }) {
  const router = useRouter();
  const [issueType, setIssueType] = useState("Flat Tires");
  const [showIssueTypes, setShowIssueTypes] = useState(false);
  const [severity, setSeverity] = useState(initialSeverity || "Low");
  const [description, setDescription] = useState(initialDescription || "");

  const issueTypes = [
    "Flat Tires",
    "Engine Problem",
    "Brake Problem",
    "Electrical Problem",
    "Body Damage",
    "Lights",
    "Oil / Fluid Leak",
    "Other",
  ];

  const severityOptions = [
    {
      name: "Low",
      style: styles.lowButton,
      active: styles.activeLow,
      text: styles.lowText,
      icon: "#6C8D51",
    },
    {
      name: "Medium",
      style: styles.mediumButton,
      active: styles.activeMedium,
      text: styles.mediumText,
      icon: "#D96747",
    },
    {
      name: "High",
      style: styles.highButton,
      active: styles.activeHigh,
      text: styles.highText,
      icon: "#E44A4A",
    },
  ];

  const handleSubmit = () => {
    console.log("Report submitted");
    console.log({
      issueType,
      severity,
      description,
    });
     router.replace({
      pathname: "/(tabs)/home",
      params: {
      reportSubmitted: "true",
     },
   });
  };

  return (
    <View style={styles.container}>
      <Text style={styles.label}>Select Issue Type</Text>

      <Pressable
        style={styles.dropdown}
        onPress={() => setShowIssueTypes(!showIssueTypes)}
      >
        <Text style={styles.dropdownText}>{issueType}</Text>

        <Ionicons
          name={showIssueTypes ? "chevron-up" : "chevron-down"}
          size={18}
          color="#24252A"
        />
      </Pressable>

      {showIssueTypes && (
        <View style={styles.dropdownMenu}>
          {issueTypes.map((type) => (
            <Pressable
              key={type}
              style={styles.dropdownOption}
              onPress={() => {
                setIssueType(type);
                setShowIssueTypes(false);
              }}
            >
              <Text
                style={[
                  styles.dropdownOptionText,
                  type === issueType && styles.selectedOptionText,
                ]}
              >
                {type}
              </Text>
            </Pressable>
          ))}
        </View>
      )}

      <Text style={styles.label}>Select Issue Severity</Text>

      <View style={styles.severityContainer}>
        {severityOptions.map((option) => {
          const selected = severity === option.name;

          return (
            <Pressable
              key={option.name}
              style={[
                styles.severityButton,
                option.style,
                selected && option.active,
              ]}
              onPress={() => setSeverity(option.name)}
            >
              <Text
                style={[
                  styles.severityText,
                  option.text,
                  selected && styles.activeSeverityText,
                ]}
              >
                {option.name}
              </Text>

              {selected && (
                <Ionicons
                  name="checkmark-circle"
                  size={15}
                  color={option.icon}
                />
              )}
            </Pressable>
          );
        })}
      </View>

      <Text style={styles.label}>Description</Text>

      <TextInput
        style={styles.descriptionInput}
        placeholder={"Provide details and insights about\n the issue..."}
        placeholderTextColor="#90929B"
        value={description}
        onChangeText={setDescription}
        multiline
        textAlignVertical="top"
      />

      <Text style={styles.label}>Upload Photos</Text>

      <View style={styles.uploadContainer}>
        <UploadPhoto />
      </View>

      <Pressable
        style={({ pressed }) => [
          styles.submitButton,
          pressed && styles.buttonPressed,
        ]}
        onPress={handleSubmit}
      >
        <Text style={styles.submitText}>Submit Report</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 13,
  },

  label: {
    color: "#555761",
    fontSize: 13,
    fontWeight: "700",
    marginBottom: 7,
    marginTop: 10,
  },

  dropdown: {
    height: 29,
    borderWidth: 1,
    borderColor: "#CFD1D9",
    borderRadius: 4,
    backgroundColor: "#E7E8ED",
    paddingHorizontal: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  dropdownText: {
    color: "#777983",
    fontSize: 12,
  },

  dropdownMenu: {
    marginTop: 3,
    borderWidth: 1,
    borderColor: "#D0D2DA",
    borderRadius: 5,
    backgroundColor: "#FFFFFF",
    overflow: "hidden",
    elevation: 3,
  },

  dropdownOption: {
    paddingHorizontal: 11,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#ECECF0",
  },

  dropdownOptionText: {
    color: "#60626B",
    fontSize: 12,
  },

  selectedOptionText: {
    fontWeight: "700",
    color: "#B52327",
  },

  severityContainer: {
    flexDirection: "row",
    gap: 9,
  },

  severityButton: {
    flex: 1,
    height: 34,
    borderRadius: 5,
    justifyContent: "center",
    alignItems: "center",
    flexDirection: "row",
    gap: 5,
    borderWidth: 1,
  },

  severityText: {
    fontSize: 12,
    fontWeight: "700",
  },

  activeSeverityText: {
    fontWeight: "800",
  },

  lowButton: {
    backgroundColor: "#E7F0DB",
    borderColor: "#C8DAB4",
  },

  lowText: {
    color: "#6C8D51",
  },

  activeLow: {
    backgroundColor: "#D8EBC7",
    borderWidth: 2,
    borderColor: "#6C8D51",
    shadowColor: "#6C8D51",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.55,
    shadowRadius: 6,
    elevation: 5,
  },

  mediumButton: {
    backgroundColor: "#FFF0E3",
    borderColor: "#F4CBAF",
  },

  mediumText: {
    color: "#D96747",
  },

  activeMedium: {
    backgroundColor: "#FFE4D2",
    borderWidth: 2,
    borderColor: "#D96747",
    shadowColor: "#D96747",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.55,
    shadowRadius: 6,
    elevation: 5,
  },

  highButton: {
    backgroundColor: "#FFE4E4",
    borderColor: "#EF9999",
  },

  highText: {
    color: "#E44A4A",
  },

  activeHigh: {
    backgroundColor: "#FFD3D3",
    borderWidth: 2,
    borderColor: "#E44A4A",
    shadowColor: "#E44A4A",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 7,
    elevation: 5,
  },

  descriptionInput: {
    height: 147,
    borderWidth: 1,
    borderColor: "#D0D3DD",
    borderRadius: 4,
    backgroundColor: "#F8F9FD",
    paddingHorizontal: 10,
    paddingTop: 11,
    paddingBottom: 10,
    color: "#4D4F58",
    fontSize: 12,
  },

  uploadContainer: {
    alignItems: "flex-start",
  },

  submitButton: {
    height: 47,
    borderRadius: 6,
    backgroundColor: "#E52C2F",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 18,
  },

  submitText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
  },

  buttonPressed: {
    opacity: 0.7,
  },
});