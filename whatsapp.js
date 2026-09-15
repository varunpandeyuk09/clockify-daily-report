const axios = require("axios");
const { exec } = require("child_process");

/**
 * Send via CallMeBot (free, no browser, personal/group via phone)
 * Get API key: https://api.callmebot.com/whatsapp.php -> follow instructions
 * .env: WHATSAPP_PHONE=9199xxxxxxx , WHATSAPP_CALLMEBOT_APIKEY=xxxxxx
 */
async function sendViaCallMeBot(text) {
  const phone = process.env.WHATSAPP_PHONE;
  const apikey = process.env.WHATSAPP_CALLMEBOT_APIKEY;

  if (!phone || !apikey) {
    throw new Error("Missing WHATSAPP_PHONE or WHATSAPP_CALLMEBOT_APIKEY in .env");
  }

  const url = "https://api.callmebot.com/whatsapp.php";
  const params = {
    phone,
    text,
    apikey
  };

  const res = await axios.get(url, { params, timeout: 15000 });
  return res.data;
}

/**
 * Open WhatsApp Desktop App (if installed) with pre-filled text
 * Uses whatsapp:// protocol - opens native app directly
 * Fallback to Web if app not found
 */
function openWhatsAppDesktop(text, autoSend = false) {
  const phone = process.env.WHATSAPP_PHONE || "";
  const encoded = encodeURIComponent(text);
  const url = phone
    ? `whatsapp://send?phone=${phone}&text=${encoded}`
    : `whatsapp://send?text=${encoded}`;

  const cmd =
    process.platform === "win32"
      ? `start "" "${url}"`
      : process.platform === "darwin"
      ? `open "${url}"`
      : `xdg-open "${url}"`;

  exec(cmd, (err) => {
    if (err) {
      console.log("Desktop app not found, opening Web...");
      openWhatsAppWeb(text, autoSend);
      return;
    }
    if (autoSend) {
      // Try to auto-press Enter after app opens (Windows only, best-effort)
      setTimeout(() => autoPressEnter(), 2500);
    }
  });
}

function autoPressEnter() {
  if (process.platform !== "win32") return;
  // PowerShell SendKeys to press Enter - WhatsApp Desktop will send if chat is focused
  const psCmd = `powershell -NoProfile -Command "Add-Type -AssemblyName System.Windows.Forms; Start-Sleep -Milliseconds 500; [System.Windows.Forms.SendKeys]::SendWait('~')"`;
  exec(psCmd, (err) => {
    if (err) console.log("Auto-press failed (manual Send needed):", err.message);
    else console.log("🤖 Auto-pressed Enter (if WhatsApp was focused, message sent)");
  });
}

/**
 * Open WhatsApp Desktop and auto-search group by name, paste and send
 * Uses clipboardy for UTF-8 emojis (fixes garbled text)
 * .env: WHATSAPP_GROUP_NAME=Test
 */
