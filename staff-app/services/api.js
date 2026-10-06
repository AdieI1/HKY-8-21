import AsyncStorage from "@react-native-async-storage/async-storage";

const API_URL = "https://lather-venue-bony.ngrok-free.dev/api";
const API_BASE = API_URL.replace(/\/api\/?$/, "");
const TOKEN_KEY = "auth_token";
const USER_KEY = "auth_user";

export const resolveImageUrl = (url) => {
  if (!url) return null;
  if (typeof url !== "string") return url;
  if (!url.startsWith("http://") && !url.startsWith("https://")) {
    const cleanLeading = url.replace(/^\//, "");
    if (cleanLeading.startsWith("images/")) {
      return `${API_BASE}/${cleanLeading}`;
    }
    const cleanPath = cleanLeading.replace(/^storage\/?/, "");
    return `${API_BASE}/storage/${cleanPath}`;
  }
  return url.replace(/https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?/i, API_BASE);
};

// Safe in-memory fallback store in case native storage is unavailable
const memoryStorage = {};

const safeStorage = {
  async getItem(key) {
    try {
      const val = await AsyncStorage.getItem(key);
      return val !== null ? val : (memoryStorage[key] || null);
    } catch {
      return memoryStorage[key] || null;
    }
  },
  async setItem(key, value) {
    memoryStorage[key] = value;
    try {
      await AsyncStorage.setItem(key, value);
    } catch (e) {
      console.warn("AsyncStorage fallback to memory:", e?.message);
    }
  },
  async removeItem(key) {
    delete memoryStorage[key];
    try {
      await AsyncStorage.removeItem(key);
    } catch { }
  },
};

const safeJson = async (response) => {
  try {
    const text = await response.text();
    return text ? JSON.parse(text) : null;
  } catch {
    return null;
  }
};

/* =========================================================
   LOGIN & AUTH
========================================================= */

export const login = async (email, password) => {
  const response = await fetch(`${API_URL}/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({ email: email.trim(), password }),
  });

  const data = await safeJson(response);

  if (!response.ok) {
    throw new Error(
      data?.message ||
      data?.errors?.email?.[0] ||
      data?.errors?.password?.[0] ||
      "Login failed."
    );
  }

  if (!data?.token) {
    throw new Error("Backend did not return an authentication token.");
  }

  // Verify that the logged-in user is Staff or Admin
  const roleName = data?.user?.role?.role_name?.toLowerCase() || "";
  if (roleName !== "staff" && roleName !== "admin") {
    throw new Error("Access denied. Only staff members can log in to this app.");
  }

  await safeStorage.setItem(TOKEN_KEY, String(data.token));

  if (data?.user) {
    await safeStorage.setItem(USER_KEY, JSON.stringify(data.user));
  }

  return data;
};

export const getToken = async () => {
  return await safeStorage.getItem(TOKEN_KEY);
};

export const getSavedUser = async () => {
  const savedUser = await safeStorage.getItem(USER_KEY);
  if (!savedUser) return null;
  try {
    return JSON.parse(savedUser);
  } catch {
    return null;
  }
};

export const getCurrentUser = async () => {
  const token = await getToken();
  if (!token) throw new Error("Not authenticated.");

  const response = await fetch(`${API_URL}/me`, {
    method: "GET",
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
    },
  });

  const data = await safeJson(response);
  if (!response.ok) {
    throw new Error(data?.message || "Unable to get current user.");
  }

  if (data) {
    await safeStorage.setItem(USER_KEY, JSON.stringify(data));
  }
  return data;
};

export const getRememberedEmail = async () => {
  return await safeStorage.getItem("staff_remember_email");
};

export const setRememberedEmail = async (email) => {
  if (email) {
    await safeStorage.setItem("staff_remember_email", email);
  } else {
    await safeStorage.removeItem("staff_remember_email");
  }
};

export const fetchWithAuth = async (path, options = {}) => {
  const token = await getToken();
  if (!token) throw new Error("Not authenticated.");

  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...options.headers,
    },
  });

  const data = await safeJson(response);
  if (!response.ok) {
    throw new Error(data?.message || "Request failed.");
  }
  return data;
};

export const getDeliveries = async () => {
  const data = await fetchWithAuth("/deliveries");
  return Array.isArray(data) ? data : Array.isArray(data?.data) ? data.data : [];
};

export const getIncidentReports = async () => {
  try {
    const data = await fetchWithAuth("/incident-reports");
    return Array.isArray(data) ? data : Array.isArray(data?.data) ? data.data : [];
  } catch {
    return [];
  }
};

export const getDelivery = async (id) => {
  return await fetchWithAuth(`/deliveries/${id}`);
};

export const saveChecklist = async (deliveryId, payload) => {
  return await fetchWithAuth(`/deliveries/${deliveryId}/checklist`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
};

export const updateStaffProfile = async (userId, payload) => {
  const token = await getToken();
  if (!token) throw new Error("Not authenticated.");

  if (payload.photo?.uri) {
    const formData = new FormData();
    formData.append("_method", "PUT");
    if (payload.full_name) formData.append("full_name", payload.full_name);
    if (payload.phone) formData.append("phone", payload.phone);
    if (payload.gender) formData.append("gender", payload.gender);
    if (payload.date_of_birth) formData.append("date_of_birth", payload.date_of_birth);

    formData.append("photo", {
      uri: payload.photo.uri,
      name: payload.photo.fileName || "profile-photo.jpg",
      type: payload.photo.mimeType || "image/jpeg",
    });

    const response = await fetch(`${API_URL}/users/${userId}`, {
      method: "POST",
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: formData,
    });

    const data = await safeJson(response);
    if (!response.ok) {
      throw new Error(
        data?.message ||
        Object.values(data?.errors || {})?.[0]?.[0] ||
        "Failed to update profile photo."
      );
    }
    if (data) {
      await safeStorage.setItem(USER_KEY, JSON.stringify(data));
    }
    return data;
  } else {
    const response = await fetch(`${API_URL}/users/${userId}`, {
      method: "PUT",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    });

    const data = await safeJson(response);
    if (!response.ok) {
      throw new Error(
        data?.message ||
        Object.values(data?.errors || {})?.[0]?.[0] ||
        "Failed to update profile."
      );
    }
    if (data) {
      await safeStorage.setItem(USER_KEY, JSON.stringify(data));
    }
    return data;
  }
};

export const changeStaffPassword = async (userId, password) => {
  return await fetchWithAuth(`/users/${userId}`, {
    method: "PUT",
    body: JSON.stringify({ password }),
  });
};

export const getStaffNotifications = async () => {
  try {
    const data = await fetchWithAuth("/notifications");
    return data;
  } catch (err) {
    console.log("FETCH NOTIFICATIONS ERROR:", err?.message);
    return { unread_count: 0, notifications: [] };
  }
};

export const markStaffNotificationRead = async (id) => {
  return await fetchWithAuth(`/notifications/${id}/read`, {
    method: "POST",
  });
};

export const markAllStaffNotificationsRead = async () => {
  return await fetchWithAuth("/notifications/mark-all-read", {
    method: "POST",
  });
};

export const logout = async () => {
  const token = await getToken();
  try {
    if (token) {
      await fetch(`${API_URL}/logout`, {
        method: "POST",
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${token}`,
        },
      });
    }
  } catch (error) {
    console.log("LOGOUT ERROR:", error);
  } finally {
    await safeStorage.removeItem(TOKEN_KEY);
    await safeStorage.removeItem(USER_KEY);
  }
};

export const reportBug = async ({ category, description, deviceInfo }) => {
  return await fetchWithAuth("/bug-reports", {
    method: "POST",
    body: JSON.stringify({
      category,
      description,
      app_source: "staff-app",
      device_info: deviceInfo || "Staff Mobile App",
    }),
  });
};


