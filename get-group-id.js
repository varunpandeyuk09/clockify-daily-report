/**
 * Helper to get WhatsApp Group IDs
 * Run: npm i whatsapp-web.js qrcode-terminal
 *      node get-group-id.js
 * Then scan QR -> it will list all groups where you are a member
 */
let Client, LocalAuth, QR;
try {
  ({ Client, LocalAuth } = require("whatsapp-web.js"));
  QR = require("qrcode-terminal");
} catch {
  console.error("❌ Missing dependencies. Run:");
  console.error("   npm i whatsapp-web.js qrcode-terminal");
  process.exit(1);
}

console.log("🔍 Starting WhatsApp client...");
console.log("📱 Scan QR below with your WhatsApp (Linked Devices -> Link a device)\n");

const fs = require("fs");
function findBrowser() {
  const candidates = [
    "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
    process.env.LOCALAPPDATA + "\\Google\\Chrome\\Application\\chrome.exe",
    "C:\\Program Files\\BraveSoftware\\Brave-Browser\\Application\\brave.exe",
    "C:\\Program Files (x86)\\BraveSoftware\\Brave-Browser\\Application\\brave.exe",
    "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
    "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
  ];
  for (const p of candidates) {
    if (p && fs.existsSync(p)) return p;
  }
  return null;
}
const browserPath = findBrowser();
if (browserPath) console.log("🌐 Using browser:", browserPath);
else console.log("⚠️  No Chrome/Edge/Brave found, trying default...");

const client = new Client({
  authStrategy: new LocalAuth({ dataPath: "./.wwebjs_auth" }),
  webVersionCache: {
    type: "remote",
    remotePath: "https://raw.githubusercontent.com/wppconnect-team/wa-version/main/html/2.3000.1015901305-alpha.html",
  },
  puppeteer: {
    headless: false,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
    ...(browserPath ? { executablePath: browserPath } : {}),
  }
});

client.on("qr", (qr) => {
  QR.generate(qr, { small: true });
  console.log("\nOr open this QR in browser: https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=" + encodeURIComponent(qr));
});

client.on("ready", async () => {
  console.log("\n✅ Connected! Fetching groups (waiting 5s for WhatsApp to fully load)...\n");
  // Wait longer + ensure WhatsApp Web UI is ready
  await new Promise(r => setTimeout(r, 5000));
  try {
    let chats;
    try {
      chats = await client.getChats();
    } catch (e) {
      console.log("⚠️ getChats failed, trying fallback via page evaluate...");
      // Fallback: directly via puppeteer evaluate
      chats = await client.pupPage.evaluate(async () => {
        const chats = await window.WWebJS.getChats();
        return chats;
      });
      // If fallback also fails, throw original
      if (!chats) throw e;
    }
    console.log(`📦 Fetched ${chats.length} total chats`);
    const groups = chats.filter((c) => c.isGroup);

    if (groups.length === 0) {
      console.log("❌ No groups found. Make sure manager already added you.");
      console.log("💡 Try: Close WhatsApp Web in browser, then restart this script");
    } else {
      console.log(`Found ${groups.length} groups:\n`);
      groups.forEach((g, i) => {
        console.log(`${i + 1}. ${g.name}`);
        console.log(`   ID: ${g.id._serialized}`);
        try { console.log(`   Participants: ${g.participants?.length ?? "unknown"}`); } catch {}
        console.log("");
      });

      console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
      console.log("👉 Copy the ID of your manager's group (ends with @g.us)");
      console.log("👉 Paste it in .env as:");
      console.log("   WHATSAPP_GROUP_ID=120363xxxx@g.us");
      console.log("👉 Then set WHATSAPP_MODE=webjs and WHATSAPP_ENABLED=true");
      console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");
      console.log("Tip: Group name se identify karo. Agar similar names hai to participants count se pehchano.");
    }
  } catch (e) {
    console.error("❌ Failed to fetch groups:", e.message);
    console.error("Full error:", e);
    console.error(e.stack);
    console.log("\n💡 Retry: Press Ctrl+C, delete .wwebjs_auth folder and run again");
    console.log("💡 Also try: Close all Brave/Chrome windows then run again");
  }
  console.log("\nPress Ctrl+C to exit. Session saved in .wwebjs_auth (no need to scan again)");
  // Keep alive for 60s to allow copy
  setTimeout(() => console.log("\n⏰ Still running... Ctrl+C to exit"), 60000);
});

client.on("auth_failure", (m) => console.error("Auth failed:", m));
client.on("disconnected", (r) => console.log("Disconnected:", r));

client.initialize();
