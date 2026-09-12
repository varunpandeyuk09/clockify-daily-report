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
  const pageSize = 100;

  while (true) {
    const response = await axios.get(
      `${BASE_URL}/workspaces/${workspaceId}/user/${userId}/time-entries`,
      {
        headers: {
          "X-Api-Key": apiKey
        },
        params: {
          start,
          end,
          page,
          "page-size": pageSize,
          hydrated: true
        },
        timeout: 30000
      }
    );

    const data = Array.isArray(response.data) ? response.data : [];
    allEntries = allEntries.concat(data);

    // last page if fewer than pageSize
    if (data.length < pageSize) break;
    page += 1;

    // safety cap to avoid infinite loop (100 pages = 10000 entries)
    if (page > 100) break;
  }

  return allEntries;
}

module.exports = {
  getTimeEntries
};