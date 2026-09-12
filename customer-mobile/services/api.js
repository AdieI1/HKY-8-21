import AsyncStorage from "@react-native-async-storage/async-storage";

const API_URL = "http://192.168.254.109:8000/api";
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

export const login = async (username, password) => {
  const data = await request("/login", {
    method: "POST",
    body: JSON.stringify({ login: username, password }),
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
    if (key !== "payment_receipt" && value !== null && value !== undefined) {
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

  return request("/customer/delivery-requests", {
    method: "POST",
    body: form,
  });
};

export const getMyDeliveryRequests = async () => {
  return request("/customer/delivery-requests");
};

export const submitReview = async (payload) => {
  const form = new FormData();

  form.append("delivery_id", String(payload.delivery_id));
  form.append("overall_rating", String(payload.overall_rating));
  form.append("driver_rating", String(payload.driver_rating));

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

export const getCurrentCustomer = () => authUser;


