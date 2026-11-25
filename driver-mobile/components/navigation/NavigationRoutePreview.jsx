import {
StyleSheet,
View,
Text,
} from "react-native";
import { formatShortAddress } from "../../utils/address";

export default function NavigationRoutePreview({
delivery,
navigationState,
isNearHq = false,
hqDistanceMeters = null,
}) {
const isPickup =
navigationState === "preview" ||
navigationState === "in_transit_pickup";

const isDropoff =
navigationState === "in_transit_dropoff";

const isLoading =
navigationState === "loading";

const isUnloading =
navigationState === "unloading";

const isPickupReached =
navigationState === "arrived_pickup";

const isDropoffReached =
navigationState === "arrived_dropoff";

const isReturningToHq =
navigationState === "returning_to_hq";

const isCompleted =
navigationState === "completed";

if (isReturningToHq) {
return (
<View style={[styles.preview, isNearHq && styles.nearHqPreview]}>
<Text style={styles.locationText} numberOfLines={2} ellipsizeMode="tail">
<Text style={[styles.label, { color: isNearHq ? "#15803D" : "#EA580C" }]}>
Return to HQ:
</Text>{" "}
HJY Headquarters (8.504390, 124.646337)
</Text>

<Text style={styles.eta}>
ETA: {delivery.eta}{" "}
<Text style={styles.separator}>
|
</Text>{" "}
<Text style={[styles.distance, { color: isNearHq ? "#15803D" : "#EA580C" }]}>
{isNearHq
  ? `Arrived within 150m (${hqDistanceMeters ?? 0}m)`
  : delivery.distance}
</Text>
</Text>
</View>
);
}

if (isCompleted) {
return (
<View style={styles.preview}>
<Text style={styles.completedText}>
Delivery Completed
</Text>
</View>
);
}

if (isLoading) {
return (
<View style={styles.preview}>
<Text style={styles.statusText}>
Loading cargo...
</Text>

<Text style={styles.statusSubtext}>
Please wait until the cargo is fully loaded.
</Text>
</View>
);
}

if (isUnloading) {
return (
<View style={styles.preview}>
<Text style={styles.statusText}>
Unloading cargo...
</Text>

<Text style={styles.statusSubtext}>
Please wait until the cargo is fully unloaded.
</Text>
</View>
);
}

if (isPickupReached) {
return (
<View style={styles.preview}>
<Text style={styles.statusText}>
Pick-up location reached.
</Text>
</View>
);
}

if (isDropoffReached) {
return (
<View style={styles.preview}>
<Text style={styles.statusText}>
Drop-off location reached.
</Text>
</View>
);
}

if (isPickup) {
return (
<View style={styles.preview}>
<Text style={styles.locationText} numberOfLines={2} ellipsizeMode="tail">
<Text style={styles.label}>
Pick-up:
</Text>{" "}
{formatShortAddress(delivery.pickup)}
</Text>

<Text style={styles.eta}>
ETA: {delivery.eta}{" "}
<Text style={styles.separator}>
|
</Text>{" "}
<Text style={styles.distance}>
{delivery.distance}
</Text>
</Text>
</View>
);
}

if (isDropoff) {
return (
<View style={styles.preview}>
<Text style={styles.locationText} numberOfLines={2} ellipsizeMode="tail">
<Text style={styles.label}>
Drop-off:
</Text>{" "}
{formatShortAddress(delivery.dropoff)}
</Text>

<Text style={styles.eta}>
ETA: {delivery.eta}{" "}
<Text style={styles.separator}>
|
</Text>{" "}
<Text style={styles.distance}>
{delivery.distance}
</Text>
</Text>
</View>
);
}

return null;
}

const styles = StyleSheet.create({
preview: {
position: "absolute",
top: 10,
left: 14,
right: 14,
minHeight: 74,
backgroundColor: "#F1F2FA",
borderRadius: 12,
paddingHorizontal: 14,
paddingVertical: 10,
borderWidth: 1,
borderColor: "#E2E8F0",
elevation: 8,
shadowColor: "#000",
shadowOffset: { width: 0, height: 2 },
shadowOpacity: 0.16,
shadowRadius: 5,
zIndex: 25,
},

locationText: {
fontSize: 13,
lineHeight: 18,
color: "#30323B",
},

label: {
color: "#F24848",
fontWeight: "800",
},

eta: {
fontSize: 13,
color: "#30323B",
marginTop: 6,
fontWeight: "500",
},

separator: {
color: "#777987",
},

distance: {
color: "#F24848",
fontWeight: "700",
},

statusText: {
fontSize: 13,
color: "#30323B",
fontWeight: "700",
},

statusSubtext: {
fontSize: 12,
color: "#777987",
marginTop: 5,
},

completedText: {
fontSize: 13,
color: "#4E9F63",
fontWeight: "800",
},
nearHqPreview: {
backgroundColor: "#ECFDF5",
borderColor: "#16A34A",
borderWidth: 1.5,
},
});