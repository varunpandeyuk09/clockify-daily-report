require("dotenv").config();

const readline = require("readline");
const { getTimeEntries } = require("./clockify");
const { buildMessage } = require("./report");

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

async function main() {
  try {
    const dateString = await ask(
      "Enter date (YYYY-MM-DD): "
    );

    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
      throw new Error(
        "Invalid format. Use YYYY-MM-DD"
      );
    }

    const {
      start,
      end,
      reportDate
    } = getDateRange(dateString);

    const entries = await getTimeEntries(
      start,
      end
    );

    console.log(`\nFetched ${entries.length} entries from Clockify (${start} -> ${end})`);

    const result = buildMessage(
      entries,
      reportDate,
      { reportEndIso: end }
    );

    console.log("\n" + result.message);

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