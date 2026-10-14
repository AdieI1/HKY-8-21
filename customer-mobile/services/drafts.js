import AsyncStorage from "@react-native-async-storage/async-storage";

const ACTIVE_FORM_PROGRESS_KEY = "@customer_active_form_progress";
const SAVED_DRAFTS_KEY = "@customer_saved_drafts";

/**
 * Save in-progress form state so crashes or app closure won't lose user data.
 */
export const saveActiveProgress = async (formData) => {
  try {
    if (!formData) {
      await AsyncStorage.removeItem(ACTIVE_FORM_PROGRESS_KEY);
      return;
    }
    const payload = {
      ...formData,
      savedAt: new Date().toISOString(),
    };
    await AsyncStorage.setItem(ACTIVE_FORM_PROGRESS_KEY, JSON.stringify(payload));
  } catch (error) {
    console.log("Error saving active form progress:", error);
  }
};

/**
 * Retrieve crash/exit recovery form progress.
 */
export const getActiveProgress = async () => {
  try {
    const raw = await AsyncStorage.getItem(ACTIVE_FORM_PROGRESS_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (error) {
    console.log("Error reading active form progress:", error);
    return null;
  }
};

/**
 * Clear in-progress form state once completed or explicitly discarded.
 */
export const clearActiveProgress = async () => {
  try {
    await AsyncStorage.removeItem(ACTIVE_FORM_PROGRESS_KEY);
  } catch (error) {
    console.log("Error clearing active form progress:", error);
  }
};

const formatTimeAgo = (isoString) => {
  if (!isoString) return "Recently";
  const diffSec = Math.floor((Date.now() - new Date(isoString).getTime()) / 1000);
  if (diffSec < 60) return "Just now";
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)} min ago`;
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)} hr ago`;
  return `${Math.floor(diffSec / 86400)} days ago`;
};

/**
 * Generate a signature for a draft to prevent duplicate cards with the same content.
 */
export const getDraftFingerprint = (d) => {
  if (!d) return "";
  const title = (d.title || d.cargo?.cargoName || "").trim().toLowerCase();
  const cargoType = (d.cargo?.cargoType || "").trim().toLowerCase();
  const weight = String(d.cargo?.weight || "").trim();
  const pickup = (
    d.pickup?.address ||
    (typeof d.pickup === "string" ? d.pickup : "") ||
    d.pickupObj?.address ||
    ""
  )
    .trim()
    .toLowerCase();
  const dest = (
    d.dropoff?.address ||
    (typeof d.dropoff === "string" ? d.dropoff : "") ||
    d.dropoffObj?.address ||
    ""
  )
    .trim()
    .toLowerCase();

  return `${title}:::${cargoType}:::${weight}:::${pickup}:::${dest}`;
};

/**
 * Save draft into list of saved drafts with zero duplicates.
 */
export const saveDraft = async (draftData) => {
  try {
    const raw = await AsyncStorage.getItem(SAVED_DRAFTS_KEY);
    const existing = raw ? JSON.parse(raw) : [];

    const id = draftData.id || `DRAFT-${Date.now()}`;
    const now = new Date();
    const mm = String(now.getMonth() + 1).padStart(2, "0");
    const dd = String(now.getDate()).padStart(2, "0");
    const yy = String(now.getFullYear()).slice(-2);

    const cargoTitle =
      draftData.cargo?.cargoName?.trim() ||
      draftData.cargo?.cargoType ||
      "Cargo Delivery";
    const pickupTitle = draftData.pickup?.address
      ? draftData.pickup.address.split(",")[0]
      : typeof draftData.pickup === "string" && draftData.pickup
      ? draftData.pickup.split(",")[0]
      : "Pickup Location";
    const destTitle = draftData.dropoff?.address
      ? draftData.dropoff.address.split(",")[0]
      : typeof draftData.dropoff === "string" && draftData.dropoff
      ? draftData.dropoff.split(",")[0]
      : "Destination Location";

    const draftItem = {
      ...draftData,
      id,
      title: cargoTitle,
      date: `${mm}/${dd}/${yy}`,
      type: draftData.cargo?.fragility || "Normal",
      pickup: pickupTitle,
      destination: destTitle,
      savedAt: now.toISOString(),
      savedTime: "Just now",
    };

    const newFp = getDraftFingerprint(draftItem);

    // Keep all other drafts EXCEPT:
    // 1. Same ID
    // 2. Same content signature (duplicate prevention)
    const filtered = existing.filter((d) => {
      if (d.id === id) return false;
      if (getDraftFingerprint(d) === newFp) return false;
      return true;
    });

    const updated = [draftItem, ...filtered];

    await AsyncStorage.setItem(SAVED_DRAFTS_KEY, JSON.stringify(updated));
    await clearActiveProgress();

    return draftItem;
  } catch (error) {
    console.log("Error saving draft:", error);
    throw error;
  }
};

