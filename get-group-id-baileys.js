/**
 * Baileys - Stable alternative to whatsapp-web.js
 * Run: npm i @whiskeysockets/baileys qrcode-terminal
 *      node get-group-id-baileys.js
 */
const { default: makeWASocket, useMultiFileAuthState, fetchLatestBaileysVersion } = require("@whiskeysockets/baileys");
const QR = require("qrcode-terminal");
const pino = require("pino");

async function start() {
  console.log("🔍 Starting Baileys (more stable than whatsapp-web.js)...\n");
  const { state, saveCreds } = await useMultiFileAuthState("./baileys_auth");
  const { version } = await fetchLatestBaileysVersion();
  console.log(`Using WA version: ${version.join(".")}`);

  const sock = makeWASocket({
    version,
    auth: state,
    printQRInTerminal: true,
    logger: pino({ level: "silent" }),
    browser: ["Clockify Report", "Chrome", "1.0.0"],
    syncFullHistory: false,
  });

  sock.ev.on("creds.update", saveCreds);

  sock.ev.on("connection.update", async (update) => {
    const { connection, lastDisconnect, qr } = update;
    if (qr) {
      console.log("📱 Scan QR below (WhatsApp -> Linked Devices -> Link a device):\n");
      QR.generate(qr, { small: true });
    }
    if (connection === "close") {
      const statusCode = lastDisconnect?.error?.output?.statusCode;
      const reason = lastDisconnect?.error?.output?.payload?.message || lastDisconnect?.error?.message || "";
      console.log("Connection closed:", statusCode, reason);
      if (statusCode === 515) {
        console.log("🔄 Stream error 515 - restarting in 2s (normal after QR scan)...");
        setTimeout(() => start(), 2000);
        return;
      }
      if (statusCode === 401 && reason.includes("conflict")) {
        console.log("⚠️  Conflict - WhatsApp Desktop/Web already open!");
        console.log("💡 Close WhatsApp Desktop + web.whatsapp.com completely, then retry");
        console.log("💡 Also check: WhatsApp -> Linked Devices -> max 4 devices, delete old one if full");
        // Auto-clean and retry once
        try {
          const fs = require("fs");
          fs.rmSync("./baileys_auth", { recursive: true, force: true });
          console.log("🧹 Cleaned baileys_auth, retry in 3s (close Desktop first!)...");
        } catch {}
        setTimeout(() => start(), 3000);
        return;
      }
      const shouldReconnect = statusCode !== 401;
      if (shouldReconnect) {
        console.log("Reconnecting...");
        setTimeout(() => start(), 2000);
      } else {
        console.log("❌ Logged out (401). Delete baileys_auth and retry");
      }
    }
    if (connection === "open") {
      console.log("\n✅ Connected! Fetching groups...\n");
      try {
        await new Promise(r => setTimeout(r, 2000));
        const groups = await sock.groupFetchAllParticipating();
        const list = Object.values(groups);
        console.log(`Found ${list.length} groups:\n`);
        list.forEach((g, i) => {
          console.log(`${i + 1}. ${g.subject}`);
          console.log(`   ID: ${g.id}`);
          console.log(`   Participants: ${g.participants.length}`);
          console.log(`   Created: ${new Date(g.creation * 1000).toLocaleDateString()}`);
          console.log("");
        });
        console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
        console.log("👉 Copy ID ending with @g.us");
        console.log("👉 Paste in .env as:");
        console.log("   WHATSAPP_GROUP_ID=<id>");
        console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
        console.log("\nPress Ctrl+C to exit. Auth saved in baileys_auth");
      } catch (e) {
        console.error("Failed:", e.message);
        console.error(e.stack);
      }
    }
  });
}

start().catch(e => console.error(e));
