const API_URL = "http://10.0.2.2:8000/api";

let authToken = null;
let authUser = null;

const request = async (path, options = {}) => {
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
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

export const register = async (phone, email, password, passwordConfirmation) => {
  const data = await request("/customer/register", {
    method: "POST",
    body: JSON.stringify({
      phone,
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

export const createDeliveryRequest = async (payload) => {
  return request("/customer/delivery-requests", {
    method: "POST",
    body: JSON.stringify(payload),
  });
};

export const getMyDeliveryRequests = async () => {
  return request("/customer/delivery-requests");
};

export const getCurrentCustomer = () => authUser;
