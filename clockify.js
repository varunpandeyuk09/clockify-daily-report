const axios = require("axios");

const BASE_URL = "https://api.clockify.me/api/v1";

function config() {
  const required = [
    "CLOCKIFY_API_KEY",
    "CLOCKIFY_WORKSPACE_ID",
    "CLOCKIFY_USER_ID"
  ];

  for (const key of required) {
    if (!process.env[key]) {
      throw new Error(`Missing ${key} in .env`);
    }
  }

  return {
    apiKey: process.env.CLOCKIFY_API_KEY,
    workspaceId: process.env.CLOCKIFY_WORKSPACE_ID,
    userId: process.env.CLOCKIFY_USER_ID
  };
}

async function getTimeEntries(start, end) {
  const { apiKey, workspaceId, userId } = config();

  let allEntries = [];
  let page = 1;
  const pageSize = 500;

  // Fetch ALL entries from 14 days back (no end filter) - Clockify API drops entries with end param
  const fetchStart = new Date(new Date(start).getTime() - 14 * 86400000).toISOString();

  if (String(process.env.DEBUG || "false").toLowerCase() === "true") {
    console.log(`[DEBUG] Fetching from ${fetchStart} (no end filter, 7 days back)`);
  }

  while (true) {
    const response = await axios.get(
      `${BASE_URL}/workspaces/${workspaceId}/user/${userId}/time-entries`,
      {
        headers: {
          "X-Api-Key": apiKey
        },
        params: {
          start: fetchStart,
          page,
          "page-size": pageSize,
          hydrated: true
        },
        timeout: 30000
      }
    );

    const data = Array.isArray(response.data) ? response.data : [];
    allEntries = allEntries.concat(data);

    if (String(process.env.DEBUG || "false").toLowerCase() === "true") {
      console.log(`[DEBUG] Page ${page}: ${data.length} entries (total so far: ${allEntries.length})`);
    }

    if (data.length < pageSize) break;
    page += 1;
    if (page > 100) break;
  }

  // Client-side filter: only entries within [start, end)
  const startMs = new Date(start).getTime();
  const endMs = new Date(end).getTime();
  const filtered = allEntries.filter(e => {
    const entryStart = new Date(e?.timeInterval?.start).getTime();
    return entryStart >= startMs && entryStart < endMs;
  });

  if (String(process.env.DEBUG || "false").toLowerCase() === "true") {
    console.log(`[DEBUG] API returned ${allEntries.length} total entries, ${filtered.length} after date filter [${start} to ${end}]`);
    // Show what got filtered out
    const outside = allEntries.filter(e => {
      const entryStart = new Date(e?.timeInterval?.start).getTime();
      return !(entryStart >= startMs && entryStart < endMs);
    });
    if (outside.length > 0) {
      console.log(`[DEBUG] ${outside.length} entries outside date range (filtered out):`);
      outside.forEach(e => {
        const desc = e?.description?.trim() || e?.project?.name || '(none)';
        console.log(`  - "${desc}" start=${e?.timeInterval?.start}`);
      });
    }
  }

  // Safety warning if suspiciously few entries
  if (filtered.length === 0 && allEntries.length > 0) {
    console.log(`⚠️  Warning: ${allEntries.length} entries fetched but 0 matched date range. Check timezone or date.`);
  }

  return filtered;
}

module.exports = {
  getTimeEntries
};