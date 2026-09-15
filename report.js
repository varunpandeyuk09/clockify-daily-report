function parseDuration(duration) {
  if (!duration) return 0;

  // Clockify ISO-8601 duration:
  // PT1H20M1S, PT45M30S, PT2H, PT0S, -PT1H, P1DT2H
  // Handle negative durations (running timers sometimes)
  const trimmed = String(duration).trim();
  const isNegative = trimmed.startsWith("-");
  const clean = isNegative ? trimmed.slice(1) : trimmed;

  const match = clean.match(
    /^P(?:(\d+)D)?T?(?:(\d+)H)?(?:(\d+)M)?(?:(\d+(?:\.\d+)?)S)?$/
  );

  // Fallback to PT-only pattern
  if (!match) {
    const ptMatch = clean.match(
      /^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+(?:\.\d+)?)S)?$/
    );
    if (!ptMatch) return 0;
    const hours = Number(ptMatch[1] || 0);
    const minutes = Number(ptMatch[2] || 0);
    const seconds = Number(ptMatch[3] || 0);
    const total = hours * 3600 + minutes * 60 + seconds;
    return isNegative ? -total : total;
  }

  const days = Number(match[1] || 0);
  const hours = Number(match[2] || 0);
  const minutes = Number(match[3] || 0);
  const seconds = Number(match[4] || 0);

  const total = days * 86400 + hours * 3600 + minutes * 60 + seconds;
  return isNegative ? -total : total;
}

// Debug helper: print raw entry details (call with DEBUG=true in .env)
function debugEntry(entry) {
  if (String(process.env.DEBUG || "false").toLowerCase() !== "true") return;
  const desc = getDescription(entry);
  const dur = entry?.timeInterval?.duration;
  const start = entry?.timeInterval?.start;
  const end = entry?.timeInterval?.end;
  const parsed = parseDuration(dur);
  console.log(`  [DEBUG] "${desc}" | duration=${dur} | parsed=${parsed}s | start=${start} | end=${end} | id=${entry?.id}`);
}

function secondsToHours(seconds) {
  return (seconds / 3600).toFixed(2);
}

function computeDurationFromInterval(entry, reportEndIso) {
  // For running timers Clockify returns duration=null and end=null
  // Compute from start -> end (or now capped to reportEnd)
  const interval = entry?.timeInterval;
  if (!interval?.start) return 0;

  // If duration exists and valid, prefer it
  const parsed = parseDuration(interval.duration);
  if (parsed > 0) return parsed;

  try {
    const start = new Date(interval.start);
    let end;
    if (interval.end) {
      end = new Date(interval.end);
    } else {
      // running timer: use now, but cap to reportEnd if provided
      const now = new Date();
      end = reportEndIso ? new Date(reportEndIso) : now;
      // if now is earlier than reportEnd, use now
      if (now < end) end = now;
    }
    const diff = (end - start) / 1000;
    return diff > 0 ? diff : 0;
  } catch {
    return 0;
  }
}

function getDescription(entry) {
  const desc = entry?.description?.trim();
  if (desc) return desc;
  // Fallback: use project/task name if hydrated, else generic
  if (entry?.project?.name) return entry.project.name;
  if (entry?.projectId) return `Project:${entry.projectId.slice(0, 6)}`;
  if (entry?.task?.name) return entry.task.name;
  return "(No description)";
}

function calculateEntries(entries, reportEndIso) {
  const totals = {};
  let totalSeconds = 0;
  const ignored = [];
  const details = [];

  for (const entry of entries) {
    const description = getDescription(entry);
    const isFallbackDescription = !entry?.description?.trim();

    let duration = parseDuration(entry?.timeInterval?.duration);

    // If duration is 0/invalid/negative, try to compute from interval
    if (!Number.isFinite(duration) || duration <= 0) {
      duration = computeDurationFromInterval(entry, reportEndIso);
    }

    // Handle negative durations (Clockify running)
    if (duration < 0) duration = Math.abs(duration);

    if (!Number.isFinite(duration) || duration <= 0) {
      ignored.push({
        id: entry?.id || "unknown",
        description: description,
        reason: !entry?.timeInterval?.duration ? "missing/zero duration + interval compute failed" : `invalid duration: ${entry?.timeInterval?.duration}`,
        start: entry?.timeInterval?.start,
        end: entry?.timeInterval?.end
      });
      continue;
    }

    // Very small durations < 1 sec are likely noise but still count
    totals[description] = (totals[description] || 0) + duration;
    totalSeconds += duration;

    details.push({
      description,
      duration,
      hours: secondsToHours(duration),
      isFallbackDescription,
      start: entry?.timeInterval?.start
    });
  }

  return {
    totals,
    totalSeconds,
    ignored,
    details
  };
}

function formatDate(date) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: process.env.TIMEZONE || "Asia/Kolkata",
    weekday: "long",
    month: "long",
    day: "2-digit",
    year: "numeric"
  }).format(date);
}

function formatDateShort(date) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: process.env.TIMEZONE || "Asia/Kolkata",
    month: "short",
    day: "2-digit"
  }).format(date);
}

function formatHoursPretty(seconds) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

function buildMessage(entries, reportDate, options = {}) {
  const reportEndIso = options.reportEndIso || null;
  const {
    totals,
    totalSeconds,
    ignored,
    details
  } = calculateEntries(entries, reportEndIso);

  const dateStr = formatDate(reportDate);
  const currentDateStr = formatDate(new Date());
  const totalHours = secondsToHours(totalSeconds);

  // Stylish emoji report - uniform icons + neutral calendar
  let message = "";
  message += `☀️ *Good Morning Everyone!* ☀️\n`;
  message += `🗓️ *${currentDateStr}*\n`;
  message += `━━━━━━━━━━━━━━━━━━━━━━\n`;

  const descriptions = Object.keys(totals);

  if (descriptions.length === 0) {
    message += `😴 *No time entries found for this day.*\n`;
  } else {
    const shortDate = formatDateShort(reportDate);
    message += `💼 *Work Report for ${shortDate}:*\n\n`;
    // Sort by time spent descending for nicer view
    const sorted = Object.entries(totals).sort((a, b) => b[1] - a[1]);
    sorted.forEach(([description, seconds]) => {
      const hours = secondsToHours(seconds);
      const pretty = formatHoursPretty(seconds);
      message += `🔹 *${description}*\n`;
      message += `   ⏱️  ${hours} hours  (${pretty})\n`;
    });
  }

  message += `\n━━━━━━━━━━━━━━━━━━━━━━\n`;
  message += `✨ *Total Time:* ⏰ *${totalHours} hours* ✨\n`;
  if (totalSeconds > 0) {
    const prettyTotal = formatHoursPretty(totalSeconds);
    message += `   _(${prettyTotal} • ${descriptions.length} task${descriptions.length !== 1 ? "s" : ""})_\n`;
  }
  message += `━━━━━━━━━━━━━━━━━━━━━━\n`;
  message += `🌸 _Have a wonderful & productive day!_ 🚀`;

  return {
    message,
    totalSeconds,
    totals,
    ignored,
    details
  };
}

module.exports = {
  calculateEntries,
  buildMessage,
  secondsToHours,
  parseDuration,
  computeDurationFromInterval,
  getDescription
};