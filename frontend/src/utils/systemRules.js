/**
 * Helpers for reading dynamic System Configuration & Incident Notification Rules
 * from GET /system-settings with safe defaults.
 */

export const DEFAULT_OVERDUE_THRESHOLD = { value: 2, unit: 'days' };

/**
 * Converts a { value, unit } duration rule into milliseconds.
 */
export function ruleToMs(entry, fallbackValue = 2, fallbackUnit = 'days') {
  const rawVal = Number(entry?.value);
  const val = Number.isFinite(rawVal) && rawVal > 0 ? rawVal : fallbackValue;
  const unit = String(entry?.unit || fallbackUnit).toLowerCase();

  if (unit.startsWith('min')) return val * 60 * 1000;
  if (unit.startsWith('hour') || unit.startsWith('hr')) return val * 60 * 60 * 1000;
  if (unit.startsWith('month')) return val * 30 * 24 * 60 * 60 * 1000;
  if (unit.startsWith('year')) return val * 365 * 24 * 60 * 60 * 1000;
  return val * 24 * 60 * 60 * 1000; // days
}

/**
 * Formats a { value, unit } threshold for readable labels (e.g. "5+ days" or "12+ hours").
 */
export function formatThresholdPlusLabel(entry, fallbackValue = 2, fallbackUnit = 'days') {
  const rawVal = Number(entry?.value);
  const val = Number.isFinite(rawVal) && rawVal > 0 ? rawVal : fallbackValue;
  const unit = String(entry?.unit || fallbackUnit).toLowerCase();
  return `${val}+ ${unit}`;
}

/**
 * Extracts overdue request threshold metadata from a /system-settings API payload.
 */
export function getOverdueRequestConfig(settingsData) {
  const entry = settingsData?.system_config?.overdue_request_threshold || DEFAULT_OVERDUE_THRESHOLD;
  const reminderRule = settingsData?.notification_rules?.overdue_reminder;
  const reminderEnabled = reminderRule ? Boolean(reminderRule.enabled) : true;
  return {
    thresholdMs: ruleToMs(entry, 2, 'days'),
    label: formatThresholdPlusLabel(entry, 2, 'days'),
    reminderEnabled,
  };
}
