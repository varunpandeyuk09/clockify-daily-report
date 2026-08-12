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

  const response = await axios.get(
    `${BASE_URL}/workspaces/${workspaceId}/user/${userId}/time-entries`,
    {
      headers: {
        "X-Api-Key": apiKey
      },
      params: {
        start,
        end,
        page: 1,
        "page-size": 100
      },
      timeout: 30000
    }
  );

  return Array.isArray(response.data)
    ? response.data
    : [];
}

module.exports = {
  getTimeEntries
};