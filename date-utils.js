function getYesterdayRange() {
  const now = new Date();

  // Current date in India
  const indiaDate = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(now);

  const [year, month, day] = indiaDate.split("-").map(Number);

  // Yesterday's date
  const yesterday = new Date(
    Date.UTC(year, month - 1, day - 1)
  );

  const yesterdayYear = yesterday.getUTCFullYear();
  const yesterdayMonth = String(
    yesterday.getUTCMonth() + 1
  ).padStart(2, "0");
  const yesterdayDay = String(
    yesterday.getUTCDate()
  ).padStart(2, "0");

  const today = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  const yesterdayDate =
    `${yesterdayYear}-${yesterdayMonth}-${yesterdayDay}`;

  // IST = UTC+05:30
  const start = `${yesterdayDate}T00:00:00+05:30`;
  const end = `${today}T00:00:00+05:30`;

  return {
    start,
    end,
    reportDate: yesterday
  };
}

function getDateRangeForDaysAgo(daysAgo) {
  const now = new Date();
  const indiaDate = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(now);
  const [year, month, day] = indiaDate.split("-").map(Number);

  // Base today at UTC midnight
  const base = new Date(Date.UTC(year, month - 1, day));
  base.setUTCDate(base.getUTCDate() - daysAgo);

  const reportYear = base.getUTCFullYear();
  const reportMonth = String(base.getUTCMonth() + 1).padStart(2, "0");
  const reportDay = String(base.getUTCDate()).padStart(2, "0");

  // Next day
  const next = new Date(base);
  next.setUTCDate(next.getUTCDate() + 1);
  const nextYear = next.getUTCFullYear();
  const nextMonth = String(next.getUTCMonth() + 1).padStart(2, "0");
  const nextDay = String(next.getUTCDate()).padStart(2, "0");

  const reportDateStr = `${reportYear}-${reportMonth}-${reportDay}`;
  const nextDateStr = `${nextYear}-${nextMonth}-${nextDay}`;

  return {
    start: `${reportDateStr}T00:00:00+05:30`,
    end: `${nextDateStr}T00:00:00+05:30`,
    reportDate: base,
    reportDateStr
  };
}

function isWeekend(date) {
  const day = date.getUTCDay(); // 0=Sun, 6=Sat
  return day === 0 || day === 6;
}

module.exports = {
  getYesterdayRange,
  getDateRangeForDaysAgo,
  isWeekend
};