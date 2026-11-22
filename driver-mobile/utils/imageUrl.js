import { API_URL } from "../services/api";

export const getBaseServerUrl = () => {
  if (!API_URL) return "https://lather-venue-bony.ngrok-free.dev";
  return API_URL.replace(/\/api\/?$/, "");
};

/**
 * Resolves a storage file path or URL into an accessible absolute URL.
 * Handles:
 * - Relative paths: "permits/area/abc.png" -> "https://<host>/storage/permits/area/abc.png"
 * - Malformed API paths: "https://<host>/api/storage/..." -> "https://<host>/storage/..."
 * - Localhost references on physical devices -> "https://<host>/storage/..."
 */
export const resolveStorageUrl = (urlOrPath) => {
  if (!urlOrPath) return null;
  let str = String(urlOrPath).trim();
  if (!str) return null;

  const baseServer = getBaseServerUrl();

  if (str.startsWith("http://") || str.startsWith("https://")) {
    str = str.replace("/api/storage/", "/storage/");
    if (str.includes("localhost:8000") || str.includes("127.0.0.1:8000")) {
      str = str.replace(/https?:\/\/(localhost|127\.0\.0\.1):8000/, baseServer);
    }
    return str;
  }

  if (str.startsWith("data:")) {
    return str;
  }

  const cleanPath = str.replace(/^\/?(storage\/)?/, "");
  return `${baseServer}/storage/${cleanPath}`;
};
