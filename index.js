require("dotenv").config();

const readline = require("readline");
const { getTimeEntries } = require("./clockify");
const { buildMessage } = require("./report");
const { calculateEntries } = require("./report");
const { sendWhatsApp } = require("./whatsapp");
const { getDateRangeForDaysAgo, isWeekend } = require("./date-utils");

const fs = require("fs");
const path = require("path");
const SENT_LOG = path.join(__dirname, "sent-log.json");

function isAlreadySent(dateStr) {
  try {
    if (!fs.existsSync(SENT_LOG)) return false;
    const data = JSON.parse(fs.readFileSync(SENT_LOG, "utf8"));
    return Array.isArray(data) && data.includes(dateStr);
  } catch { return false; }
}

function markAsSent(dateStr) {
  try {
    let data = [];
    if (fs.existsSync(SENT_LOG)) {
      try { data = JSON.parse(fs.readFileSync(SENT_LOG, "utf8")); } catch {}
      if (!Array.isArray(data)) data = [];
    }
    if (!data.includes(dateStr)) {
      data.push(dateStr);
      // Keep last 90 days only
      if (data.length > 90) data = data.slice(-90);
      fs.writeFileSync(SENT_LOG, JSON.stringify(data, null, 2), "utf8");
    }
    console.log(`📝 Logged sent for ${dateStr} in sent-log.json`);
  } catch (e) {
    console.log("⚠️  Failed to write sent log:", e.message);
  }
}

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function ask(question) {
  return new Promise(resolve => {
    rl.question(question, resolve);
  });
}

function getDateRange(dateString) {
  const date = new Date(`${dateString}T00:00:00+05:30`);

  if (Number.isNaN(date.getTime())) {
    throw new Error("Invalid date.");
  }

  const nextDay = new Date(date);
  nextDay.setDate(nextDay.getDate() + 1);

  return {
    start: date.toISOString(),
    end: nextDay.toISOString(),
    reportDate: date
  };
}

async function findLastAvailableReport(maxDaysBack = 7) {
  const workdaysOnly = String(process.env.WORKDAYS_ONLY || "true").toLowerCase() === "true";
  console.log(`\n🔍 DEFAULT_REPORT=true → last available report dhoondh raha hu (max ${maxDaysBack} days back)...`);
  for (let daysAgo = 1; daysAgo <= maxDaysBack; daysAgo++) {
    const { start, end, reportDate, reportDateStr } = getDateRangeForDaysAgo(daysAgo);
    if (workdaysOnly && isWeekend(reportDate)) {
      console.log(`⏭️  Skipping ${reportDateStr} (weekend)`);
      continue;
    }
    console.log(`📅 Checking ${reportDateStr}...`);
    try {
      const entries = await getTimeEntries(start, end);
      const { totalSeconds } = calculateEntries(entries, end);

      if (totalSeconds > 0) {
        console.log(`✅ Found report for ${reportDateStr} (${(totalSeconds / 3600).toFixed(2)}h, ${entries.length} entries)`);
        return { start, end, reportDate, reportDateStr, entries };
      } else {
        console.log(`   No entries for ${reportDateStr} (${entries.length} raw entries from API)`);
      }
    } catch (e) {
      console.log(`   Error for ${reportDateStr}: ${e.message}`);
    }
  }
  // Fallback to yesterday even if empty
  console.log("⚠️  No report found in last 7 working days, using yesterday");
  const { start, end, reportDate, reportDateStr } = getDateRangeForDaysAgo(1);
  const entries = await getTimeEntries(start, end);
  return { start, end, reportDate, reportDateStr, entries };
}

