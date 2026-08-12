require("dotenv").config();
const fs = require("fs");
const path = require("path");
const axios = require("axios");

const ENV_PATH = path.join(__dirname, ".env");
const API_URL = "https://api.clockify.me/api/v1/user";

async function setup() {
    const apiKey = process.env.CLOCKIFY_API_KEY;

    if (!apiKey || apiKey === "your_clockify_api_key") {
        console.error("❌ CLOCKIFY_API_KEY is missing in .env");
        process.exit(1);
    }

    try {
        console.log("🔍 Fetching your Clockify account information...");

        const response = await axios.get(API_URL, {
            headers: {
                "X-Api-Key": apiKey
            },
            timeout: 15000
        });

        const user = response.data;

        if (!user.id) {
            throw new Error("User ID was not returned by Clockify.");
        }

        if (!user.activeWorkspace) {
            throw new Error("Active Workspace ID was not returned by Clockify.");
        }

        let env = fs.readFileSync(ENV_PATH, "utf8");

        env = updateEnv(env, "CLOCKIFY_USER_ID", user.id);
        env = updateEnv(env, "CLOCKIFY_WORKSPACE_ID", user.activeWorkspace);

        fs.writeFileSync(ENV_PATH, env);

        console.log("\n✅ Setup complete!\n");
        console.log(`User ID:      ${user.id}`);
        console.log(`Workspace ID: ${user.activeWorkspace}`);
        console.log("\nYour .env has been updated.");
    } catch (error) {
        const status = error.response?.status;

        if (status === 401) {
            console.error("❌ Invalid Clockify API key.");
        } else if (status === 403) {
            console.error("❌ Clockify rejected the API request.");
        } else {
            console.error(
                "❌ Setup failed:",
                error.response?.data || error.message
            );
        }

        process.exit(1);
    }
}

function updateEnv(content, key, value) {
    const regex = new RegExp(`^${key}=.*$`, "m");

    if (regex.test(content)) {
        return content.replace(regex, `${key}=${value}`);
    }

    return `${content.trimEnd()}\n${key}=${value}\n`;
}

setup();