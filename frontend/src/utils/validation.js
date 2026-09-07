/**
 * Validation utilities for HJY Trucking Services
 */

/**
 * Validates a Philippine mobile phone number.
 * Must be non-empty, exactly 11 digits, and start with "09".
 * Example: 09123456789
 *
 * @param {string} phone
 * @returns {boolean}
 */
export function validatePhoneNumber(phone) {
  if (!phone) return false;
  const cleaned = String(phone).trim();
  return /^09\d{9}$/.test(cleaned);
}

/**
 * Formats/sanitizes phone input: removes all non-digit characters and limits to 11 digits.
 *
 * @param {string} val
 * @returns {string}
 */
export function formatPhoneInput(val) {
  if (!val) return '';
  return String(val).replace(/\D/g, '').slice(0, 11);
}

/**
 * Validates Philippine LTO Driver's License Number format.
 * Format: [A-Z]\d{2}-\d{2}-\d{6} (e.g. D01-23-456789) or 11 alphanumeric characters.
 *
 * @param {string} license
 * @returns {boolean}
 */
export function validateLicenseNumber(license) {
  if (!license) return true; // Optional unless required by the specific form
  const cleaned = String(license).trim().toUpperCase();
  // Accepts standard hypenated format D01-23-456789 or continuous D0123456789
  return /^[A-Z]\d{2}-\d{2}-\d{6}$/.test(cleaned) || /^[A-Z]\d{10}$/.test(cleaned);
}

/**
 * Formats license number input to uppercase and standard alphanumeric / hyphens up to 13 chars.
 *
 * @param {string} val
 * @returns {string}
 */
export function formatLicenseInput(val) {
  if (!val) return '';
  // Uppercase, keep only letters, digits, and hyphens, max 13 chars
  return String(val)
    .toUpperCase()
    .replace(/[^A-Z0-9-]/g, '')
    .slice(0, 13);
}

/**
 * Validates email address format.
 *
 * @param {string} email
 * @returns {boolean}
 */
export function validateEmail(email) {
  if (!email) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email).trim());
}

/**
 * Validates Philippine Vehicle Plate Number.
 * Accepts formats:
 * - ABC 1234 or ABC-1234 (Modern 4-digit)
 * - ABC 123 or ABC-123 (Legacy 3-digit)
 * - 1234 AB or MV File formats
 *
 * @param {string} plate
 * @returns {boolean}
 */
export function validatePlateNumber(plate) {
  if (!plate) return false;
  const cleaned = String(plate).trim().toUpperCase();
  return /^[A-Z]{3}[-\s]?\d{3,4}$/.test(cleaned) || /^\d{4}[-\s]?[A-Z]{2,3}$/.test(cleaned);
}

/**
 * Formats vehicle plate input to uppercase and standard alphanumeric with space.
 *
 * @param {string} val
 * @returns {string}
 */
export function formatPlateInput(val) {
  if (!val) return '';
  return String(val)
    .toUpperCase()
    .replace(/[^A-Z0-9\s-]/g, '')
    .slice(0, 10);
}

/**
 * Validates that an end date is chronologically on or after a start date.
 *
 * @param {string|Date} startDate
 * @param {string|Date} endDate
 * @returns {boolean}
 */
export function validateDateSequence(startDate, endDate) {
  if (!startDate || !endDate) return true; // Pass if one is not specified
  const start = new Date(startDate).getTime();
  const end = new Date(endDate).getTime();
  if (isNaN(start) || isNaN(end)) return true;
  return end >= start;
}

/**
 * Validates that a numeric value is non-negative.
 *
 * @param {number|string} val
 * @returns {boolean}
 */
export function validatePositiveNumber(val) {
  if (val === '' || val == null) return true;
  const n = Number(val);
  return !isNaN(n) && n >= 0;
}