/**
 * Fetch all drafts with strict deduplication by ID and content signature.
 * Automatically cleans up any existing duplicates in AsyncStorage.
 */
export const getDrafts = async () => {
  try {
    const raw = await AsyncStorage.getItem(SAVED_DRAFTS_KEY);
    const localDrafts = raw ? JSON.parse(raw) : [];

    const seenIds = new Set();
    const seenFingerprints = new Set();
    const uniqueDrafts = [];

    // Sort by savedAt descending (most recent first)
    const sorted = [...localDrafts].sort((a, b) => {
      const timeA = a.savedAt ? new Date(a.savedAt).getTime() : 0;
      const timeB = b.savedAt ? new Date(b.savedAt).getTime() : 0;
      return timeB - timeA;
    });

    for (const d of sorted) {
      if (!d.id || seenIds.has(d.id)) {
        continue;
      }

      const fp = getDraftFingerprint(d);
      if (fp && seenFingerprints.has(fp)) {
        // Duplicate with identical fields - discard older copy
        continue;
      }

      seenIds.add(d.id);
      if (fp) {
        seenFingerprints.add(fp);
      }

      uniqueDrafts.push({
        ...d,
        savedTime: formatTimeAgo(d.savedAt),
      });
    }

    // If duplicate records were pruned, heal AsyncStorage immediately
    if (uniqueDrafts.length !== localDrafts.length) {
      await AsyncStorage.setItem(SAVED_DRAFTS_KEY, JSON.stringify(uniqueDrafts));
    }

    return uniqueDrafts;
  } catch (error) {
    console.log("Error loading drafts:", error);
    return [];
  }
};

/**
 * Delete a draft by ID or signature.
 */
export const deleteDraft = async (draftId) => {
  try {
    const raw = await AsyncStorage.getItem(SAVED_DRAFTS_KEY);
    if (!raw) return;

    const list = JSON.parse(raw);
    const target = list.find((d) => d.id === draftId);
    const targetFp = target ? getDraftFingerprint(target) : null;

    const updated = list.filter((d) => {
      if (d.id === draftId) return false;
      if (targetFp && getDraftFingerprint(d) === targetFp) return false;
      return true;
    });

    await AsyncStorage.setItem(SAVED_DRAFTS_KEY, JSON.stringify(updated));
  } catch (error) {
    console.log("Error deleting draft:", error);
  }
};

/**
 * Clear all drafts (utility if needed).
 */
export const clearAllDrafts = async () => {
  try {
    await AsyncStorage.removeItem(SAVED_DRAFTS_KEY);
  } catch (error) {
    console.log("Error clearing drafts:", error);
  }
};

/**
 * Get single draft by ID.
 */
export const getDraftById = async (draftId) => {
  const drafts = await getDrafts();
  return (
    drafts.find((d) => d.id === draftId) ||
    drafts.find((d) => String(d.backendRequestId) === String(draftId)) ||
    null
  );
};
