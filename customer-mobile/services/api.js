import AsyncStorage from "@react-native-async-storage/async-storage";

const API_URL = "https://lather-venue-bony.ngrok-free.dev/api";
const TOKEN_KEY = "auth_token";
const USER_KEY = "auth_user";

let authToken = null;
let authUser = null;

export const getToken = async () => {
  if (authToken) return authToken;
  try {
    const savedToken = await AsyncStorage.getItem(TOKEN_KEY);
    if (savedToken) {
      authToken = savedToken;
    }
    return savedToken;
  } catch {
    return null;
  }
};

export const getSavedUser = async () => {
  if (authUser) return authUser;
  try {
    const savedUser = await AsyncStorage.getItem(USER_KEY);
    if (savedUser) {
      authUser = JSON.parse(savedUser);
    }
    return authUser;
  } catch {
    return null;
  }
};

export const getCurrentCustomer = () => authUser;

export const refreshCustomerProfile = async () => {
  try {
    const token = await getToken();
    if (!token) return null;
    const data = await request("/customer/email/status");
    if (data?.user) {
      authUser = data.user;
      try {
        await AsyncStorage.setItem(USER_KEY, JSON.stringify(data.user));
      } catch { }
      return data.user;
    }
  } catch {
    // ignore
  }
  return await getSavedUser();
};

export const saveSession = async (data) => {
  if (data?.token) {
    authToken = data.token;
    try {
      await AsyncStorage.setItem(TOKEN_KEY, String(data.token));
    } catch (error) {
      console.log("Failed to save auth token to storage:", error);
    }
  }

  if (data?.user) {
    authUser = data.user;
    try {
      await AsyncStorage.setItem(USER_KEY, JSON.stringify(data.user));
    } catch (error) {
      console.log("Failed to save auth user to storage:", error);
    }
  }

  return data;
};

export const clearSession = async () => {
  authToken = null;
  authUser = null;
  try {
    await AsyncStorage.multiRemove([TOKEN_KEY, USER_KEY]);
  } catch (error) {
    console.log("Failed to clear auth session from storage:", error);
  }
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
    console.log("LOGOUT SERVER ERROR:", error);
  } finally {
    await clearSession();
  }
};

const request = async (path, options = {}) => {
  const token = await getToken();
  const isFormData = options.body instanceof FormData;

  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      Accept: "application/json",
      ...(!isFormData ? { "Content-Type": "application/json" } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });

  const data = await response.json().catch(() => ({}));

  if (response.status === 401) {
    await clearSession();
    throw new Error(data?.message || "Unauthenticated.");
  }

  if (!response.ok) {
    throw new Error(
      data?.message ||
      Object.values(data?.errors || {})?.[0]?.[0] ||
      "Unable to connect to the server."
    );
  }

  return data;
};

export const isProfileSetupCompleted = (user) => {
  if (!user) return false;
  if (typeof user.profile_completed === "boolean") {
    return user.profile_completed;
  }
  const hasFullName = Boolean(user.full_name && String(user.full_name).trim().length > 0);
  const hasPhone = Boolean(user.phone && String(user.phone).trim().length > 0);
  const hasGender = Boolean(user.gender && String(user.gender).trim().length > 0);
  const hasDob = Boolean(user.date_of_birth && String(user.date_of_birth).trim().length > 0);
  return hasFullName && hasPhone && hasGender && hasDob;
};

export const login = async (email, password) => {
  const trimmedEmail = String(email || "").trim();
  const data = await request("/login", {
    method: "POST",
    body: JSON.stringify({ email: trimmedEmail, login: trimmedEmail, password }),
  });

  if (String(data?.user?.role?.role_name || "").toLowerCase() !== "customer") {
    throw new Error("This app is only available to customer accounts.");
  }

  return await saveSession(data);
};

export const register = async (username, email, password, passwordConfirmation) => {
  const data = await request("/customer/register", {
    method: "POST",
    body: JSON.stringify({
      username,
      email,
      password,
      password_confirmation: passwordConfirmation,
    }),
  });

  return await saveSession(data);
};

export const verifyCode = async (code) => {
  const data = await request("/customer/email/verify-code", {
    method: "POST",
    body: JSON.stringify({ code }),
  });
  if (data?.user) {
    authUser = data.user;
    try {
      await AsyncStorage.setItem(USER_KEY, JSON.stringify(data.user));
    } catch { }
  }
  return data;
};

export const resendVerification = async () => {
  return request("/customer/email/resend", { method: "POST" });
};

export const getVerificationStatus = async () => {
  const data = await request("/customer/email/status");
  if (data?.user) {
    authUser = data.user;
    try {
      await AsyncStorage.setItem(USER_KEY, JSON.stringify(data.user));
    } catch { }
  }
  return data;
};

export const completeAccountSetup = async (firstName, lastName, phone) => {
  const data = await request("/customer/profile", {
    method: "PATCH",
    body: JSON.stringify({
      first_name: firstName,
      last_name: lastName,
      phone,
    }),
  });

  if (data?.user) {
    authUser = data.user;
    try {
      await AsyncStorage.setItem(USER_KEY, JSON.stringify(data.user));
    } catch { }
  }
  return data;
};

