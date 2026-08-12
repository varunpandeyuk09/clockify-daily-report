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

    const result = buildMessage(
      entries,
      reportDate
    );

    console.log("\n" + result.message);

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