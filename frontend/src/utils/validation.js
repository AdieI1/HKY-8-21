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
 * Returns local today's date as YYYY-MM-DD.
 *
 * @returns {string}
 */
export function getTodayIso() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/**
 * Returns local tomorrow's date as YYYY-MM-DD (strictly future dates).
 *
 * @returns {string}
 */
export function getTomorrowIso() {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/**
 * Checks whether a YYYY-MM-DD date string is strictly after today (tomorrow onward).
 *
 * @param {string} dateStr
 * @returns {boolean}
 */
export function isStrictlyFutureDate(dateStr) {
  if (!dateStr) return false;
  return String(dateStr).slice(0, 10) >= getTomorrowIso();
}

/**
 * Official Philippine LTO Driver's License (DL) Codes.
 */
export const LTO_DL_CODES = [
  { code: 'A', label: 'A — Motorcycle' },
  { code: 'A1', label: 'A1 — Tricycle' },
  { code: 'B', label: 'B — Passenger Car (≤8 seats, ≤5000kg)' },
  { code: 'B1', label: 'B1 — Passenger Van (≥9 seats, ≤5000kg)' },
  { code: 'B2', label: 'B2 — Light Commercial Goods (≤3500kg)' },
  { code: 'C', label: 'C — Heavy Truck / Goods (>3500kg)' },
  { code: 'D', label: 'D — Bus (>5000kg, >8 seats)' },
  { code: 'BE', label: 'BE — Articulated Passenger Car' },
  { code: 'CE', label: 'CE — Articulated Heavy Truck / Trailer' },
];

/**
 * Validates Philippine Commercial Truck / Motor Insurance Policy Number.
 * Format: 8–30 uppercase chars, starts with 2–5 letters (line/subline code like MC, MTR, CV, TH, CTPL),
 * contains 1–6 hyphenated segments, and includes at least 4 digits total.
 * Examples: MC-CV-26-0014614, MTR-TH-26-000985-00, CV-2026-0012345
 *
 * @param {string} policy
 * @returns {boolean}
 */
export function validatePolicyNumber(policy) {
  if (!policy) return true;
  const cleaned = String(policy).trim().toUpperCase();
  if (cleaned.length < 8 || cleaned.length > 30) return false;
  return /^(?=(?:.*\d){4,})[A-Z]{2,5}(?:-[A-Z0-9]{1,10}){1,6}$/.test(cleaned);
}

/**
 * Formats insurance policy number input to uppercase alphanumeric with single hyphens (max 30 chars).
 * Pressing space automatically inserts a hyphen.
 *
 * @param {string} val
 * @returns {string}
 */
export function formatPolicyNumberInput(val) {
  if (!val) return '';
  return String(val)
    .toUpperCase()
    .replace(/\s+/g, '-')
    .replace(/[^A-Z0-9-]/g, '')
    .replace(/-{2,}/g, '-')
    .replace(/^-+/, '')
    .slice(0, 30);
}

/**
 * Returns live validation feedback for Insurance Policy Number.
 *
 * @param {string} val
 * @returns {{ valid: boolean, message: string } | null}
 */
export function getPolicyNumberFeedback(val) {
  const cleaned = String(val || '').trim().toUpperCase();
  if (!cleaned) return null;
  if (validatePolicyNumber(cleaned)) {
    return { valid: true, message: 'Valid truck insurance policy format' };
  }
  if (!/^[A-Z]{2,5}/.test(cleaned)) {
    return { valid: false, message: 'Start with 2–5 letters (e.g. MC-CV-26-0014614)' };
  }
  if (!cleaned.includes('-')) {
    return { valid: false, message: 'Include hyphens between segments (e.g. MC-CV-26-0014614)' };
  }
  const digitCount = (cleaned.match(/\d/g) || []).length;
  if (digitCount < 4) {
    return { valid: false, message: `Include at least 4 digits (${digitCount}/4)` };
  }
  if (cleaned.length < 8) {
    return { valid: false, message: `At least 8 characters required (${cleaned.length}/8)` };
  }
  return { valid: false, message: 'Use valid hyphenated segments (e.g. MC-CV-26-0014614)' };
}

/**
 * Validates Philippine Commercial Truck Engine Number.
 * Format: [3–6 char engine code with letter & digit]-[6–7 digit serial] (10–14 chars total).
 * Examples: 8M22-025168, 6HK1-123456, J08E-1234567
 *
 * @param {string} val
 * @returns {boolean}
 */
export function validateEngineNumber(val) {
  if (!val) return true;
  const cleaned = String(val).trim().toUpperCase();
  return /^(?=.*[A-Z])(?=.*\d)[A-Z0-9]{3,6}-\d{6,7}$/.test(cleaned);
}

/**
 * Formats Engine Number input (max 14 chars): uppercase engine code (3–6 chars) + single "-" + 6–7 digits only.
 *
 * @param {string} val
 * @returns {string}
 */
export function formatEngineNumberInput(val) {
  if (!val) return '';
  const raw = String(val).toUpperCase().replace(/\s+/g, '-').replace(/[^A-Z0-9-]/g, '').replace(/^-+/, '');
  const hyphenIdx = raw.indexOf('-');
  if (hyphenIdx !== -1) {
    const code = raw.slice(0, hyphenIdx).replace(/-/g, '').slice(0, 6);
    const serial = raw.slice(hyphenIdx + 1).replace(/\D/g, '').slice(0, 7);
    return `${code}-${serial}`;
  }
  return raw.slice(0, 6);
}

/**
 * Returns live validation feedback for Engine Number.
 *
 * @param {string} val
 * @returns {{ valid: boolean, message: string } | null}
 */
export function getEngineNumberFeedback(val) {
  const cleaned = String(val || '').trim().toUpperCase();
  if (!cleaned) return null;
  if (validateEngineNumber(cleaned)) {
    return { valid: true, message: 'Valid truck engine number' };
  }
  if (!cleaned.includes('-')) {
    return { valid: false, message: 'Add "-" followed by 6–7 serial digits (e.g. 8M22-025168)' };
  }
  const [code, serial = ''] = cleaned.split('-');
  if (code.length < 3 || !/[A-Z]/.test(code) || !/\d/.test(code)) {
    return { valid: false, message: 'Engine code before "-" needs 3–6 chars with letter & digit' };
  }
  if (serial.length < 6) {
    return { valid: false, message: `Serial after "-" needs 6–7 digits (${serial.length}/6)` };
  }
  return { valid: false, message: 'Format: CODE-123456 (e.g. 8M22-025168)' };
}

/**
 * Validates Philippine Commercial Truck Chassis Number.
 * Accepts either:
 * - Japanese/PH truck frame format: [2–4 letters + 1–4 alphanumeric]-[5–7 digits] (10–16 chars, e.g. FV50LH-520103, FRR90-7012345)
 * - Standard 17-character ISO VIN (no I, O, Q, must have letters & digits)
 *
 * @param {string} val
 * @returns {boolean}
 */
export function validateChassisNumber(val) {
  if (!val) return true;
  const cleaned = String(val).trim().toUpperCase();
  return (
    /^[A-Z]{2,4}[A-Z0-9]{1,4}-\d{5,7}$/.test(cleaned) ||
    /^(?=.*[A-Z])(?=.*\d)[A-HJ-NPR-Z0-9]{17}$/.test(cleaned)
  );
}

/**
 * Formats Chassis Number input (max 17 chars):
 * - With hyphen (frame code): max 8 alphanumeric prefix + "-" + 5–7 digits only.
 * - Without hyphen (17-char VIN): uppercase alphanumeric up to 17 chars.
 *
 * @param {string} val
 * @returns {string}
 */
export function formatChassisNumberInput(val) {
  if (!val) return '';
  const raw = String(val).toUpperCase().replace(/\s+/g, '-').replace(/[^A-Z0-9-]/g, '').replace(/^-+/, '');
  const hyphenIdx = raw.indexOf('-');
  if (hyphenIdx !== -1) {
    const prefix = raw.slice(0, hyphenIdx).replace(/-/g, '').slice(0, 8);
    const serial = raw.slice(hyphenIdx + 1).replace(/\D/g, '').slice(0, 7);
    return `${prefix}-${serial}`;
  }
  return raw.slice(0, 17);
}

/**
 * Returns live validation feedback for Chassis Number.
 *
 * @param {string} val
 * @returns {{ valid: boolean, message: string } | null}
 */
export function getChassisNumberFeedback(val) {
  const cleaned = String(val || '').trim().toUpperCase();
  if (!cleaned) return null;
  if (/^[A-Z]{2,4}[A-Z0-9]{1,4}-\d{5,7}$/.test(cleaned)) {
    return { valid: true, message: 'Valid truck chassis number' };
  }
  if (/^(?=.*[A-Z])(?=.*\d)[A-HJ-NPR-Z0-9]{17}$/.test(cleaned)) {
    return { valid: true, message: 'Valid 17-character VIN / chassis number' };
  }
  if (cleaned.includes('-')) {
    const [prefix, serial = ''] = cleaned.split('-');
    if (!/^[A-Z]{2,4}[A-Z0-9]{1,4}$/.test(prefix)) {
      return { valid: false, message: 'Start with 2–4 letters + frame code (e.g. FV50LH-520103)' };
    }
    if (serial.length < 5) {
      return { valid: false, message: `Serial after "-" needs 5–7 digits (${serial.length}/5)` };
    }
    return { valid: false, message: 'Format: FV50LH-520103 (prefix + 5–7 digits)' };
  }
  if (/[IOQ]/.test(cleaned) && cleaned.length > 8) {
    return { valid: false, message: '17-char VIN cannot contain letters I, O, or Q' };
  }
  return { valid: false, message: `Add "-" + 5–7 digits (FV50LH-520103) or 17-char VIN (${cleaned.length}/17)` };
}

/**
 * Validates Philippine LTO Official Receipt (OR) Number (Option B: LTMS + LTO Form 3 + Legacy).
 * - LTMS hyphenated format: XXXX-XXXXXXXXXXXX (4-digit LTO office code + hyphen + 12-digit transaction no.)
 * - Plain numeric OR (LTO Form 3 15-digit e.g. 038925000007757, 16-digit, or legacy 8–12 digits): 8–16 digits
 *
 * @param {string} orNum
 * @returns {boolean}
 */
export function validateOrNumber(orNum) {
  if (!orNum) return true;
  const cleaned = String(orNum).trim();
  return /^(?:\d{4}-\d{12}|\d{8,16})$/.test(cleaned);
}

/**
 * Formats LTO OR number input: digits & hyphen only, auto-hyphenates LTMS 16-digit ORs as XXXX-XXXXXXXXXXXX
 * while preserving 15-digit LTO Form 3 ORs (e.g. 038925000007757) and 8–12 digit legacy ORs.
 *
 * @param {string} val
 * @returns {string}
 */
export function formatOrNumberInput(val) {
  if (!val) return '';
  const raw = String(val).replace(/[^0-9-]/g, '').replace(/-{2,}/g, '-').replace(/^-+/, '');
  const digits = raw.replace(/\D/g, '').slice(0, 16);
  if (raw.includes('-') || digits.length === 16) {
    if (digits.length <= 4) {
      return raw.endsWith('-') && digits.length === 4 ? `${digits}-` : digits;
    }
    return `${digits.slice(0, 4)}-${digits.slice(4, 16)}`;
  }
  return digits;
}

/**
 * Returns live validation feedback for LTO OR Number.
 *
 * @param {string} val
 * @returns {{ valid: boolean, message: string } | null}
 */
export function getOrNumberFeedback(val) {
  const cleaned = String(val || '').trim();
  if (!cleaned) return null;
  if (/^\d{4}-\d{12}$/.test(cleaned)) {
    return { valid: true, message: 'Valid LTO LTMS OR number' };
  }
  if (/^\d{15}$/.test(cleaned)) {
    return { valid: true, message: 'Valid LTO OR number (15-digit)' };
  }
  if (/^\d{8,14}$/.test(cleaned)) {
    return { valid: true, message: 'Valid LTO OR number' };
  }
  const digits = cleaned.replace(/\D/g, '');
  if (cleaned.includes('-')) {
    return { valid: false, message: `LTMS OR needs 4-12 digits (${digits.length}/16 digits)` };
  }
  return { valid: false, message: `Enter 8–16 digits or LTMS 4-12 format (${digits.length} digits)` };
}

/**
 * Validates Philippine LTO Certificate of Registration (CR) Number (Option B: Standard + LTMS).
 * - Standard printed CR: 8–10 plain digits (e.g. 0098260263, 84291034)
 * - Printed CR with check digit: 8–9 digits + "-X" (e.g. 29254032-3, 143335372-2)
 * - Newer LTMS CR: XXXX-XX-XXXXXXXXX (e.g. 1001-24-699000111)
 *
 * @param {string} crNum
 * @returns {boolean}
 */
export function validateCrNumber(crNum) {
  if (!crNum) return true;
  const cleaned = String(crNum).trim();
  return /^(?:\d{8,10}|\d{8,9}-\d|\d{4}-\d{2}-\d{9})$/.test(cleaned);
}

/**
 * Formats LTO CR number input: digits & hyphen only, preserves 8–10 digit plain CRs (e.g. 0098260263),
 * supports check-digit CRs (29254032-3), and auto-hyphenates 15-digit LTMS CRs (1001-24-699000111).
 *
 * @param {string} val
 * @returns {string}
 */
export function formatCrNumberInput(val) {
  if (!val) return '';
  const raw = String(val).replace(/[^0-9-]/g, '').replace(/-{2,}/g, '-').replace(/^-+/, '');
  const digits = raw.replace(/\D/g, '').slice(0, 15);
  const firstHyphenIdx = raw.indexOf('-');

  // LTMS CR (XXXX-XX-XXXXXXXXX) when hyphenated at 4 or >10 digits
  if (firstHyphenIdx === 4 || digits.length > 10) {
    if (digits.length <= 4) {
      return raw.endsWith('-') && digits.length === 4 ? `${digits}-` : digits;
    }
    if (digits.length <= 6) {
      const tail = digits.slice(4);
      return raw.endsWith('-') && digits.length === 6
        ? `${digits.slice(0, 4)}-${tail}-`
        : `${digits.slice(0, 4)}-${tail}`;
    }
    return `${digits.slice(0, 4)}-${digits.slice(4, 6)}-${digits.slice(6, 15)}`;
  }

  // Standard CR with check digit (8 or 9 digits + "-" + 1 digit)
  if (firstHyphenIdx === 8 || firstHyphenIdx === 9) {
    const base = digits.slice(0, firstHyphenIdx);
    const check = digits.slice(firstHyphenIdx, firstHyphenIdx + 1);
    return check ? `${base}-${check}` : `${base}-`;
  }

  return digits;
}

/**
 * Returns live validation feedback for LTO CR Number.
 *
 * @param {string} val
 * @returns {{ valid: boolean, message: string } | null}
 */
export function getCrNumberFeedback(val) {
  const cleaned = String(val || '').trim();
  if (!cleaned) return null;
  if (/^\d{4}-\d{2}-\d{9}$/.test(cleaned)) {
    return { valid: true, message: 'Valid LTO LTMS CR number' };
  }
  if (/^\d{8,9}-\d$/.test(cleaned)) {
    return { valid: true, message: 'Valid LTO CR number (with check digit)' };
  }
  if (/^\d{8,10}$/.test(cleaned)) {
    return { valid: true, message: 'Valid LTO CR number' };
  }
  const digits = cleaned.replace(/\D/g, '');
  if (cleaned.indexOf('-') === 4 || digits.length > 10) {
    return { valid: false, message: `LTMS CR needs 4-2-9 digits (${digits.length}/15 digits)` };
  }
  if (cleaned.includes('-')) {
    return { valid: false, message: 'Add 1 check digit after hyphen (e.g. 29254032-3)' };
  }
  return { valid: false, message: `Enter 8–10 digits, 29254032-3, or LTMS CR (${digits.length} digits)` };
}