async function openWhatsAppDesktopGroupSearch(text) {
  const groupName = process.env.WHATSAPP_GROUP_NAME || "Test";
  const isTesting = String(process.env.TESTING || "false").toLowerCase() === "true";
  const clipboard = require("clipboardy");
  if (isTesting) {
    console.log(`🧪 TESTING=true → only searching group "${groupName}", no send`);
  } else {
    console.log(`🔍 Searching group "${groupName}" and auto-sending (clipboardy for emojis)...`);
  }

  // 1. Copy group name via clipboardy (handles ASCII, no need for powershell)
  try { await clipboard.default.write(groupName); } catch {}

  exec('start "" "whatsapp://"', async (err) => {
    if (err) {
      console.log("Failed to open WhatsApp Desktop, trying Web...");
      openWhatsAppWeb(text);
      return;
    }

    await new Promise(r => setTimeout(r, 3000));
    try {
      const { execSync } = require("child_process");
      const psActivate = `
Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName Microsoft.VisualBasic
try { [Microsoft.VisualBasic.Interaction]::AppActivate("WhatsApp") } catch {}
Start-Sleep -Milliseconds 1000
[System.Windows.Forms.SendKeys]::SendWait('^k')
Start-Sleep -Milliseconds 500
[System.Windows.Forms.SendKeys]::SendWait('^f')
Start-Sleep -Milliseconds 700
`;
      execSync(`powershell -NoProfile -Command "${psActivate.replace(/"/g, '\\"').replace(/\n/g, ";")}"`, { stdio: "pipe" });
    } catch {}

    await new Promise(r => setTimeout(r, 700));
    exec('powershell -NoProfile -Command "Add-Type -AssemblyName System.Windows.Forms; [System.Windows.Forms.SendKeys]::SendWait(\'^v\')"', async () => {
      console.log(`⌨️  Pasted "${groupName}" in search`);
      await new Promise(r => setTimeout(r, 900));
      exec('powershell -NoProfile -Command "Add-Type -AssemblyName System.Windows.Forms; [System.Windows.Forms.SendKeys]::SendWait(\'~\')"', async () => {
        console.log("↩️  Selected group");
        if (isTesting) {
          console.log(`🧪 TESTING=true → stopped after search, not pasting/sending. Group "${groupName}" should be open now.`);
          return;
        }
        await new Promise(r => setTimeout(r, 1500));
        // Now copy report via clipboardy (UTF-8 safe, fixes garbled emojis)
        try { await clipboard.default.write(text); console.log("📋 Copied report via clipboardy (emoji-safe)"); } catch (e) { console.log("clipboardy failed:", e.message); }
        await new Promise(r => setTimeout(r, 400));
        exec('powershell -NoProfile -Command "Add-Type -AssemblyName System.Windows.Forms; [System.Windows.Forms.SendKeys]::SendWait(\'^v\')"', async () => {
          console.log("📋 Pasted report");
          await new Promise(r => setTimeout(r, 900));
          exec('powershell -NoProfile -Command "Add-Type -AssemblyName System.Windows.Forms; Start-Sleep -Milliseconds 400; [System.Windows.Forms.SendKeys]::SendWait(\'~\')"', (e) => {
            if (e) console.log("❌ Auto-send failed, please manually Ctrl+V + Enter in Test group");
            else console.log(`✅ Auto-sent to group "${groupName}" — check Test group (emoji should be correct now)`);
          });
        });
      });
    });
  });
}

/**
 * Open WhatsApp Web with pre-filled text (semi-auto, user just clicks Send)
 * Works for phone or group invite - uses default browser
 * .env: WHATSAPP_PHONE=9199xxxxxxx (optional, if empty opens with text only)
 */
function openWhatsAppWeb(text, autoSend = false) {
  const phone = process.env.WHATSAPP_PHONE || "";
  const encoded = encodeURIComponent(text);
  // wa.me works for personal; web.whatsapp.com/send works for both
  const url = phone
    ? `https://web.whatsapp.com/send?phone=${phone}&text=${encoded}`
    : `https://web.whatsapp.com/send?text=${encoded}`;

  const cmd =
    process.platform === "win32"
      ? `start "" "${url}"`
      : process.platform === "darwin"
      ? `open "${url}"`
      : `xdg-open "${url}"`;

  exec(cmd, (err) => {
    if (err) console.error("Failed to open browser:", err.message);
    else if (autoSend && process.platform === "win32") {
      setTimeout(() => autoPressEnter(), 4000);
    }
  });
}

/**
 * Send via Baileys (full auto, most stable, supports groups)
 * Requires: npm i @whiskeysockets/baileys qrcode-terminal pino
 * Uses baileys_auth from get-group-id-baileys.js (no re-scan if already done)
 */
