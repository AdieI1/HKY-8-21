import AsyncStorage from "@react-native-async-storage/async-storage";

export const API_URL = "https://lather-venue-bony.ngrok-free.dev/api";
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

export const submitIncidentReport = async (incidentData) => {
    const token = await getToken();
    const headers = {
        "Content-Type": "application/json",
        Accept: "application/json",
    };
    if (token) {
        headers["Authorization"] = `Bearer ${token}`;
    }

    const response = await fetch(`${API_URL}/incident-reports`, {
        method: "POST",
        headers,
        body: JSON.stringify(incidentData),
    });

    const data = await safeJson(response);
    if (!response.ok) {
        throw new Error(data?.message || "Failed to submit incident report.");
    }
    return data;
};

/* =========================================================
   ACTIVE DELIVERY PERSISTENCE
========================================================= */

const ACTIVE_DELIVERY_KEY = "active_accepted_delivery_id";

export const setActiveAcceptedDeliveryId = async (deliveryId) => {
    if (!deliveryId) return;
    await AsyncStorage.setItem(ACTIVE_DELIVERY_KEY, String(deliveryId));
};

export const getActiveAcceptedDeliveryId = async () => {
    return await AsyncStorage.getItem(ACTIVE_DELIVERY_KEY);
};

export const clearActiveAcceptedDeliveryId = async () => {
    await AsyncStorage.removeItem(ACTIVE_DELIVERY_KEY);
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
        await AsyncStorage.removeItem(ACTIVE_DELIVERY_KEY);
    }
};

/* =========================================================
   DRIVER PROFILE & REVIEWS
========================================================= */

export const updateDriverProfile = async (userId, payload) => {
    const token = await getToken();
    const headers = {
        Accept: "application/json",
    };
    if (token) {
        headers["Authorization"] = `Bearer ${token}`;
    }

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
            headers,
            body: formData,
        });

        const data = await safeJson(response);
        if (!response.ok) {
            throw new Error(data?.message || Object.values(data?.errors || {})?.[0]?.[0] || "Failed to update profile photo.");
        }
        if (data) {
            await AsyncStorage.setItem(USER_KEY, JSON.stringify(data));
        }
        return data;
    } else {
        headers["Content-Type"] = "application/json";
        const response = await fetch(`${API_URL}/users/${userId}`, {
            method: "PUT",
            headers,
            body: JSON.stringify(payload),
        });

        const data = await safeJson(response);
        if (!response.ok) {
            throw new Error(data?.message || Object.values(data?.errors || {})?.[0]?.[0] || "Failed to update profile.");
        }
        if (data) {
            await AsyncStorage.setItem(USER_KEY, JSON.stringify(data));
        }
        return data;
    }
};

export const getDriverReviews = async () => {
    const token = await getToken();
    const headers = {
        Accept: "application/json",
    };
    if (token) {
        headers["Authorization"] = `Bearer ${token}`;
    }

    const response = await fetch(`${API_URL}/reviews`, {
        method: "GET",
        headers,
    });

    const data = await safeJson(response);
    if (!response.ok) {
        throw new Error(data?.message || "Failed to fetch driver reviews.");
    }
    return Array.isArray(data) ? data : Array.isArray(data?.data) ? data.data : [];
};

export const resolveAvatarUrl = (urlOrPath) => {
    if (!urlOrPath) return null;
    let url = String(urlOrPath).trim();
    if (!url) return null;

    if (!url.startsWith("http://") && !url.startsWith("https://")) {
        const base = API_URL.replace(/\/api\/?$/, "");
        const cleanPath = url.startsWith("/") ? url : `/${url}`;
        return cleanPath.startsWith("/storage") ? `${base}${cleanPath}` : `${base}/storage${cleanPath}`;
    }

    if (url.includes("localhost") || url.includes("127.0.0.1")) {
        const base = API_URL.replace(/\/api\/?$/, "");
        url = url.replace(/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?/, base);
    }

    return url;
};

export const getRouteWeather = async (originLat, originLng, destLat, destLng) => {
    try {
        const url = `${API_URL}/weather/route?origin_lat=${originLat}&origin_lng=${originLng}&dest_lat=${destLat}&dest_lng=${destLng}`;
        const response = await fetch(url, {
            headers: { Accept: "application/json" }
        });
        const data = await safeJson(response);
        if (response.ok && data?.summary) {
            return data;
        }
    } catch (e) {
        console.warn("Backend weather route fetch error, using direct open-meteo fallback:", e);
    }

    // Direct Open-Meteo fallback if backend is unreachable
    try {
        const omUrl = `https://api.open-meteo.com/v1/forecast?latitude=${destLat}&longitude=${destLng}&current=temperature_2m,weather_code,precipitation,wind_speed_10m&timezone=Asia%2FManila`;
        const res = await fetch(omUrl);
        const omData = await safeJson(res);
        const code = Number(omData?.current?.weather_code || 0);
        const isRain = [51, 53, 55, 61, 63, 65, 80, 81, 82, 95, 96, 99].includes(code);
        const isSevere = [65, 82, 95, 96, 99].includes(code);
        let condition = "Clear";
        let speedLimit = 60;
        let advisory = "Road conditions clear. Follow safe driving speeds.";

        if (code === 95 || code === 96 || code === 99) {
            condition = "Thunderstorm";
            speedLimit = 30;
            advisory = "Thunderstorm with lightning detected ahead. Max speed 30 km/h. Keep extreme braking distance.";
        } else if (code === 65 || code === 82) {
            condition = "Heavy Rain";
            speedLimit = 35;
            advisory = "Heavy rain downpour ahead. Low visibility and hydroplaning hazard. Keep speed under 35 km/h.";
        } else if (isRain) {
            condition = "Rain Showers";
            speedLimit = 45;
            advisory = "Rain detected ahead. Wet asphalt, maintain 45 km/h limit.";
        }

        return {
            summary: {
                has_rain_ahead: isRain,
                worst_condition: condition,
                worst_severity: isSevere ? "severe" : isRain ? "warning" : "normal",
                location_context: "near destination",
                recommended_speed_limit: speedLimit,
                driver_advisory: advisory,
                is_severe: isSevere,
            }
        };
    } catch {
        return null;
    }
};

export const reportBug = async ({ category, description, deviceInfo }) => {
    const token = await getToken();
    const headers = {
        "Content-Type": "application/json",
        Accept: "application/json",
    };
    if (token) {
        headers.Authorization = `Bearer ${token}`;
    }
    const response = await fetch(`${API_URL}/bug-reports`, {
        method: "POST",
        headers,
        body: JSON.stringify({
            category,
            description,
            app_source: "driver-app",
            device_info: deviceInfo || "Driver Mobile App",
        }),
    });
    const data = await safeJson(response);
    if (!response.ok) {
        throw new Error(data?.message || "Failed to submit bug report.");
    }
    return data;
};