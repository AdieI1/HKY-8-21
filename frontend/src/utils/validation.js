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
 * Validates Philippine Vehicle Plate Number (Standard hyphen format: 3 letters, hyphen, 4 numbers).
 * Example: ABC-1234
 *
 * @param {string} plate
 * @returns {boolean}
 */
export function validatePlateNumber(plate) {
  if (!plate) return false;
  const cleaned = String(plate).trim().toUpperCase();
  return /^[A-Z]{3}-\d{4}$/.test(cleaned);
}

/**
 * Formats vehicle plate input to standard uppercase ABC-1234 format.
 *
 * @param {string} val
 * @returns {string}
 */
export function formatPlateInput(val) {
  if (!val) return '';
  const str = String(val).toUpperCase();
  const clean = str.replace(/[^A-Z0-9]/g, '');
  const letters = clean.slice(0, 3).replace(/[^A-Z]/g, '');
  const numbers = clean.slice(letters.length, letters.length + 4).replace(/[^0-9]/g, '');

  if (letters.length === 3 && (str.includes('-') || numbers.length > 0)) {
    return numbers.length > 0 ? `${letters}-${numbers}` : `${letters}-`;
  }
  if (numbers.length > 0) {
    return `${letters}-${numbers}`;
  }
  return letters;
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

/**
 * Validates Insurance Policy Number.
 * Accepts alphanumeric characters with hyphens, slashes, or dots (4 to 30 characters).
 * Example: POL-8921-X, PL-102938, 01-2026-12345
 *
 * @param {string} policy
 * @returns {boolean}
 */
export function validatePolicyNumber(policy) {
  if (!policy) return true;
  const cleaned = String(policy).trim().toUpperCase();
  return /^[A-Z0-9][A-Z0-9\-\/\.]{3,29}$/i.test(cleaned);
}

/**
 * Formats insurance policy number input to uppercase alphanumeric with hyphens/slashes.
 *
 * @param {string} val
 * @returns {string}
 */
export function formatPolicyNumberInput(val) {
  if (!val) return '';
  return String(val).toUpperCase().replace(/[^A-Z0-9\-\/\.]/g, '').slice(0, 30);
}

/**
 * Validates Philippine LTO Official Receipt (OR) Number.
 * Format: 7 to 18 alphanumeric characters, optionally prefixed with OR- (e.g. OR-8912401 or 1234567890).
 *
 * @param {string} orNum
 * @returns {boolean}
 */
export function validateOrNumber(orNum) {
  if (!orNum) return true;
  const cleaned = String(orNum).trim().toUpperCase();
  return /^((OR-)?[A-Z0-9]{6,18}|\d{7,18})$/i.test(cleaned);
}

/**
 * Formats OR number input to uppercase alphanumeric with optional hyphen.
 *
 * @param {string} val
 * @returns {string}
 */
export function formatOrNumberInput(val) {
  if (!val) return '';
  return String(val).toUpperCase().replace(/[^A-Z0-9-]/g, '').slice(0, 20);
}

/**
 * Validates Philippine LTO Certificate of Registration (CR) Number.
 * Format: 7 to 14 alphanumeric characters, optionally prefixed with CR- (e.g. CR-1928401 or 123456789).
 *
 * @param {string} crNum
 * @returns {boolean}
 */
export function validateCrNumber(crNum) {
  if (!crNum) return true;
  const cleaned = String(crNum).trim().toUpperCase();
  return /^((CR-)?[A-Z0-9]{6,14}|\d{7,14})$/i.test(cleaned);
}

/**
 * Formats CR number input to uppercase alphanumeric with optional hyphen.
 *
 * @param {string} val
 * @returns {string}
 */
export function formatCrNumberInput(val) {
  if (!val) return '';
  return String(val).toUpperCase().replace(/[^A-Z0-9-]/g, '').slice(0, 18);
}

