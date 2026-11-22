/**
 * Utility to shorten long Nominatim / reverse-geocoded addresses
 * for compact display in mobile navigation cards and sheets.
 */

export const formatShortAddress = (address) => {
  if (!address || typeof address !== "string") return "";

  const trimmed = address.trim();
  const rawParts = trimmed.split(",").map((p) => p.trim()).filter(Boolean);

  if (rawParts.length <= 1) return trimmed;

  // Filter out country, postal code, and generic regions
  const filtered = rawParts.filter((part) => {
    const lower = part.toLowerCase();
    if (lower === "philippines" || lower === "ph") return false;
    if (/^\d{4,6}$/.test(lower)) return false; // Postal code
    if (lower.includes("mindanao") || lower.startsWith("region ")) return false;
    return true;
  });

  if (filtered.length === 0) return rawParts[0];
  if (filtered.length === 1) return filtered[0];

  const firstPart = filtered[0]
    .replace(/\bAvenue\b/gi, "Ave")
    .replace(/\bStreet\b/gi, "St")
    .replace(/\bBarangay\b/gi, "Brgy")
    .replace(/\bHighway\b/gi, "Hwy");

  const lastPart = filtered[filtered.length - 1];

  if (firstPart.toLowerCase() === lastPart.toLowerCase()) {
    return firstPart;
  }

  return `${firstPart}, ${lastPart}`;
};
