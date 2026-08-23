const API_URL = "http://10.0.2.2:8000/api";

let authToken = null;
let authUser = null;

const request = async (path, options = {}) => {
  const isFormData = options.body instanceof FormData;
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      Accept: "application/json",
      ...(!isFormData ? { "Content-Type": "application/json" } : {}),
      ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
      ...options.headers,
    },
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(
      data?.message ||
        Object.values(data?.errors || {})?.[0]?.[0] ||
        "Unable to connect to the server."
    );
  }

  return data;
};

const saveSession = (data) => {
  authToken = data?.token || authToken;
  authUser = data?.user || authUser;
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

  return saveSession(data);
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

  return saveSession(data);
};

export const resendVerification = async () => {
  return request("/customer/email/resend", { method: "POST" });
};

export const getVerificationStatus = async () => {
  const data = await request("/customer/email/status");
  authUser = data?.user || authUser;
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

  authUser = data?.user || authUser;
  return data;
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

export const getCurrentCustomer = () => authUser;