async function sendViaBaileys(text) {
  const { default: makeWASocket, useMultiFileAuthState, fetchLatestBaileysVersion } = require("@whiskeysockets/baileys");
  const pino = require("pino");
  const QR = require("qrcode-terminal");

  const target = process.env.WHATSAPP_GROUP_ID || (process.env.WHATSAPP_PHONE ? `${process.env.WHATSAPP_PHONE}@s.whatsapp.net` : null);
  if (!target) throw new Error("Missing WHATSAPP_GROUP_ID or WHATSAPP_PHONE in .env");
  // Baileys group ID uses @g.us, personal uses @s.whatsapp.net
  const jid = target.includes("@") ? target : `${target}@g.us`;

  const { state, saveCreds } = await useMultiFileAuthState("./baileys_auth");
  const { version } = await fetchLatestBaileysVersion();

  return new Promise(async (resolve, reject) => {
    const sock = makeWASocket({
      version,
      auth: state,
      logger: pino({ level: "silent" }),
      printQRInTerminal: false,
      browser: ["Clockify Report", "Chrome", "1.0.0"],
    });

    let qrShown = false;
    sock.ev.on("creds.update", saveCreds);

    sock.ev.on("connection.update", async (update) => {
      const { connection, lastDisconnect, qr } = update;
      if (qr && !qrShown) {
        qrShown = true;
        console.log("\n📱 Scan QR with WhatsApp (Linked Devices -> Link a device):");
        QR.generate(qr, { small: true });
      }
      if (connection === "close") {
        const code = lastDisconnect?.error?.output?.statusCode;
        if (code === 515) {
          console.log("🔄 Stream 515, retrying...");
          setTimeout(() => sendViaBaileys(text).then(resolve).catch(reject), 2000);
          return;
        }
        if (code !== 401) console.log("Connection closed, retrying...", lastDisconnect?.error?.output);
        else reject(new Error("Baileys auth failed (401). Delete baileys_auth and re-scan via node get-group-id-baileys.js"));
      }
      if (connection === "open") {
        try {
          // Wait for groups to sync
          await new Promise(r => setTimeout(r, 1500));
          await sock.sendMessage(jid, { text });
          console.log(`📤 Sent via Baileys to ${jid}`);
          // Don't close immediately, give time to send
          setTimeout(async () => {
            try { await sock.logout(); } catch {}
            try { sock.end(); } catch {}
            resolve(true);
          }, 1000);
        } catch (e) {
          reject(e);
        }
      }
    });

    setTimeout(() => reject(new Error("Baileys timeout (QR not scanned in 60s)")), 60000);
  });
}

/**
 * Send via whatsapp-web.js (full auto, supports groups)
 * Requires: npm i whatsapp-web.js qrcode-terminal
 * .env: WHATSAPP_GROUP_ID=120363xxxx@g.us  or WHATSAPP_PHONE=9199xxxx@c.us
 */
async function sendViaWebJS(text) {
  let Client, QR;
  try {
    ({ Client } = require("whatsapp-web.js"));
    QR = require("qrcode-terminal");
  } catch {
    throw new Error("whatsapp-web.js not installed. Run: npm i whatsapp-web.js qrcode-terminal");
  }

  const target = process.env.WHATSAPP_GROUP_ID || (process.env.WHATSAPP_PHONE ? `${process.env.WHATSAPP_PHONE}@c.us` : null);
  if (!target) {
    throw new Error("Missing WHATSAPP_GROUP_ID or WHATSAPP_PHONE in .env");
  }

  // Find system browser (Chrome/Brave/Edge) for puppeteer when download was skipped
  const fs = require("fs");
  function findBrowser() {
    const candidates = [
      "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
      "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
      (process.env.LOCALAPPDATA || "") + "\\Google\\Chrome\\Application\\chrome.exe",
      "C:\\Program Files\\BraveSoftware\\Brave-Browser\\Application\\brave.exe",
      "C:\\Program Files (x86)\\BraveSoftware\\Brave-Browser\\Application\\brave.exe",
      "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
    ];
    for (const p of candidates) if (p && fs.existsSync(p)) return p;
    return null;
  }
  const browserPath = findBrowser();

  return new Promise((resolve, reject) => {
    const client = new Client({
      authStrategy: new (require("whatsapp-web.js").LocalAuth)({ dataPath: "./.wwebjs_auth" }),
      webVersionCache: {
        type: "remote",
        remotePath: "https://raw.githubusercontent.com/wppconnect-team/wa-version/main/html/2.3000.1015901305-alpha.html",
      },
      puppeteer: {
        headless: true,
        args: ["--no-sandbox", "--disable-setuid-sandbox"],
        ...(browserPath ? { executablePath: browserPath } : {}),
      }
    });

    client.on("qr", (qr) => {
      console.log("\n📱 Scan QR with WhatsApp to login:");
      QR.generate(qr, { small: true });
    });

    client.on("ready", async () => {
      console.log("\n✅ WhatsApp connected, sending...");
      try {
        const chatId = target.includes("@") ? target : `${target}@c.us`;
        await client.sendMessage(chatId, text);
        console.log(`📤 Sent to ${chatId}`);
        await client.destroy();
        resolve(true);
      } catch (e) {
        await client.destroy();
        reject(e);
      }
    });

    client.on("auth_failure", (m) => reject(new Error("Auth failure: " + m)));
    client.initialize().catch(reject);

    // Timeout after 60s if QR not scanned
    setTimeout(() => reject(new Error("WhatsApp login timeout (QR not scanned in 60s)")), 60000);
  });
}