export const updateCustomerProfile = async (payload) => {
  let responseData;
  if (payload.photo?.uri) {
    const form = new FormData();
    if (payload.first_name !== undefined && payload.first_name !== null) form.append("first_name", payload.first_name);
    if (payload.last_name !== undefined && payload.last_name !== null) form.append("last_name", payload.last_name);
    if (payload.phone !== undefined && payload.phone !== null) form.append("phone", payload.phone);
    if (payload.gender !== undefined && payload.gender !== null) form.append("gender", payload.gender);
    if (payload.date_of_birth !== undefined && payload.date_of_birth !== null) form.append("date_of_birth", payload.date_of_birth);

    form.append("photo", {
      uri: payload.photo.uri,
      name: payload.photo.fileName || "profile-photo.jpg",
      type: payload.photo.mimeType || "image/jpeg",
    });

    responseData = await request("/customer/profile", {
      method: "POST",
      body: form,
    });
  } else {
    responseData = await request("/customer/profile", {
      method: "PATCH",
      body: JSON.stringify(payload),
    });
  }

  if (responseData?.user) {
    authUser = responseData.user;
    try {
      await AsyncStorage.setItem(USER_KEY, JSON.stringify(responseData.user));
    } catch { }
  }

  return responseData;
};

export const getRouteDistance = async (pickup, dropoff) => {
  const coordinates = [
    `${pickup.longitude},${pickup.latitude}`,
    `${dropoff.longitude},${dropoff.latitude}`,
  ].join(";");
  const response = await fetch(
    `https://router.project-osrm.org/route/v1/driving/${coordinates}?overview=false`
  );
  const data = await response.json();
  const meters = data?.routes?.[0]?.distance;

  if (!response.ok || !Number.isFinite(meters)) {
    throw new Error("Unable to calculate the road distance. Please try again.");
  }

  return Math.round((meters / 1000) * 100) / 100;
};

export const createDeliveryRequest = async (payload) => {
  const form = new FormData();

  Object.entries(payload).forEach(([key, value]) => {
    if (key !== "payment_receipt" && key !== "item_permit" && value !== null && value !== undefined) {
      form.append(key, typeof value === "boolean" ? (value ? "1" : "0") : String(value));
    }
  });

  if (payload.payment_receipt?.uri) {
    form.append("payment_receipt", {
      uri: payload.payment_receipt.uri,
      name: payload.payment_receipt.fileName || "bank-receipt.jpg",
      type: payload.payment_receipt.mimeType || "image/jpeg",
    });
  }

  if (payload.item_permit?.uri) {
    form.append("item_permit", {
      uri: payload.item_permit.uri,
      name: payload.item_permit.fileName || "item-permit.jpg",
      type: payload.item_permit.mimeType || "image/jpeg",
    });
  } else if (typeof payload.item_permit === "string" && payload.item_permit.trim()) {
    form.append("item_permit", payload.item_permit);
  }

  return request("/customer/delivery-requests", {
    method: "POST",
    body: form,
  });
};

export const getMyDeliveryRequests = async () => {
  return request("/customer/delivery-requests");
};

export const deleteDeliveryRequest = async (requestId) => {
  return request(`/delivery-requests/${requestId}`, {
    method: "DELETE",
  });
};

export const submitReview = async (payload) => {
  const form = new FormData();

  if (payload.delivery_id) {
    form.append("delivery_id", String(payload.delivery_id));
  }
  form.append("overall_rating", String(payload.overall_rating));
  if (payload.driver_rating !== undefined && payload.driver_rating !== null) {
    form.append("driver_rating", String(payload.driver_rating));
  }

  if (payload.comments) {
    form.append("comments", String(payload.comments));
  }

  if (payload.photo?.uri) {
    form.append("photo", {
      uri: payload.photo.uri,
      name: payload.photo.fileName || "review-photo.jpg",
      type: payload.photo.mimeType || "image/jpeg",
    });
  }

  return request("/reviews", {
    method: "POST",
    body: form,
  });
};

export const getFleetAvailabilityForecast = async () => {
  return request("/fleet/availability-forecast");
};

export const acceptDeliveryReschedule = async (deliveryId, payload = {}) => {
  return request(`/deliveries/${deliveryId}/accept-reschedule`, {
    method: "POST",
    body: JSON.stringify(payload),
    headers: {
      "Content-Type": "application/json",
    },
  });
};

export const getCustomerNotifications = async () => {
  return request("/notifications");
};

export const markNotificationRead = async (id) => {
  return request(`/notifications/${id}/read`, {
    method: "POST",
  });
};

export const markAllNotificationsRead = async () => {
  return request("/notifications/mark-all-read", {
    method: "POST",
  });
};

export const reportBug = async ({ category, description, deviceInfo }) => {
  return request("/bug-reports", {
    method: "POST",
    body: JSON.stringify({
      category,
      description,
      app_source: "customer-app",
      device_info: deviceInfo || "Customer Mobile App",
    }),
  });
};

export const cancelDeliveryOnAccident = async (deliveryId, reason) => {
  return request(`/deliveries/${deliveryId}/cancel-accident`, {
    method: "POST",
    body: JSON.stringify({ cancellation_reason: reason }),
  });
};




