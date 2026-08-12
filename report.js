function parseDuration(duration) {
  if (!duration) return 0;

  // Clockify ISO-8601 duration:
  // PT1H20M1S
  // PT45M30S
  // PT2H
  const match = duration.match(
    /^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+(?:\.\d+)?)S)?$/
  );

  if (!match) return 0;

  const hours = Number(match[1] || 0);
  const minutes = Number(match[2] || 0);
  const seconds = Number(match[3] || 0);

  return hours * 3600 + minutes * 60 + seconds;
}

function secondsToHours(seconds) {
  return (seconds / 3600).toFixed(2);
}

function calculateEntries(entries) {
  const totals = {};
  let totalSeconds = 0;

  for (const entry of entries) {
    const description = entry?.description?.trim();

    const duration = parseDuration(
      entry?.timeInterval?.duration
    );

    if (
      !description ||
      !Number.isFinite(duration) ||
      duration <= 0
    ) {
      continue;
    }

    totals[description] =
      (totals[description] || 0) + duration;

    totalSeconds += duration;
  }

  return {
    totals,
    totalSeconds
  };
}

function formatDate(date) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: process.env.TIMEZONE || "Asia/Kolkata",
    weekday: "short",
    month: "short",
    day: "2-digit",
    year: "numeric"
  }).format(date);
}

function buildMessage(entries, reportDate) {
  const {
    totals,
    totalSeconds
  } = calculateEntries(entries);

  let message =
    `Good morning everyone\n\n` +
    `Date: ${formatDate(reportDate)}\n\n`;

  const descriptions = Object.keys(totals);

  if (descriptions.length === 0) {
    message += `No time entries found.\n`;
  } else {
    for (const description of descriptions) {
      message +=
        `${description}: ${secondsToHours(totals[description])} hours\n`;
    }
  }

  message +=
    `\nTotal: ${secondsToHours(totalSeconds)} hours`;

  return {
    message,
    totalSeconds,
    totals
  };
}

module.exports = {
  calculateEntries,
  buildMessage,
  secondsToHours,
  parseDuration
};