/**
 * Main dispatcher based on WHATSAPP_MODE
 * .env: WHATSAPP_MODE=callmebot | webjs | browser | desktop | desktop-auto | browser-auto | auto (default)
 *        WHATSAPP_ENABLED=true
 */
async function sendWhatsApp(text) {
  const enabled = String(process.env.WHATSAPP_ENABLED || "false").toLowerCase() === "true";
  if (!enabled) {
    console.log("\nℹ️  WhatsApp disabled (WHATSAPP_ENABLED=false). Skipping.");
    return false;
  }

  const mode = (process.env.WHATSAPP_MODE || "auto").toLowerCase();
  const autoSend = String(process.env.WHATSAPP_AUTO_SEND || "false").toLowerCase() === "true";

  try {
    if (mode === "callmebot") {
      console.log("\n📤 Sending via CallMeBot (fully auto, no click needed)...");
      await sendViaCallMeBot(text);
      console.log("✅ Sent via CallMeBot (auto, no click)");
      return true;
    }

    if (mode === "baileys") {
      console.log("\n📤 Sending via Baileys (fully auto, no click needed)...");
      await sendViaBaileys(text);
      return true;
    }

    if (mode === "webjs") {
      console.log("\n📤 Sending via whatsapp-web.js (fully auto, no click needed)...");
      await sendViaWebJS(text);
      return true;
    }

    if (mode === "browser") {
      console.log("\n🌐 Opening WhatsApp Web (pre-filled, click Send)...");
      openWhatsAppWeb(text, autoSend);
      if (autoSend) console.log("🤖 Auto-send ON: will try to auto-press Enter in 4s");
      return true;
    }

    if (mode === "browser-auto") {
      console.log("\n🌐 Opening WhatsApp Web + auto-press Enter...");
      openWhatsAppWeb(text, true);
      return true;
    }

    if (mode === "desktop") {
      console.log("\n💻 Opening WhatsApp Desktop App (pre-filled, click Send)...");
      openWhatsAppDesktop(text, autoSend);
      if (autoSend) console.log("🤖 Auto-send ON: will try to auto-press Enter in 2.5s");
      return true;
    }

    if (mode === "desktop-auto") {
      console.log("\n💻 Opening WhatsApp Desktop App + auto-press Enter...");
      openWhatsAppDesktop(text, true);
      return true;
    }

    if (mode === "desktop-group") {
      console.log("\n💻 Opening WhatsApp Desktop → searching group and auto-sending...");
      openWhatsAppDesktopGroupSearch(text);
      return true;
    }

    // auto: try baileys first (most stable), then webjs, then callmebot
    try {
      require.resolve("@whiskeysockets/baileys");
      console.log("\n📤 Auto mode: using Baileys (fully auto)...");
      await sendViaBaileys(text);
      return true;
    } catch {}

    try {
      require.resolve("whatsapp-web.js");
      console.log("\n📤 Auto mode: using whatsapp-web.js (fully auto)...");
      await sendViaWebJS(text);
      return true;
    } catch {}

    if (process.env.WHATSAPP_PHONE && process.env.WHATSAPP_CALLMEBOT_APIKEY) {
      console.log("\n📤 Auto mode: using CallMeBot (fully auto)...");
      await sendViaCallMeBot(text);
      console.log("✅ Sent via CallMeBot");
      return true;
    }

    // Desktop/Web with autoPress if WHATSAPP_AUTO_SEND=true
    const useAuto = autoSend;
    if (process.platform === "win32" || process.platform === "darwin") {
      console.log(`\n💻 Auto mode: opening WhatsApp Desktop App${useAuto ? " + auto-press Enter" : ""}...`);
      openWhatsAppDesktop(text, useAuto);
      return true;
    }

    console.log(`\n🌐 Auto mode: opening WhatsApp Web${useAuto ? " + auto-press Enter" : ""}...`);
    openWhatsAppWeb(text, useAuto);
    return true;
  } catch (e) {
    console.error("\n❌ WhatsApp send failed:", e.response?.data || e.message);
    // Fallback to desktop -> browser
    console.log("➡️  Falling back to WhatsApp Desktop/Web...");
    try {
      openWhatsAppDesktop(text);
    } catch {
      openWhatsAppWeb(text);
    }
    return false;
  }
}

module.exports = { sendWhatsApp, sendViaCallMeBot, sendViaWebJS, sendViaBaileys, openWhatsAppWeb, openWhatsAppDesktop, openWhatsAppDesktopGroupSearch };