async function main() {
  try {
    // Weekend skip: if today is Sat/Sun and TESTING != true, skip entirely
    const isTestingWeekend = String(process.env.TESTING || "false").toLowerCase() === "true";
    if (!isTestingWeekend) {
      const todayIST = new Intl.DateTimeFormat("en-CA", { timeZone: process.env.TIMEZONE || "Asia/Kolkata" }).format(new Date());
      const todayDate = new Date(todayIST + "T00:00:00+05:30");
      const day = todayDate.getDay(); // 0=Sun, 6=Sat
      if (day === 0 || day === 6) {
        console.log(`\n⏭️  Today is ${day === 0 ? "Sunday" : "Saturday"} and TESTING=false → skipping auto-send (weekend)`);
        console.log("💡 To test on weekend, set TESTING=true in .env");
        return;
      }
    }

    const defaultReport = String(process.env.DEFAULT_REPORT || "true").toLowerCase() === "true";
    let start, end, reportDate, reportDateStr, entries;

    if (defaultReport) {
      const result = await findLastAvailableReport(7);
      start = result.start;
      end = result.end;
      reportDate = result.reportDate;
      reportDateStr = result.reportDateStr;
      entries = result.entries;
      console.log(`\n📌 Auto-selected: ${reportDateStr}`);
    } else {
      const dateString = await ask("Enter date (YYYY-MM-DD): ");
      if (!/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
        throw new Error("Invalid format. Use YYYY-MM-DD");
      }
      const range = getDateRange(dateString);
      start = range.start;
      end = range.end;
      reportDate = range.reportDate;
      reportDateStr = dateString;
      entries = await getTimeEntries(start, end);
    }

    // Check duplicate log (skip if already sent today, unless TESTING=true)
    const isTesting = String(process.env.TESTING || "false").toLowerCase() === "true";
    if (!isTesting && isAlreadySent(reportDateStr)) {
      console.log(`\n⏭️  Already sent for ${reportDateStr} (found in sent-log.json) — skipping WhatsApp to avoid duplicate`);
      console.log("💡 Force resend: delete entry from sent-log.json or set TESTING=true or run with DEFAULT_REPORT=false");
    } else {
      console.log(`\nFetched ${entries.length} entries from Clockify (${start} -> ${end})`);

      const result = buildMessage(
        entries,
        reportDate,
        { reportEndIso: end }
      );

      console.log("\n" + result.message);

      // Auto WhatsApp (if enabled in .env)
      const whatsappEnabled = String(process.env.WHATSAPP_ENABLED || "false").toLowerCase() === "true";
      let sent = false;
      if (whatsappEnabled) {
        sent = await sendWhatsApp(result.message);
        // sendWhatsApp returns true for auto modes, undefined for desktop-group (async). Treat as sent if no error
        if (sent !== false) sent = true;
      } else {
        const ans = await ask("\nSend to WhatsApp? (y/n): ");
        if (String(ans).trim().toLowerCase() === "y") {
          sent = await sendWhatsApp(result.message);
          if (sent !== false) sent = true;
        }
      }

      // Mark as sent only if actually sent (and not testing)
      if (!isTesting && sent) {
        markAsSent(reportDateStr);
      } else if (isTesting) {
        console.log("🧪 TESTING=true → not logging to sent-log.json");
      }

      // Debug: show ignored entries if any
      if (result.ignored && result.ignored.length > 0) {
        console.log(`\n⚠️  Ignored ${result.ignored.length} entries (zero/invalid duration):`);
        result.ignored.forEach((ig, i) => {
          console.log(`  ${i + 1}. id=${ig.id} desc="${ig.description}" reason=${ig.reason} start=${ig.start} end=${ig.end}`);
        });
      }

      if (result.details) {
        const fallbackCount = result.details.filter(d => d.isFallbackDescription).length;
        if (fallbackCount > 0) {
          console.log(`\nℹ️  ${fallbackCount} entries had empty description, grouped as "(No description)" / Project name`);
        }
      }
      return;
    }

    // If already sent, still show report but don't send
    const result = buildMessage(entries, reportDate, { reportEndIso: end });
    console.log("\n" + result.message);
    if (result.ignored && result.ignored.length > 0) {
      console.log(`\n⚠️  Ignored ${result.ignored.length} entries`);
    }



  } catch (error) {
    console.error(
      "\nError:",
      error.response?.data || error.message
    );
  } finally {
    rl.close();
  }
}

main();