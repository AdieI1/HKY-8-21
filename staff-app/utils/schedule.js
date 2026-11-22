const parseDateOnly = (rawDate) => {
  if (!rawDate) return null;
  const str = String(rawDate).trim().slice(0, 10);
  const match = str.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (match) {
    return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  }
  const fallback = new Date(rawDate);
  return isNaN(fallback.getTime()) ? null : fallback;
};

const formatScheduleDate = (dateObj) => {
  if (!dateObj) return null;
  const rawMonth = dateObj.toLocaleDateString("en-US", { month: "short" });
  const month = rawMonth === "Sep" ? "Sept" : rawMonth;
  return `${month} ${dateObj.getDate()}, ${dateObj.getFullYear()}`;
};

export const getScheduledDeliveryInfo = (delivery) => {
  const req = delivery?.request;
  const hasExplicitSchedule = Boolean(req?.is_scheduled || req?.scheduled_date);

  const rawDate = req?.scheduled_date || (hasExplicitSchedule ? delivery?.trip_date : null);
  const tripDateObj = parseDateOnly(delivery?.trip_date);
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const dateObj =
    parseDateOnly(rawDate) ||
    (tripDateObj && tripDateObj.getTime() > todayStart.getTime() ? tripDateObj : null);

  if (!hasExplicitSchedule && !dateObj) {
    return {
      isScheduled: false,
      isFuture: false,
      dateText: null,
      timeSlot: null,
      label: null,
      detailLabel: null,
    };
  }

  const dateText = formatScheduleDate(dateObj);
  const timeSlot = req?.scheduled_time_slot ? String(req.scheduled_time_slot).trim() : null;
  const isFuture = Boolean(dateObj && dateObj.getTime() > todayStart.getTime());

  const label = dateText ? `Scheduled for ${dateText}` : "Scheduled Delivery";
  const detailLabel =
    dateText && timeSlot
      ? `Scheduled for ${dateText} (${timeSlot})`
      : label;

  return {
    isScheduled: true,
    isFuture,
    dateText,
    timeSlot,
    label,
    detailLabel,
  };
};
