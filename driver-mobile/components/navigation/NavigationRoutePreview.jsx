import {
StyleSheet,
View,
Text,
} from "react-native";

export default function NavigationRoutePreview({
delivery,
navigationState,
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

const isCompleted =
navigationState === "completed";

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
<Text style={styles.locationText}>
<Text style={styles.label}>
Pick-up:
</Text>{" "}
{delivery.pickup}
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
<Text style={styles.locationText}>
<Text style={styles.label}>
Drop-off:
</Text>{" "}
{delivery.dropoff}
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
top: 72,
left: 22,
right: 22,
minHeight: 78,
backgroundColor: "#F1F2FA",
borderRadius: 8,
paddingHorizontal: 12,
paddingVertical: 11,
elevation: 8,
shadowOpacity: 0.2,
shadowRadius: 5,
zIndex: 20,
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
});