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

module.exports = {
  getYesterdayRange
};