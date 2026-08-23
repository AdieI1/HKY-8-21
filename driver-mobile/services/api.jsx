import AsyncStorage from "@react-native-async-storage/async-storage";

const API_URL = "http://10.0.2.2:8000/api";
const TOKEN_KEY = "auth_token";
const USER_KEY = "auth_user";

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
        body: JSON.stringify({ email, password }),
    });

    const data = await safeJson(response);

    if (!response.ok) {
        throw new Error(
            data?.message || data?.errors?.email?.[0] || "Login failed."
        );
    }

    if (!data?.token) {
        throw new Error("Login succeeded but the backend did not return a token.");
    }

    await AsyncStorage.setItem(TOKEN_KEY, String(data.token));

    if (data?.user) {
        await AsyncStorage.setItem(USER_KEY, JSON.stringify(data.user));
    }

    return data;
};

export const getToken = async () => {
    return await AsyncStorage.getItem(TOKEN_KEY);
};

export const getSavedUser = async () => {
    const savedUser = await AsyncStorage.getItem(USER_KEY);
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
        await AsyncStorage.setItem(USER_KEY, JSON.stringify(data));
    }
    return data;
};

/* =========================================================
   DRIVER DELIVERIES & NOTIFICATIONS
========================================================= */

export const getMyDeliveries = async () => {
    const token = await getToken();
    if (!token) throw new Error("Not authenticated.");

    const response = await fetch(`${API_URL}/my-deliveries`, {
        method: "GET",
        headers: {
            Accept: "application/json",
            Authorization: `Bearer ${token}`,
        },
    });

    const data = await safeJson(response);
    if (!response.ok) {
        throw new Error(data?.message || "Unable to load driver deliveries.");
    }

    return Array.isArray(data) ? data : Array.isArray(data?.data) ? data.data : [];
};

export const getMyNotifications = async () => {
    const token = await getToken();
    if (!token) throw new Error("Not authenticated.");

    const response = await fetch(`${API_URL}/my-notifications`, {
        method: "GET",
        headers: {
            Accept: "application/json",
            Authorization: `Bearer ${token}`,
        },
    });

    const data = await safeJson(response);
    if (!response.ok) {
        throw new Error(data?.message || "Unable to load driver notifications.");
    }

    return Array.isArray(data) ? data : Array.isArray(data?.data) ? data.data : [];
};

export const getDelivery = async (deliveryId) => {
    const token = await getToken();
    if (!token) throw new Error("Not authenticated.");

    const response = await fetch(`${API_URL}/deliveries/${deliveryId}`, {
        method: "GET",
        headers: {
            Accept: "application/json",
            Authorization: `Bearer ${token}`,
        },
    });

    const data = await safeJson(response);
    if (!response.ok) {
        throw new Error(data?.message || "Unable to load delivery details.");
    }

    return data;
};

export const advanceDeliveryStatus = async (deliveryId) => {
    const token = await getToken();
    if (!token) throw new Error("Not authenticated.");

    const response = await fetch(`${API_URL}/deliveries/${deliveryId}/advance-status`, {
        method: "POST",
        headers: {
            Accept: "application/json",
            Authorization: `Bearer ${token}`,
        },
    });

    const data = await safeJson(response);
    if (!response.ok) {
        throw new Error(data?.message || "Unable to update delivery status.");
    }

    return data;
};

/* =========================================================
   DRIVER DELIVERY WORKFLOW
========================================================= */

const postToDelivery = async (deliveryId, action, body) => {
    const token = await getToken();
    if (!token) throw new Error("Not authenticated.");

    const response = await fetch(`${API_URL}/deliveries/${deliveryId}/${action}`, {
        method: "POST",
        headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
    });

    const data = await safeJson(response);
    if (!response.ok) {
        throw new Error(
            data?.message ||
            Object.values(data?.errors || {})?.[0]?.[0] ||
            "Unable to update the delivery."
        );
    }

    return data;
};

export const updateDriverDeliveryStatus = async (deliveryId, status) => {
    return postToDelivery(deliveryId, "driver-status", { status });
};

export const saveDeliveryChecklist = async (deliveryId, checklist) => {
    return postToDelivery(deliveryId, "checklist", checklist);
};

export const updateDeliveryLocation = async (deliveryId, latitude, longitude) => {
    return postToDelivery(deliveryId, "location", { latitude, longitude });
};

/* =========================================================
   LOGOUT
========================================================= */

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
        await AsyncStorage.removeItem(TOKEN_KEY);
        await AsyncStorage.removeItem(USER_KEY);
    }
};