import bcrypt from "bcryptjs";
import Database from "better-sqlite3";
import express from "express";
import rateLimit from "express-rate-limit";
import session from "express-session";
import helmet from "helmet";
import multer from "multer";
import { createHmac, randomBytes, randomInt, timingSafeEqual } from "node:crypto";
import { mkdirSync, existsSync } from "node:fs";
import { writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { contactEnquiryTypes, siteContentDefaults } from "../src/data.js";

const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const dataDir = resolve(rootDir, "data");
const uploadsDir = resolve(dataDir, "uploads");
const mediaDir = resolve(dataDir, "media");
const port = Number(process.env.PORT || 3001);
const sessionSecret = process.env.SESSION_SECRET;
const adminSignupCode = process.env.ADMIN_SIGNUP_CODE?.trim() || "";
const databaseFile = resolve(dataDir, "humans-of-ev.sqlite");
const sessionDuration = 8 * 60 * 60 * 1000;
const brevoApiKey = process.env.BREVO_API_KEY?.trim();
const emailFrom = process.env.EMAIL_FROM?.trim();
const emailFromName = process.env.EMAIL_FROM_NAME?.trim() || "Humans of EV";
const twilioAccountSid = process.env.TWILIO_ACCOUNT_SID?.trim() || "";
const twilioAuthToken = process.env.TWILIO_AUTH_TOKEN?.trim() || "";
const twilioFromNumber = process.env.TWILIO_FROM_NUMBER?.trim() || "";

if (!sessionSecret || sessionSecret.length < 32) {
  throw new Error("Set SESSION_SECRET to a random value containing at least 32 characters.");
}
if (!Number.isInteger(port) || port < 1 || port > 65535) {
  throw new Error("PORT must be a valid TCP port.");
}

mkdirSync(dataDir, { recursive: true });
mkdirSync(uploadsDir, { recursive: true });
mkdirSync(mediaDir, { recursive: true });
const db = new Database(databaseFile);
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");
db.exec(`
  CREATE TABLE IF NOT EXISTS admins (
    id INTEGER PRIMARY KEY,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'owner' CHECK (role IN ('owner', 'editor', 'publisher', 'support')),
    recovery_email TEXT NOT NULL DEFAULT '',
    recovery_phone TEXT NOT NULL DEFAULT '',
    recovery_email_verified_at TEXT,
    recovery_phone_verified_at TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );
  CREATE TABLE IF NOT EXISTS admin_recovery_codes (
    id INTEGER PRIMARY KEY,
    admin_id INTEGER NOT NULL REFERENCES admins(id) ON DELETE CASCADE,
    channel TEXT NOT NULL CHECK (channel IN ('email', 'phone')),
    purpose TEXT NOT NULL DEFAULT 'reset' CHECK (purpose IN ('verify', 'reset')),
    destination_hash TEXT NOT NULL DEFAULT '',
    code_hash TEXT NOT NULL,
    attempts INTEGER NOT NULL DEFAULT 0,
    expires_at TEXT NOT NULL,
    used_at TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );
  CREATE TABLE IF NOT EXISTS members (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    membership_plan TEXT NOT NULL DEFAULT 'Free Member'
      CHECK (membership_plan IN ('Free Member', 'Professional', 'Executive')),
    membership_expires_at TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );
  CREATE TABLE IF NOT EXISTS membership_orders (
    id INTEGER PRIMARY KEY,
    member_id INTEGER NOT NULL REFERENCES members(id),
    razorpay_order_id TEXT NOT NULL UNIQUE,
    plan TEXT NOT NULL CHECK (plan IN ('Professional', 'Executive')),
    amount INTEGER NOT NULL,
    status TEXT NOT NULL DEFAULT 'created' CHECK (status IN ('created', 'paid')),
    razorpay_payment_id TEXT UNIQUE,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );
  CREATE TABLE IF NOT EXISTS articles (
    id INTEGER PRIMARY KEY,
    category TEXT NOT NULL,
    title TEXT NOT NULL,
    excerpt TEXT NOT NULL,
    body TEXT NOT NULL,
    author TEXT NOT NULL,
    read_time TEXT NOT NULL,
    image TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('draft', 'published')),
    access_level TEXT NOT NULL DEFAULT 'free' CHECK (access_level IN ('free', 'member')),
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );
  CREATE TABLE IF NOT EXISTS managed_content (
    id INTEGER PRIMARY KEY,
    kind TEXT NOT NULL CHECK (kind IN ('podcast', 'magazine', 'cxo', 'video')),
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    body TEXT NOT NULL DEFAULT '',
    person_name TEXT NOT NULL DEFAULT '',
    role TEXT NOT NULL DEFAULT '',
    organization TEXT NOT NULL DEFAULT '',
    duration TEXT NOT NULL DEFAULT '',
    issue_label TEXT NOT NULL DEFAULT '',
    image TEXT NOT NULL,
    media_url TEXT NOT NULL DEFAULT '',
    status TEXT NOT NULL CHECK (status IN ('draft', 'published')),
    access_level TEXT NOT NULL DEFAULT 'free' CHECK (access_level IN ('free', 'member')),
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );
  CREATE TABLE IF NOT EXISTS enquiries (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    company TEXT NOT NULL DEFAULT '',
    phone TEXT NOT NULL DEFAULT '',
    job_title TEXT NOT NULL DEFAULT '',
    website TEXT NOT NULL DEFAULT '',
    preferred_contact TEXT NOT NULL DEFAULT 'email',
    type TEXT NOT NULL,
    magazine_issue TEXT NOT NULL DEFAULT '',
    magazine_format TEXT NOT NULL DEFAULT '',
    magazine_budget TEXT NOT NULL DEFAULT '',
    message TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'read', 'resolved')),
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );
  CREATE TABLE IF NOT EXISTS newsletter_subscribers (
    id INTEGER PRIMARY KEY,
    email TEXT NOT NULL UNIQUE,
    status TEXT NOT NULL DEFAULT 'subscribed' CHECK (status IN ('subscribed', 'unsubscribed')),
    subscribed_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );
  CREATE TABLE IF NOT EXISTS sessions (
    sid TEXT PRIMARY KEY,
    sess TEXT NOT NULL,
    expires_at INTEGER NOT NULL
  );
  CREATE TABLE IF NOT EXISTS site_content (
    section TEXT PRIMARY KEY,
    content_json TEXT NOT NULL,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );
  CREATE INDEX IF NOT EXISTS enquiries_created_at_idx ON enquiries(created_at DESC);
  CREATE INDEX IF NOT EXISTS articles_status_created_at_idx ON articles(status, created_at DESC);
  CREATE INDEX IF NOT EXISTS managed_content_kind_status_idx ON managed_content(kind, status, created_at DESC);
  CREATE INDEX IF NOT EXISTS sessions_expires_at_idx ON sessions(expires_at);
`);

const adminColumns = db.prepare("PRAGMA table_info(admins)").all();
for (const [column, definition] of [
  ["role", "TEXT NOT NULL DEFAULT 'owner' CHECK (role IN ('owner', 'editor', 'publisher', 'support'))"],
  ["recovery_email", "TEXT NOT NULL DEFAULT ''"],
  ["recovery_phone", "TEXT NOT NULL DEFAULT ''"],
  ["recovery_email_verified_at", "TEXT"],
  ["recovery_phone_verified_at", "TEXT"]
]) {
  if (!adminColumns.some((item) => item.name === column)) db.exec(`ALTER TABLE admins ADD COLUMN ${column} ${definition}`);
}
const enquiryColumns = db.prepare("PRAGMA table_info(enquiries)").all();
for (const [column, definition] of [
  ["phone", "TEXT NOT NULL DEFAULT ''"],
  ["job_title", "TEXT NOT NULL DEFAULT ''"],
  ["website", "TEXT NOT NULL DEFAULT ''"],
  ["preferred_contact", "TEXT NOT NULL DEFAULT 'email'"],
  ["magazine_issue", "TEXT NOT NULL DEFAULT ''"],
  ["magazine_format", "TEXT NOT NULL DEFAULT ''"],
  ["magazine_budget", "TEXT NOT NULL DEFAULT ''"]
]) {
  if (!enquiryColumns.some((item) => item.name === column)) db.exec(`ALTER TABLE enquiries ADD COLUMN ${column} ${definition}`);
}
const recoveryCodeColumns = db.prepare("PRAGMA table_info(admin_recovery_codes)").all();
for (const [column, definition] of [["purpose", "TEXT NOT NULL DEFAULT 'reset'"], ["destination_hash", "TEXT NOT NULL DEFAULT ''"]]) {
  if (!recoveryCodeColumns.some((item) => item.name === column)) db.exec(`ALTER TABLE admin_recovery_codes ADD COLUMN ${column} ${definition}`);
}
db.exec(`
  CREATE UNIQUE INDEX IF NOT EXISTS admins_recovery_email_unique
    ON admins(recovery_email) WHERE recovery_email <> '';
  CREATE UNIQUE INDEX IF NOT EXISTS admins_recovery_phone_unique
    ON admins(recovery_phone) WHERE recovery_phone <> '';
`);

const siteContentSections = new Set(Object.keys(siteContentDefaults));
const saveSiteContent = db.prepare(`
  INSERT INTO site_content (section, content_json) VALUES (?, ?)
  ON CONFLICT(section) DO NOTHING
`);
for (const [section, content] of Object.entries(siteContentDefaults)) {
  saveSiteContent.run(section, JSON.stringify(content));
}

const savedNavigation = db.prepare("SELECT content_json FROM site_content WHERE section = 'navigation'").get();
const previousMenuLabels = ["News", "Intelligence", "People", "Ecosystem", "Media", "Events", "Magazine", "Membership", "Contact"];
const legacySiteNavigationLabels = ["Home", "News", "EV Intelligence", "Vehicles", "EV Business", "Energy", "People", "HEV Media", "Events", "B2B Solutions"];
if (savedNavigation) {
  const currentNavigation = JSON.parse(savedNavigation.content_json);
  const currentLabels = Array.isArray(currentNavigation) ? currentNavigation.map((item) => item.label).join("|") : "";
  if (currentLabels === previousMenuLabels.join("|") || currentLabels === legacySiteNavigationLabels.join("|")) {
    db.prepare("UPDATE site_content SET content_json = ?, updated_at = CURRENT_TIMESTAMP WHERE section = 'navigation'")
      .run(JSON.stringify(siteContentDefaults.navigation));
  } else if (Array.isArray(currentNavigation)) {
    const updatedNavigation = currentNavigation.map((item) =>
      item.path === "/news" && item.label === "Latest News" ? { ...item, label: "News" } : item
    );
    if (updatedNavigation.some((item, index) => item !== currentNavigation[index])) {
      db.prepare("UPDATE site_content SET content_json = ?, updated_at = CURRENT_TIMESTAMP WHERE section = 'navigation'")
        .run(JSON.stringify(updatedNavigation));
    }
  }
}

for (const [table, column] of [["articles", "access_level"], ["managed_content", "access_level"]]) {
  const columns = db.prepare(`PRAGMA table_info(${table})`).all();
  if (!columns.some((item) => item.name === column)) {
    db.exec(`ALTER TABLE ${table} ADD COLUMN access_level TEXT NOT NULL DEFAULT 'free' CHECK (access_level IN ('free', 'member'))`);
  }
}

const managedContentSchema = db.prepare("SELECT sql FROM sqlite_master WHERE type = 'table' AND name = 'managed_content'").get()?.sql || "";
if (!managedContentSchema.includes("'video'")) {
  db.transaction(() => {
    db.exec(`
      ALTER TABLE managed_content RENAME TO managed_content_legacy;
      CREATE TABLE managed_content (
        id INTEGER PRIMARY KEY,
        kind TEXT NOT NULL CHECK (kind IN ('podcast', 'magazine', 'cxo', 'video')),
        title TEXT NOT NULL,
        description TEXT NOT NULL,
        body TEXT NOT NULL DEFAULT '',
        person_name TEXT NOT NULL DEFAULT '',
        role TEXT NOT NULL DEFAULT '',
        organization TEXT NOT NULL DEFAULT '',
        duration TEXT NOT NULL DEFAULT '',
        issue_label TEXT NOT NULL DEFAULT '',
        image TEXT NOT NULL,
        media_url TEXT NOT NULL DEFAULT '',
        status TEXT NOT NULL CHECK (status IN ('draft', 'published')),
        access_level TEXT NOT NULL DEFAULT 'free' CHECK (access_level IN ('free', 'member')),
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
      INSERT INTO managed_content (
        id, kind, title, description, body, person_name, role, organization,
        duration, issue_label, image, media_url, status, access_level, created_at, updated_at
      )
      SELECT id, kind, title, description, body, person_name, role, organization,
        duration, issue_label, image, media_url, status, access_level, created_at, updated_at
      FROM managed_content_legacy;
      DROP TABLE managed_content_legacy;
      CREATE INDEX managed_content_kind_status_idx ON managed_content(kind, status, created_at DESC);
    `);
  })();
}

const managedContentColumns = db.prepare("PRAGMA table_info(managed_content)").all();
for (const [column, definition] of [
  ["slug", "TEXT NOT NULL DEFAULT ''"],
  ["category", "TEXT NOT NULL DEFAULT ''"],
  ["series", "TEXT NOT NULL DEFAULT ''"],
  ["tags", "TEXT NOT NULL DEFAULT ''"],
  ["placements", "TEXT NOT NULL DEFAULT '[]'"],
  ["related_content", "TEXT NOT NULL DEFAULT '[]'"],
  ["featured", "INTEGER NOT NULL DEFAULT 0"],
  ["publication_at", "TEXT NOT NULL DEFAULT ''"],
  ["seo_title", "TEXT NOT NULL DEFAULT ''"],
  ["meta_description", "TEXT NOT NULL DEFAULT ''"],
  ["canonical_url", "TEXT NOT NULL DEFAULT ''"]
]) {
  if (!managedContentColumns.some((item) => item.name === column)) {
    db.exec(`ALTER TABLE managed_content ADD COLUMN ${column} ${definition}`);
  }
}
const articleColumns = db.prepare("PRAGMA table_info(articles)").all();
if (!articleColumns.some((item) => item.name === "placements")) {
  db.exec("ALTER TABLE articles ADD COLUMN placements TEXT NOT NULL DEFAULT '[]'");
}

db.prepare("DELETE FROM managed_content WHERE slug IN (?, ?, ?, ?)").run(
  "demo-electric-mobility-transition",
  "demo-building-electric-future",
  "demo-electric-mobility-briefing",
  "demo-maya-kapoor"
);

class SQLiteSessionStore extends session.Store {
  get(sid, callback) {
    try {
      const record = db.prepare("SELECT sess, expires_at FROM sessions WHERE sid = ?").get(sid);
      if (!record) return callback(null, null);
      if (record.expires_at <= Date.now()) {
        db.prepare("DELETE FROM sessions WHERE sid = ?").run(sid);
        return callback(null, null);
      }
      return callback(null, JSON.parse(record.sess));
    } catch (error) {
      return callback(error);
    }
  }

  set(sid, sess, callback = () => {}) {
    try {
      const expiresAt = sess.cookie?.expires
        ? new Date(sess.cookie.expires).getTime()
        : Date.now() + sessionDuration;
      db.prepare(`
        INSERT INTO sessions (sid, sess, expires_at) VALUES (?, ?, ?)
        ON CONFLICT(sid) DO UPDATE SET sess = excluded.sess, expires_at = excluded.expires_at
      `).run(sid, JSON.stringify(sess), expiresAt);
      callback(null);
    } catch (error) {
      callback(error);
    }
  }

  touch(sid, sess, callback = () => {}) {
    this.set(sid, sess, callback);
  }

  destroy(sid, callback = () => {}) {
    try {
      db.prepare("DELETE FROM sessions WHERE sid = ?").run(sid);
      callback(null);
    } catch (error) {
      callback(error);
    }
  }
}

const adminCount = db.prepare("SELECT COUNT(*) AS count FROM admins").get().count;
if (adminCount === 0) {
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD;
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error("Set a valid ADMIN_EMAIL to create the initial admin account.");
  }
  if (!password || password.length < 12) {
    throw new Error("Set ADMIN_PASSWORD to create the initial admin account (minimum 12 characters).");
  }
  const passwordHash = await bcrypt.hash(password, 12);
  db.prepare("INSERT INTO admins (email, password_hash) VALUES (?, ?)").run(email, passwordHash);
  console.info(`Created the initial admin account for ${email}.`);
}

const app = express();
app.disable("x-powered-by");
const razorpayKeyId = process.env.RAZORPAY_KEY_ID;
const razorpayKeySecret = process.env.RAZORPAY_KEY_SECRET;
const uploadImage = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024, files: 1 },
  fileFilter: (req, file, callback) => {
    if (!["image/jpeg", "image/png", "image/webp", "image/gif"].includes(file.mimetype)) {
      const error = new Error("Upload a JPEG, PNG, WebP, or GIF image.");
      error.status = 415;
      return callback(error);
    }
    return callback(null, true);
  }
});
const managedMediaFormats = {
  ".mp4": { mimeTypes: ["video/mp4"], kinds: ["video", "podcast"] },
  ".webm": { mimeTypes: ["video/webm"], kinds: ["video", "podcast"] },
  ".ogv": { mimeTypes: ["video/ogg", "application/ogg"], kinds: ["video", "podcast"] },
  ".mp3": { mimeTypes: ["audio/mpeg"], kinds: ["podcast"] },
  ".m4a": { mimeTypes: ["audio/mp4", "audio/x-m4a"], kinds: ["podcast"] },
  ".wav": { mimeTypes: ["audio/wav", "audio/x-wav", "audio/wave"], kinds: ["podcast"] },
  ".aac": { mimeTypes: ["audio/aac", "audio/x-aac"], kinds: ["podcast"] },
  ".ogg": { mimeTypes: ["audio/ogg", "video/ogg", "application/ogg"], kinds: ["podcast", "video"] },
  ".pdf": { mimeTypes: ["application/pdf"], kinds: ["magazine"] }
};
const uploadManagedMedia = multer({
  storage: multer.diskStorage({
    destination: mediaDir,
    filename: (req, file, callback) => {
      const extension = file.originalname.slice(file.originalname.lastIndexOf(".")).toLowerCase();
      callback(null, `${randomBytes(20).toString("hex")}${extension}`);
    }
  }),
  limits: { fileSize: 500 * 1024 * 1024, files: 1 },
  fileFilter: (req, file, callback) => {
    const extension = file.originalname.includes(".")
      ? file.originalname.slice(file.originalname.lastIndexOf(".")).toLowerCase()
      : "";
    const format = managedMediaFormats[extension];
    const kind = req.body?.kind;
    if (!format || !format.kinds.includes(kind) || !format.mimeTypes.includes(file.mimetype)) {
      const error = new Error("Choose a supported file type for this content.");
      error.status = 415;
      return callback(error);
    }
    return callback(null, true);
  }
});
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "https://checkout.razorpay.com"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com", "data:"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "https://api.razorpay.com"],
      frameSrc: ["'self'", "https://api.razorpay.com", "https://checkout.razorpay.com", "https://www.youtube-nocookie.com", "https://www.youtube.com", "https://player.vimeo.com"],
      objectSrc: ["'none'"],
      baseUri: ["'self'"],
      frameAncestors: ["'none'"]
    }
  }
}));
app.use(express.json({ limit: "32kb" }));
app.use(session({
  name: "hev.admin",
  secret: sessionSecret,
  store: new SQLiteSessionStore(),
  resave: false,
  saveUninitialized: false,
  rolling: true,
  cookie: {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: sessionDuration
  }
}));

function isEmailDeliveryConfigured() {
  return Boolean(brevoApiKey && emailFrom && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailFrom));
}

async function sendEmail({ to, subject, textContent, htmlContent, replyTo }) {
  if (!isEmailDeliveryConfigured()) throw new Error("Email delivery is not configured.");
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailPattern.test(to) || (replyTo && !emailPattern.test(replyTo))) {
    throw new Error("An email address is invalid.");
  }
  let response;
  try {
    response = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        "api-key": brevoApiKey,
        "Content-Type": "application/json",
        Accept: "application/json"
      },
      body: JSON.stringify({
        sender: { email: emailFrom, name: emailFromName },
        to: [{ email: to }],
        subject,
        textContent,
        htmlContent,
        ...(replyTo ? { replyTo: { email: replyTo } } : {})
      }),
      signal: AbortSignal.timeout(10000)
    });
  } catch (error) {
    console.error("Brevo email request failed:", error.message);
    throw new Error("The email provider could not be reached.");
  }
  if (!response.ok) {
    let providerCode = "";
    try {
      const providerError = await response.json();
      providerCode = typeof providerError.code === "string" ? providerError.code : "";
    } catch {
      // Keep provider responses private; log only the status and stable error code.
    }
    console.error("Brevo rejected an email request:", response.status, providerCode || "no error code returned");
    if (response.status === 401) throw new Error("Brevo rejected the API key. Check BREVO_API_KEY.");
    if (response.status === 403) throw new Error("Brevo blocked this sender. Verify the sender address and account permissions.");
    if (response.status === 400) throw new Error("Brevo rejected the sender or recipient. Verify EMAIL_FROM is an approved sender.");
    if (response.status === 429) throw new Error("Brevo is temporarily rate limiting email delivery.");
    throw new Error(`Brevo could not deliver the message (HTTP ${response.status}).`);
  }
}

setInterval(() => {
  db.prepare("DELETE FROM sessions WHERE expires_at <= ?").run(Date.now());
  db.prepare("DELETE FROM admin_recovery_codes WHERE expires_at <= ? OR used_at IS NOT NULL").run(new Date().toISOString());
}, 30 * 60 * 1000).unref();

function requireCsrf(req, res, next) {
  const supplied = req.get("X-CSRF-Token");
  const expected = req.session.csrfToken;
  if (!supplied || !expected) return res.status(403).json({ error: "Your secure session expired. Refresh and try again." });
  const suppliedBuffer = Buffer.from(supplied);
  const expectedBuffer = Buffer.from(expected);
  if (suppliedBuffer.length !== expectedBuffer.length || !timingSafeEqual(suppliedBuffer, expectedBuffer)) {
    return res.status(403).json({ error: "Your secure session expired. Refresh and try again." });
  }
  return next();
}

function isSmsDeliveryConfigured() {
  return Boolean(twilioAccountSid && twilioAuthToken && /^\+[1-9]\d{7,14}$/.test(twilioFromNumber));
}

async function sendSms(to, message) {
  if (!isSmsDeliveryConfigured()) throw new Error("SMS delivery is not configured.");
  if (!/^\+[1-9]\d{7,14}$/.test(to)) throw new Error("A phone number must use international E.164 format.");
  const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${encodeURIComponent(twilioAccountSid)}/Messages.json`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${twilioAccountSid}:${twilioAuthToken}`).toString("base64")}`,
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body: new URLSearchParams({ To: to, From: twilioFromNumber, Body: message }),
    signal: AbortSignal.timeout(10000)
  });
  if (!response.ok) {
    console.error("Twilio rejected an SMS request:", response.status);
    throw new Error("The SMS provider could not deliver the message.");
  }
}

function hashRecoveryCode(code) {
  return createHmac("sha256", sessionSecret).update(code).digest("hex");
}

function safeEqualHex(first, second) {
  const firstBuffer = Buffer.from(first, "hex");
  const secondBuffer = Buffer.from(second, "hex");
  return firstBuffer.length === secondBuffer.length && timingSafeEqual(firstBuffer, secondBuffer);
}

async function issueAdminRecoveryCode(admin, channel, purpose) {
  const code = String(randomInt(0, 1000000)).padStart(6, "0");
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();
  const destination = channel === "email" ? admin.recoveryEmail : admin.recoveryPhone;
  db.prepare("UPDATE admin_recovery_codes SET used_at = CURRENT_TIMESTAMP WHERE admin_id = ? AND channel = ? AND used_at IS NULL")
    .run(admin.id, channel);
  db.prepare("INSERT INTO admin_recovery_codes (admin_id, channel, purpose, destination_hash, code_hash, expires_at) VALUES (?, ?, ?, ?, ?, ?)")
    .run(admin.id, channel, purpose, hashRecoveryCode(destination), hashRecoveryCode(code), expiresAt);
  if (channel === "email") {
    await sendEmail({
      to: admin.recoveryEmail,
      subject: purpose === "verify" ? "Verify your Humans of EV admin email" : "Your Humans of EV admin recovery code",
      textContent: `Your verification code is ${code}. It expires in 10 minutes. If you did not request this, you can ignore this message.`
    });
  } else {
    await sendSms(admin.recoveryPhone,
      `Humans of EV admin ${purpose === "verify" ? "verification" : "recovery"} code: ${code}. Expires in 10 minutes.`);
  }
}

function revokeAdminSessions(adminId, keepSessionId = null) {
  const removeSession = db.prepare("DELETE FROM sessions WHERE sid = ?");
  const transaction = db.transaction(() => {
    for (const sessionRecord of db.prepare("SELECT sid, sess FROM sessions").all()) {
      if (sessionRecord.sid === keepSessionId) continue;
      try {
        if (JSON.parse(sessionRecord.sess).adminId === adminId) removeSession.run(sessionRecord.sid);
      } catch {
        removeSession.run(sessionRecord.sid);
      }
    }
  });
  transaction();
}

function requireAdmin(req, res, next) {
  if (!req.session.adminId) return res.status(401).json({ error: "Sign in as an administrator to continue." });
  return next();
}

const rolePermissions = {
  owner: new Set(["dashboard.read", "site.read", "site.write", "content.read", "content.write", "content.publish", "enquiries.read", "enquiries.manage", "newsletter.read", "newsletter.manage", "team.manage"]),
  editor: new Set(["dashboard.read", "content.read", "content.write"]),
  publisher: new Set(["dashboard.read", "content.read", "content.write", "content.publish"]),
  support: new Set(["dashboard.read", "enquiries.read", "enquiries.manage", "newsletter.read", "newsletter.manage"])
};

function requirePermission(permission) {
  return (req, res, next) => {
    if (!req.session.adminId) return res.status(401).json({ error: "Sign in as an administrator to continue." });
    const admin = db.prepare("SELECT role FROM admins WHERE id = ?").get(req.session.adminId);
    if (!admin) return res.status(401).json({ error: "Administrator account not found." });
    req.adminRole = admin.role;
    if (!rolePermissions[admin.role]?.has(permission)) {
      return res.status(403).json({ error: "Your administrator role does not allow this action." });
    }
    return next();
  };
}

function canPublishContent(role) {
  return role === "owner" || role === "publisher";
}

function requireMember(req, res, next) {
  if (!req.session.memberId) return res.status(401).json({ error: "Sign in to your member account to continue." });
  return next();
}

function memberHasPaidAccess(req) {
  if (!req.session.memberId) return false;
  const member = getMember(req.session.memberId);
  return Boolean(
    member &&
    member.membershipPlan !== "Free Member" &&
    member.membershipExpiresAt &&
    new Date(member.membershipExpiresAt) > new Date()
  );
}

function getMember(memberId) {
  const member = db.prepare(`
    SELECT id, name, email, membership_plan AS membershipPlan,
      membership_expires_at AS membershipExpiresAt
    FROM members WHERE id = ?
  `).get(memberId);
  if (!member) return null;
  if (member.membershipExpiresAt && new Date(member.membershipExpiresAt) <= new Date()) {
    db.prepare("UPDATE members SET membership_plan = 'Free Member', membership_expires_at = NULL WHERE id = ?").run(memberId);
    member.membershipPlan = "Free Member";
    member.membershipExpiresAt = null;
  }
  return member;
}

function addOneMonth(value) {
  const date = new Date(value);
  const day = date.getDate();
  date.setDate(1);
  date.setMonth(date.getMonth() + 1);
  const lastDay = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  date.setDate(Math.min(day, lastDay));
  return date;
}

function isValidImageReference(value) {
  if (/^\/uploads\/[a-f0-9]{40}\.(?:jpg|png|webp|gif)$/.test(value)) return true;
  try {
    const imageUrl = new URL(value);
    return ["http:", "https:"].includes(imageUrl.protocol);
  } catch {
    return false;
  }
}

function validateArticle(input) {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    return { error: "Article details are required." };
  }
  const fields = {
    category: [input.category, 60],
    title: [input.title, 180],
    excerpt: [input.excerpt, 500],
    body: [input.body, 20000],
    author: [input.author, 100],
    read_time: [input.readTime, 40],
    image: [input.image, 2048],
    placements: [input.placements ?? "[]", 4000],
    status: [input.status, 12],
    access_level: [input.accessLevel ?? "free", 12]
  };
  const values = {};
  for (const [key, [value, maxLength]] of Object.entries(fields)) {
    if (typeof value !== "string" || !value.trim() || value.trim().length > maxLength) {
      return { error: `${key} is required and must be no longer than ${maxLength} characters.` };
    }
    values[key] = value.trim();
  }
  if (!["draft", "published"].includes(values.status)) return { error: "Status must be draft or published." };
  if (!["free", "member"].includes(values.access_level)) return { error: "Access level must be free or member." };
  try {
    const placements = JSON.parse(values.placements);
    if (!Array.isArray(placements) || placements.length > 30 || placements.some((value) => typeof value !== "string" || value.length > 180)) {
      return { error: "placements must be a list of short text values." };
    }
  } catch {
    return { error: "placements must contain valid JSON." };
  }
  if (!isValidImageReference(values.image)) {
    return { error: "Image must be a valid HTTP or HTTPS URL or an uploaded image." };
  }
  return { values };
}

function parseId(value) {
  const id = Number(value);
  return Number.isSafeInteger(id) && id > 0 ? id : null;
}

function isText(value, maxLength) {
  return typeof value === "string" && value.trim().length > 0 && value.trim().length <= maxLength;
}

function isValidPaidPlanPrice(value) {
  if (typeof value !== "string" || !value.startsWith("\u20b9")) return false;
  const amount = value.slice(1);
  if (!/^[1-9]\d{0,2}(?:,\d{3})*$/.test(amount) && !/^[1-9]\d{0,6}$/.test(amount)) return false;
  const numericAmount = Number(amount.replaceAll(",", ""));
  return Number.isSafeInteger(numericAmount) && numericAmount <= 9999999;
}

function validateSiteContent(section, input) {
  if (!siteContentSections.has(section)) return { error: "Site content section not found." };
  if (!Array.isArray(input) || input.length > 100) {
    return { error: "Site content must be a list containing no more than 100 entries." };
  }
  if (JSON.stringify(input).length > 30000) return { error: "Site content is too large to save." };

  if (section === "navigation") {
    const valid = input.every((entry) =>
      entry && typeof entry === "object" && !Array.isArray(entry) &&
      isText(entry.label, 60) && isText(entry.path, 180) &&
      entry.path.startsWith("/") && !entry.path.startsWith("//") &&
      (entry.columns === undefined || (
        Array.isArray(entry.columns) && entry.columns.length <= 8 &&
        entry.columns.every((column) =>
          column && typeof column === "object" && !Array.isArray(column) &&
          isText(column.title, 60) && Array.isArray(column.items) && column.items.length <= 20 &&
          column.items.every((link) =>
            Array.isArray(link) && link.length === 2 &&
            isText(link[0], 80) && isText(link[1], 180) &&
            link[1].startsWith("/") && !link[1].startsWith("//")
          )
        )
      ))
    );
    return valid ? { content: input } : { error: "Navigation entries need labels, internal paths, and valid menu links." };
  }

  if (section === "plans") {
    const allowedPlans = ["Free Member", "Professional", "Executive", "Enterprise"];
    const valid = input.length === allowedPlans.length && input.every((plan, index) =>
      plan && typeof plan === "object" && !Array.isArray(plan) &&
      plan.name === allowedPlans[index] &&
      isText(plan.name, 80) && isText(plan.price, 40) &&
      ((plan.name === "Free Member" && plan.price === "\u20b90") ||
        (["Professional", "Executive"].includes(plan.name) && isValidPaidPlanPrice(plan.price)) ||
        (plan.name === "Enterprise" && plan.price === "Custom")) &&
      isText(plan.description, 500) && Array.isArray(plan.features) &&
      plan.features.length <= 30 && plan.features.every((feature) => isText(feature, 180)) &&
      (plan.popular === undefined || typeof plan.popular === "boolean")
    );
    return valid ? { content: input } : { error: "Each membership plan needs a name, price, description, and list of features." };
  }

  const tupleSizes = {
    homeStats: 3,
    directory: 4,
    events: 4,
    reports: 3,
    dashboardData: 3,
    investorDeals: 3,
    peopleVoices: 3,
    communityFeatures: 2,
    homeCapabilities: 4
  };
  if (section === "learningCourses") {
    const valid = input.every((title) => isText(title, 120));
    return valid ? { content: input } : { error: "Course titles must be non-empty and no longer than 120 characters." };
  }
  if (section === "events") {
    const valid = input.every((row) =>
      Array.isArray(row) && (row.length === 4 || row.length === 5) &&
      row.slice(0, 4).every((value) => isText(value, 300)) &&
      (row.length === 4 || row[4] === "" || (
        isText(row[4], 2048) &&
        (() => {
          try {
            const url = new URL(row[4]);
            return url.protocol === "https:";
          } catch {
            return false;
          }
        })()
      ))
    );
    return valid ? { content: input } : { error: "Each event needs its name, location, date, type, and an optional HTTPS source link." };
  }
  const tupleSize = tupleSizes[section];
  const valid = tupleSize && input.every((row) =>
    Array.isArray(row) && row.length === tupleSize && row.every((value) => isText(value, 300))
  );
  if (section === "homeCapabilities" && valid) {
    const validEntries = input.every((row) =>
      row[2].startsWith("/") && !row[2].startsWith("//") &&
      ["FileText", "Users", "Building2", "Sparkles"].includes(row[3])
    );
    if (!validEntries) return { error: "Capability links or display icons are not supported." };
  }
  return valid ? { content: input } : { error: "Each entry must have the expected fields filled in with text." };
}

const managedContentKinds = new Set(["podcast", "magazine", "cxo", "video"]);

function isValidManagedMediaReference(kind, value) {
  if (!value) return true;
  if (value.startsWith("/media/")) {
    const filename = value.slice("/media/".length);
    if (!/^[a-f0-9]{40}\.[a-z0-9]+$/.test(filename)) return false;
    const extension = filename.slice(filename.lastIndexOf(".")).toLowerCase();
    return managedMediaFormats[extension]?.kinds.includes(kind) ?? false;
  }
  try {
    const url = new URL(value);
    return ["http:", "https:"].includes(url.protocol);
  } catch {
    return false;
  }
}

function validateManagedContent(kind, input) {
  if (!managedContentKinds.has(kind)) return { error: "Content type is not supported." };
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    return { error: "Content details are required." };
  }
  const fields = {
    title: [input.title, 180],
    description: [input.description, 500],
    body: [input.body ?? "", 20000],
    person_name: [input.personName ?? "", 120],
    role: [input.role ?? "", 120],
    organization: [input.organization ?? "", 160],
    duration: [input.duration ?? "", 40],
    issue_label: [input.issueLabel ?? "", 80],
    image: [input.image, 2048],
    media_url: [input.mediaUrl ?? "", 2048],
    slug: [input.slug ?? "", 180],
    category: [input.category ?? "", 120],
    series: [input.series ?? "", 120],
    tags: [input.tags ?? "", 1000],
    placements: [input.placements ?? "[]", 4000],
    related_content: [input.relatedContent ?? "[]", 4000],
    publication_at: [input.publicationAt ?? "", 40],
    seo_title: [input.seoTitle ?? "", 180],
    meta_description: [input.metaDescription ?? "", 320],
    canonical_url: [input.canonicalUrl ?? "", 2048],
    featured: [String(input.featured ?? false), 5],
    status: [input.status, 12],
    access_level: [input.accessLevel ?? "free", 12]
  };
  const values = {};
  for (const [key, [value, maxLength]] of Object.entries(fields)) {
    if (typeof value !== "string" || value.trim().length > maxLength) {
      return { error: `${key} must be no longer than ${maxLength} characters.` };
    }
    if (["title", "description", "image", "status"].includes(key) && !value.trim()) {
      return { error: `${key} is required.` };
    }
    values[key] = value.trim();
  }
  if (kind === "cxo" && (!values.person_name || !values.role || !values.organization)) {
    return { error: "CXO name, role, and organisation are required." };
  }
  if (kind === "podcast" && !values.duration) return { error: "Podcast duration is required." };
  if (kind === "magazine" && !values.issue_label) return { error: "Magazine issue is required." };
  if (kind === "video" && !values.media_url) return { error: "A video URL is required." };
  if (!["draft", "published"].includes(values.status)) return { error: "Status must be draft or published." };
  if (!["free", "member"].includes(values.access_level)) return { error: "Access level must be free or member." };
  values.featured = input.featured === true || input.featured === "true" || input.featured === 1 ? 1 : 0;
  if (values.image && !isValidImageReference(values.image)) {
    return { error: "Image must be a valid HTTP or HTTPS URL or an uploaded image." };
  }
  for (const key of ["placements", "related_content"]) {
    try {
      const parsed = JSON.parse(values[key]);
      if (!Array.isArray(parsed) || parsed.length > 30 || parsed.some((value) => typeof value !== "string" || value.length > 180)) {
        return { error: `${key} must be a list of short text values.` };
      }
    } catch {
      return { error: `${key} must contain valid JSON.` };
    }
  }
  if (values.canonical_url && !/^https?:\/\/\S+$/i.test(values.canonical_url)) {
    return { error: "Canonical URL must be an HTTP or HTTPS URL." };
  }
  if (!isValidManagedMediaReference(kind, values.media_url)) {
    return { error: "Media URL must be a valid HTTP or HTTPS URL or a supported uploaded file." };
  }
  return { values };
}

const enquiryTypes = new Set(contactEnquiryTypes);

app.get("/api/auth/csrf", (req, res, next) => {
  if (!req.session.csrfToken) req.session.csrfToken = randomBytes(32).toString("hex");
  req.session.save((error) => {
    if (error) return next(error);
    return res.json({ csrfToken: req.session.csrfToken });
  });
});

app.get("/api/status", (req, res) => {
  return res.json({ localDemoMode: false });
});

app.post("/api/auth/login", rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  handler: (req, res) => res.status(429).json({ error: "Too many sign-in attempts. Please try again later." })
}), requireCsrf, async (req, res, next) => {
  const email = typeof req.body.email === "string" ? req.body.email.trim().toLowerCase() : "";
  const password = typeof req.body.password === "string" ? req.body.password : "";
  const admin = db.prepare("SELECT id, email, password_hash, role FROM admins WHERE email = ?").get(email);
  if (!admin || !(await bcrypt.compare(password, admin.password_hash))) {
    return res.status(401).json({ error: "Email or password is incorrect." });
  }
  req.session.regenerate((error) => {
    if (error) return next(error);
    req.session.adminId = admin.id;
    req.session.adminEmail = admin.email;
    req.session.csrfToken = randomBytes(32).toString("hex");
    req.session.save((saveError) => {
      if (saveError) return next(saveError);
      return res.json({ user: { id: admin.id, email: admin.email, role: admin.role } });
    });
  });
});

app.post("/api/auth/signup", rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 5,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  handler: (req, res) => res.status(429).json({ error: "Too many admin registration attempts. Please try again later." })
}), requireCsrf, async (req, res, next) => {
  const email = typeof req.body?.email === "string" ? req.body.email.trim().toLowerCase() : "";
  const password = typeof req.body?.password === "string" ? req.body.password : "";
  const signupCode = typeof req.body?.signupCode === "string" ? req.body.signupCode : "";
  if (!adminSignupCode || adminSignupCode.length < 24) {
    return res.status(503).json({ error: "Admin registration is disabled. Ask the site owner to configure an invitation code." });
  }
  const suppliedCode = Buffer.from(signupCode);
  const expectedCode = Buffer.from(adminSignupCode);
  const validCode = suppliedCode.length === expectedCode.length && timingSafeEqual(suppliedCode, expectedCode);
  if (!validCode) return res.status(403).json({ error: "The administrator invitation code is invalid." });
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254 || password.length < 12 || password.length > 200) {
    return res.status(400).json({ error: "Enter a valid email and a password between 12 and 200 characters." });
  }
  if (db.prepare("SELECT 1 FROM admins WHERE email = ?").get(email)) {
    return res.status(409).json({ error: "An administrator account already exists for this email." });
  }
  const passwordHash = await bcrypt.hash(password, 12);
  let admin;
  try {
    const result = db.prepare("INSERT INTO admins (email, password_hash, role) VALUES (?, ?, 'editor')").run(email, passwordHash);
    admin = { id: Number(result.lastInsertRowid), email, role: "editor" };
  } catch (error) {
    if (error.code === "SQLITE_CONSTRAINT_UNIQUE") {
      return res.status(409).json({ error: "An administrator account already exists for this email." });
    }
    return next(error);
  }
  req.session.regenerate((error) => {
    if (error) return next(error);
    req.session.adminId = admin.id;
    req.session.adminEmail = admin.email;
    req.session.csrfToken = randomBytes(32).toString("hex");
    req.session.save((saveError) => {
      if (saveError) return next(saveError);
      return res.status(201).json({ user: { id: admin.id, email: admin.email, role: admin.role } });
    });
  });
});

app.get("/api/admin/session", requireAdmin, (req, res) => {
  const admin = db.prepare("SELECT id, email, role FROM admins WHERE id = ?").get(req.session.adminId);
  if (!admin) return res.status(401).json({ error: "Administrator account not found." });
  res.json({ user: admin });
});

app.get("/api/admin/team", requirePermission("team.manage"), (req, res) => {
  const admins = db.prepare(`
    SELECT id, email, role, created_at AS createdAt FROM admins ORDER BY created_at, id
  `).all();
  return res.json({ admins });
});

app.post("/api/admin/team", requirePermission("team.manage"), requireCsrf, async (req, res, next) => {
  const email = typeof req.body?.email === "string" ? req.body.email.trim().toLowerCase() : "";
  const password = typeof req.body?.password === "string" ? req.body.password : "";
  const role = typeof req.body?.role === "string" ? req.body.role : "";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) {
    return res.status(400).json({ error: "Enter a valid team member email address." });
  }
  if (password.length < 12 || password.length > 200) {
    return res.status(400).json({ error: "Set a temporary password between 12 and 200 characters." });
  }
  if (!Object.hasOwn(rolePermissions, role)) return res.status(400).json({ error: "Choose a valid team role." });
  if (db.prepare("SELECT 1 FROM admins WHERE email = ?").get(email)) {
    return res.status(409).json({ error: "An administrator account already exists for this email." });
  }
  try {
    const passwordHash = await bcrypt.hash(password, 12);
    const result = db.prepare("INSERT INTO admins (email, password_hash, role) VALUES (?, ?, ?)").run(email, passwordHash, role);
    return res.status(201).json({ admin: { id: Number(result.lastInsertRowid), email, role } });
  } catch (error) {
    if (error.code === "SQLITE_CONSTRAINT_UNIQUE") return res.status(409).json({ error: "An administrator account already exists for this email." });
    return next(error);
  }
});

app.patch("/api/admin/team/:id/role", requirePermission("team.manage"), requireCsrf, (req, res) => {
  const id = parseId(req.params.id);
  const role = typeof req.body?.role === "string" ? req.body.role : "";
  if (id === null) return res.status(400).json({ error: "Admin ID must be a positive integer." });
  if (!Object.hasOwn(rolePermissions, role)) return res.status(400).json({ error: "Choose a valid team role." });
  const target = db.prepare("SELECT id, email, role FROM admins WHERE id = ?").get(id);
  if (!target) return res.status(404).json({ error: "Administrator account not found." });
  if (target.id === req.session.adminId && role !== target.role) {
    return res.status(400).json({ error: "Ask another owner to change your role so you do not lose access." });
  }
  if (target.role === "owner" && role !== "owner") {
    const ownerCount = db.prepare("SELECT COUNT(*) AS count FROM admins WHERE role = 'owner'").get().count;
    if (ownerCount <= 1) return res.status(409).json({ error: "At least one owner must remain in the workspace." });
  }
  db.prepare("UPDATE admins SET role = ? WHERE id = ?").run(role, id);
  return res.json({ admin: { ...target, role } });
});

app.get("/api/admin/profile", requireAdmin, (req, res) => {
  const profile = db.prepare(`
    SELECT email, recovery_email AS recoveryEmail, recovery_phone AS recoveryPhone,
      recovery_email_verified_at AS recoveryEmailVerifiedAt,
      recovery_phone_verified_at AS recoveryPhoneVerifiedAt
    FROM admins WHERE id = ?
  `).get(req.session.adminId);
  if (!profile) return res.status(401).json({ error: "Administrator account not found." });
  return res.json({ profile });
});

app.put("/api/admin/profile", requireAdmin, requireCsrf, async (req, res) => {
  const recoveryEmail = typeof req.body?.recoveryEmail === "string" ? req.body.recoveryEmail.trim().toLowerCase() : "";
  const recoveryPhone = typeof req.body?.recoveryPhone === "string" ? req.body.recoveryPhone.trim() : "";
  const currentPassword = typeof req.body?.currentPassword === "string" ? req.body.currentPassword : "";
  if (recoveryEmail && (recoveryEmail.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recoveryEmail))) {
    return res.status(400).json({ error: "Enter a valid recovery email address." });
  }
  if (recoveryPhone && !/^\+[1-9]\d{7,14}$/.test(recoveryPhone)) {
    return res.status(400).json({ error: "Enter a phone number in international format, such as +14155552671." });
  }
  const admin = db.prepare("SELECT id, password_hash AS passwordHash FROM admins WHERE id = ?").get(req.session.adminId);
  if (!admin || !(await bcrypt.compare(currentPassword, admin.passwordHash))) {
    return res.status(401).json({ error: "Enter your current password to update recovery details." });
  }
  const duplicateEmail = recoveryEmail && db.prepare("SELECT id FROM admins WHERE recovery_email = ? AND id <> ? LIMIT 1").get(recoveryEmail, admin.id);
  const duplicatePhone = recoveryPhone && db.prepare("SELECT id FROM admins WHERE recovery_phone = ? AND id <> ? LIMIT 1").get(recoveryPhone, admin.id);
  if (duplicateEmail || duplicatePhone) return res.status(409).json({ error: "Each recovery email and phone must be assigned to only one admin account." });
  db.prepare(`
    UPDATE admin_recovery_codes SET used_at = CURRENT_TIMESTAMP
    WHERE admin_id = ? AND used_at IS NULL
  `).run(admin.id);
  db.prepare(`
    UPDATE admins SET
      recovery_email = ?,
      recovery_phone = ?,
      recovery_email_verified_at = CASE WHEN recovery_email = ? THEN recovery_email_verified_at ELSE NULL END,
      recovery_phone_verified_at = CASE WHEN recovery_phone = ? THEN recovery_phone_verified_at ELSE NULL END
    WHERE id = ?
  `).run(recoveryEmail, recoveryPhone, recoveryEmail, recoveryPhone, admin.id);
  return res.json({ profile: db.prepare(`
    SELECT email, recovery_email AS recoveryEmail, recovery_phone AS recoveryPhone,
      recovery_email_verified_at AS recoveryEmailVerifiedAt,
      recovery_phone_verified_at AS recoveryPhoneVerifiedAt
    FROM admins WHERE id = ?
  `).get(admin.id) });
});

const adminRecoveryLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  handler: (req, res) => res.status(429).json({ error: "Too many recovery attempts. Please try again later." })
});

app.post("/api/admin/profile/recovery/:channel/request-verification", requireAdmin, requireCsrf, adminRecoveryLimiter, async (req, res) => {
  const channel = req.params.channel;
  if (!['email', 'phone'].includes(channel)) return res.status(404).json({ error: "Recovery channel not found." });
  const profile = db.prepare(`
    SELECT id, recovery_email AS recoveryEmail, recovery_phone AS recoveryPhone,
      recovery_email_verified_at AS recoveryEmailVerifiedAt,
      recovery_phone_verified_at AS recoveryPhoneVerifiedAt
    FROM admins WHERE id = ?
  `).get(req.session.adminId);
  const destination = channel === "email" ? profile?.recoveryEmail : profile?.recoveryPhone;
  if (!destination) return res.status(400).json({ error: `Add a recovery ${channel} to your profile first.` });
  if ((channel === "email" && profile.recoveryEmailVerifiedAt) || (channel === "phone" && profile.recoveryPhoneVerifiedAt)) {
    return res.status(409).json({ error: `Your recovery ${channel} is already verified.` });
  }
  if (channel === "email" && !isEmailDeliveryConfigured()) return res.status(503).json({ error: "Email delivery is not configured." });
  if (channel === "phone" && !isSmsDeliveryConfigured()) return res.status(503).json({ error: "SMS delivery is not configured." });
  try {
    await issueAdminRecoveryCode(profile, channel, "verify");
    return res.json({ sent: true, message: `A verification code was sent to your recovery ${channel}.` });
  } catch (error) {
    console.error(`Admin ${channel} verification delivery failed:`, error.message);
    return res.status(502).json({ error: `Could not send a verification code to your recovery ${channel}.` });
  }
});

app.post("/api/admin/profile/recovery/:channel/verify", requireAdmin, requireCsrf, adminRecoveryLimiter, (req, res) => {
  const channel = req.params.channel;
  const code = typeof req.body?.code === "string" ? req.body.code.trim() : "";
  if (!['email', 'phone'].includes(channel)) return res.status(404).json({ error: "Recovery channel not found." });
  if (!/^\d{6}$/.test(code)) return res.status(400).json({ error: "Enter the 6-digit verification code." });
  const record = db.prepare(`
    SELECT id, code_hash AS codeHash, destination_hash AS destinationHash, attempts, expires_at AS expiresAt
    FROM admin_recovery_codes
    WHERE admin_id = ? AND channel = ? AND purpose = 'verify' AND used_at IS NULL
    ORDER BY id DESC LIMIT 1
  `).get(req.session.adminId, channel);
  if (!record || record.attempts >= 5 || Date.parse(record.expiresAt) <= Date.now()) {
    return res.status(400).json({ error: "That code is invalid or expired. Request a new one." });
  }
  const currentDestination = db.prepare(`SELECT ${channel === "email" ? "recovery_email" : "recovery_phone"} AS destination FROM admins WHERE id = ?`).get(req.session.adminId)?.destination || "";
  if (!safeEqualHex(hashRecoveryCode(code), record.codeHash) || !safeEqualHex(hashRecoveryCode(currentDestination), record.destinationHash)) {
    db.prepare("UPDATE admin_recovery_codes SET attempts = attempts + 1 WHERE id = ?").run(record.id);
    return res.status(400).json({ error: "That code is invalid or expired. Request a new one." });
  }
  const verifiedColumn = channel === "email" ? "recovery_email_verified_at" : "recovery_phone_verified_at";
  db.transaction(() => {
    db.prepare("UPDATE admin_recovery_codes SET used_at = CURRENT_TIMESTAMP WHERE id = ?").run(record.id);
    db.prepare(`UPDATE admins SET ${verifiedColumn} = CURRENT_TIMESTAMP WHERE id = ?`).run(req.session.adminId);
  })();
  return res.json({ verified: true, channel });
});

app.post("/api/admin/profile/password", requireAdmin, requireCsrf, async (req, res) => {
  const currentPassword = typeof req.body?.currentPassword === "string" ? req.body.currentPassword : "";
  const newPassword = typeof req.body?.newPassword === "string" ? req.body.newPassword : "";
  if (newPassword.length < 12 || newPassword.length > 200) {
    return res.status(400).json({ error: "Your new password must be between 12 and 200 characters." });
  }
  const admin = db.prepare("SELECT password_hash AS passwordHash FROM admins WHERE id = ?").get(req.session.adminId);
  if (!admin || !(await bcrypt.compare(currentPassword, admin.passwordHash))) {
    return res.status(401).json({ error: "Your current password is incorrect." });
  }
  db.prepare("UPDATE admins SET password_hash = ? WHERE id = ?").run(await bcrypt.hash(newPassword, 12), req.session.adminId);
  revokeAdminSessions(req.session.adminId, req.sessionID);
  return res.json({ changed: true });
});

app.post("/api/admin/recovery/request", adminRecoveryLimiter, requireCsrf, async (req, res) => {
  const contact = typeof req.body?.contact === "string" ? req.body.contact.trim() : "";
  const channel = req.body?.channel;
  const neutralResponse = { sent: true, message: "If the account has a verified recovery method, a code will arrive shortly." };
  if (!["email", "phone"].includes(channel)) return res.json(neutralResponse);
  const normalizedContact = channel === "email" ? contact.toLowerCase() : contact;
  const validContact = channel === "email"
    ? /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedContact)
    : /^\+[1-9]\d{7,14}$/.test(normalizedContact);
  if (!validContact) return res.json(neutralResponse);
  const admins = db.prepare(channel === "email" ? `
    SELECT id, email, recovery_email AS recoveryEmail, recovery_phone AS recoveryPhone
    FROM admins WHERE recovery_email = ? AND recovery_email_verified_at IS NOT NULL LIMIT 2
  ` : `
    SELECT id, email, recovery_email AS recoveryEmail, recovery_phone AS recoveryPhone
    FROM admins WHERE recovery_phone = ? AND recovery_phone_verified_at IS NOT NULL LIMIT 2
  `).all(normalizedContact);
  const admin = admins.length === 1 ? admins[0] : null;
  if (!admin) return res.json(neutralResponse);
  if ((channel === "email" && !isEmailDeliveryConfigured()) || (channel === "phone" && !isSmsDeliveryConfigured())) {
    return res.json(neutralResponse);
  }
  try {
    await issueAdminRecoveryCode(admin, channel, "reset");
  } catch (error) {
    console.error(`Admin ${channel} recovery delivery failed:`, error.message);
  }
  return res.json(neutralResponse);
});

app.post("/api/admin/recovery/reset", adminRecoveryLimiter, requireCsrf, async (req, res) => {
  const contact = typeof req.body?.contact === "string" ? req.body.contact.trim() : "";
  const channel = req.body?.channel;
  const code = typeof req.body?.code === "string" ? req.body.code.trim() : "";
  const newPassword = typeof req.body?.newPassword === "string" ? req.body.newPassword : "";
  if (!["email", "phone"].includes(channel) || !/^\d{6}$/.test(code) || newPassword.length < 12 || newPassword.length > 200) {
    return res.status(400).json({ error: "Enter a valid recovery code and password of at least 12 characters." });
  }
  const normalizedContact = channel === "email" ? contact.toLowerCase() : contact;
  const admins = channel === "email"
    ? db.prepare("SELECT id, email FROM admins WHERE recovery_email = ? AND recovery_email_verified_at IS NOT NULL LIMIT 2").all(normalizedContact)
    : db.prepare("SELECT id, email FROM admins WHERE recovery_phone = ? AND recovery_phone_verified_at IS NOT NULL LIMIT 2").all(normalizedContact);
  const admin = admins.length === 1 ? admins[0] : null;
  const record = admin && db.prepare(`
    SELECT id, code_hash AS codeHash, destination_hash AS destinationHash, attempts, expires_at AS expiresAt
    FROM admin_recovery_codes
    WHERE admin_id = ? AND channel = ? AND purpose = 'reset' AND used_at IS NULL
    ORDER BY id DESC LIMIT 1
  `).get(admin.id, channel);
  const adminRecord = admin && db.prepare(`SELECT ${channel === "email" ? "recovery_email" : "recovery_phone"} AS destination FROM admins WHERE id = ?`).get(admin.id);
  if (!record || record.attempts >= 5 || Date.parse(record.expiresAt) <= Date.now() ||
      !safeEqualHex(hashRecoveryCode(code), record.codeHash) ||
      !adminRecord?.destination || !safeEqualHex(hashRecoveryCode(adminRecord.destination), record.destinationHash)) {
    if (record && record.attempts < 5) db.prepare("UPDATE admin_recovery_codes SET attempts = attempts + 1 WHERE id = ?").run(record.id);
    return res.status(400).json({ error: "The recovery code is invalid or expired. Request a new one." });
  }
  const passwordHash = await bcrypt.hash(newPassword, 12);
  db.transaction(() => {
    db.prepare("UPDATE admin_recovery_codes SET used_at = CURRENT_TIMESTAMP WHERE admin_id = ? AND used_at IS NULL").run(admin.id);
    db.prepare("UPDATE admins SET password_hash = ? WHERE id = ?").run(passwordHash, admin.id);
  })();
  revokeAdminSessions(admin.id);
  return res.json({ reset: true, email: admin.email, message: "Password updated. Sign in with your new password." });
});

app.post("/api/auth/logout", requireCsrf, (req, res, next) => {
  if (!req.session.adminId && !req.session.memberId) {
    return res.status(401).json({ error: "You are not signed in." });
  }
  req.session.destroy((error) => {
    if (error) return next(error);
    res.clearCookie("hev.admin", { httpOnly: true, sameSite: "strict", secure: process.env.NODE_ENV === "production" });
    return res.status(204).end();
  });
});

const memberAuthLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  handler: (req, res) => res.status(429).json({ error: "Too many account attempts. Please try again later." })
});
const memberSignupLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 5,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  handler: (req, res) => res.status(429).json({ error: "Too many new accounts from this connection. Please try again later." })
});

app.post("/api/member/signup", memberSignupLimiter, requireCsrf, async (req, res, next) => {
  const { name, email, password } = req.body || {};
  if (
    typeof name !== "string" || name.trim().length < 2 || name.trim().length > 120 ||
    typeof email !== "string" || email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) ||
    typeof password !== "string" || password.length < 12 || password.length > 200
  ) {
    return res.status(400).json({ error: "Enter your name, a valid email, and a password of at least 12 characters." });
  }
  const normalizedEmail = email.trim().toLowerCase();
  if (db.prepare("SELECT 1 FROM members WHERE email = ?").get(normalizedEmail)) {
    return res.status(409).json({ error: "An account with this email already exists. Sign in instead." });
  }
  const passwordHash = await bcrypt.hash(password, 12);
  let result;
  try {
    result = db.prepare("INSERT INTO members (name, email, password_hash) VALUES (?, ?, ?)").run(name.trim(), normalizedEmail, passwordHash);
  } catch (error) {
    if (error.code === "SQLITE_CONSTRAINT_UNIQUE") {
      return res.status(409).json({ error: "An account with this email already exists. Sign in instead." });
    }
    return next(error);
  }
  const member = getMember(Number(result.lastInsertRowid));
  req.session.regenerate((error) => {
    if (error) return next(error);
    req.session.memberId = member.id;
    req.session.memberEmail = member.email;
    req.session.csrfToken = randomBytes(32).toString("hex");
    req.session.save((saveError) => {
      if (saveError) return next(saveError);
      return res.status(201).json({ user: member, csrfToken: req.session.csrfToken });
    });
  });
});

app.post("/api/member/login", memberAuthLimiter, requireCsrf, async (req, res, next) => {
  const email = typeof req.body?.email === "string" ? req.body.email.trim().toLowerCase() : "";
  const password = typeof req.body?.password === "string" ? req.body.password : "";
  const member = db.prepare("SELECT id, password_hash FROM members WHERE email = ?").get(email);
  if (!member || !(await bcrypt.compare(password, member.password_hash))) {
    return res.status(401).json({ error: "Email or password is incorrect." });
  }
  const user = getMember(member.id);
  req.session.regenerate((error) => {
    if (error) return next(error);
    req.session.memberId = user.id;
    req.session.memberEmail = user.email;
    req.session.csrfToken = randomBytes(32).toString("hex");
    req.session.save((saveError) => {
      if (saveError) return next(saveError);
      return res.json({ user, csrfToken: req.session.csrfToken });
    });
  });
});

app.get("/api/member/session", requireMember, (req, res) => {
  const user = getMember(req.session.memberId);
  if (!user) {
    req.session.destroy(() => {});
    return res.status(401).json({ error: "Member account not found. Please sign in again." });
  }
  return res.json({ user });
});

app.get("/api/member/payment-config", (req, res) => {
  return res.json({
    razorpayEnabled: Boolean(razorpayKeyId && razorpayKeySecret)
  });
});

app.post("/api/member/checkout", requireMember, requireCsrf, async (req, res) => {
  const plan = req.body?.plan;
  if (!["Professional", "Executive"].includes(plan)) {
    return res.status(400).json({ error: "Choose a supported paid membership plan." });
  }
  const planSettings = JSON.parse(db.prepare("SELECT content_json FROM site_content WHERE section = 'plans'").get().content_json);
  const configuredPlan = planSettings.find((item) => item.name === plan);
  if (!configuredPlan) return res.status(503).json({ error: "This membership plan is currently unavailable. Please contact support." });
  const member = getMember(req.session.memberId);
  if (!member) return res.status(401).json({ error: "Member account not found. Please sign in again." });
  const amount = Number(configuredPlan.price.slice(1).replaceAll(",", "")) * 100;
  if (!razorpayKeyId || !razorpayKeySecret) {
    return res.status(503).json({ error: "Online payments are not configured yet. Contact us for membership assistance." });
  }
  const receipt = `hev_${member.id}_${randomBytes(12).toString("hex")}`;
  let providerResponse;
  let providerResult;
  try {
    providerResponse = await fetch("https://api.razorpay.com/v1/orders", {
      method: "POST",
      headers: {
        Authorization: `Basic ${Buffer.from(`${razorpayKeyId}:${razorpayKeySecret}`).toString("base64")}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        amount,
        currency: "INR",
        receipt,
        notes: { memberId: String(member.id), plan }
      }),
      signal: AbortSignal.timeout(15000)
    });
    providerResult = await providerResponse.json();
  } catch (error) {
    console.error("Razorpay order creation request failed:", error);
    return res.status(502).json({ error: "Could not reach the payment service. Please try again." });
  }
  if (!providerResponse.ok || typeof providerResult.id !== "string") {
    console.error("Razorpay order creation was rejected:", providerResult.error?.code || providerResponse.status);
    return res.status(502).json({ error: "The payment service could not create an order. Please try again." });
  }
  db.prepare(`
    INSERT INTO membership_orders (member_id, razorpay_order_id, plan, amount)
    VALUES (?, ?, ?, ?)
  `).run(member.id, providerResult.id, plan, amount);
  return res.status(201).json({
    keyId: razorpayKeyId,
    orderId: providerResult.id,
    amount,
    currency: "INR",
    plan,
    name: member.name,
    email: member.email
  });
});

app.post("/api/member/checkout/verify", requireMember, requireCsrf, async (req, res) => {
  const { razorpayOrderId, razorpayPaymentId, razorpaySignature } = req.body || {};
  if (
    typeof razorpayOrderId !== "string" || razorpayOrderId.length > 80 ||
    typeof razorpayPaymentId !== "string" || razorpayPaymentId.length > 80 ||
    typeof razorpaySignature !== "string" || razorpaySignature.length > 80
  ) {
    return res.status(400).json({ error: "Payment verification details are invalid." });
  }
  const order = db.prepare(`
    SELECT id, member_id AS memberId, plan, amount, status, razorpay_payment_id AS paymentId
    FROM membership_orders WHERE razorpay_order_id = ? AND member_id = ?
  `).get(razorpayOrderId, req.session.memberId);
  if (!order) return res.status(404).json({ error: "Membership order not found." });
  if (order.status === "paid" && order.paymentId === razorpayPaymentId) {
    return res.json({ user: getMember(order.memberId) });
  }
  if (order.status === "paid") {
    return res.status(409).json({ error: "This membership order has already been paid." });
  }
  if (!/^[a-f0-9]{64}$/i.test(razorpaySignature)) {
    return res.status(400).json({ error: "Payment verification details are invalid." });
  }
  if (!razorpayKeyId || !razorpayKeySecret) {
    return res.status(503).json({ error: "Payment verification is not configured. Contact support before retrying." });
  }
  const expectedSignature = createHmac("sha256", razorpayKeySecret)
    .update(`${razorpayOrderId}|${razorpayPaymentId}`)
    .digest();
  const suppliedSignature = Buffer.from(razorpaySignature, "hex");
  if (suppliedSignature.length !== expectedSignature.length || !timingSafeEqual(suppliedSignature, expectedSignature)) {
    return res.status(400).json({ error: "Payment signature could not be verified." });
  }
  let paymentResponse;
  let payment;
  try {
    paymentResponse = await fetch(`https://api.razorpay.com/v1/payments/${encodeURIComponent(razorpayPaymentId)}`, {
      headers: {
        Authorization: `Basic ${Buffer.from(`${razorpayKeyId}:${razorpayKeySecret}`).toString("base64")}`
      },
      signal: AbortSignal.timeout(15000)
    });
    payment = await paymentResponse.json();
  } catch (error) {
    console.error("Razorpay payment verification request failed:", error);
    return res.status(502).json({ error: "Could not confirm payment status. Please try again." });
  }
  if (!paymentResponse.ok || payment.order_id !== razorpayOrderId || payment.amount !== order.amount || payment.currency !== "INR" || payment.status !== "captured") {
    return res.status(409).json({ error: "Payment has not been captured yet. Your membership has not been activated." });
  }
  const activateMembership = db.transaction(() => {
    const existingOrder = db.prepare("SELECT status, razorpay_payment_id AS paymentId FROM membership_orders WHERE id = ?").get(order.id);
    if (existingOrder.status === "paid") return;
    const memberRecord = db.prepare("SELECT membership_expires_at AS expiresAt FROM members WHERE id = ?").get(order.memberId);
    const currentExpiry = memberRecord.expiresAt ? new Date(memberRecord.expiresAt) : null;
    const startDate = currentExpiry && currentExpiry > new Date() ? currentExpiry : new Date();
    const expiry = addOneMonth(startDate).toISOString();
    db.prepare("UPDATE membership_orders SET status = 'paid', razorpay_payment_id = ? WHERE id = ?").run(razorpayPaymentId, order.id);
    db.prepare("UPDATE members SET membership_plan = ?, membership_expires_at = ? WHERE id = ?").run(order.plan, expiry, order.memberId);
  });
  try {
    activateMembership();
  } catch (error) {
    if (error.code === "SQLITE_CONSTRAINT_UNIQUE") {
      return res.status(409).json({ error: "This payment has already been applied to another membership order." });
    }
    throw error;
  }
  return res.json({ user: getMember(order.memberId) });
});

app.get("/api/articles", (req, res) => {
  const hasPaidAccess = memberHasPaidAccess(req);
  const articles = db.prepare(`
    SELECT id, category, title, excerpt, body, author, read_time AS time, image, placements,
      access_level AS accessLevel, created_at AS createdAt
    FROM articles WHERE status = 'published' ORDER BY created_at DESC, id DESC
  `).all().map((article) => {
    const requiresMembership = article.accessLevel === "member" && !hasPaidAccess;
    return {
      ...article,
      body: requiresMembership ? "" : article.body,
      requiresMembership
    };
  });
  res.json({ articles });
});

app.get("/api/articles/:id", (req, res) => {
  const id = parseId(req.params.id);
  if (id === null) return res.status(400).json({ error: "Article ID must be a positive integer." });
  const hasPaidAccess = memberHasPaidAccess(req);
  const article = db.prepare(`
    SELECT id, category, title, excerpt, body, author, read_time AS time, image, placements,
      access_level AS accessLevel, created_at AS createdAt
    FROM articles WHERE id = ? AND status = 'published'
  `).get(id);
  if (!article) return res.status(404).json({ error: "Article not found." });
  const requiresMembership = article.accessLevel === "member" && !hasPaidAccess;
  return res.json({
    article: {
      ...article,
      body: requiresMembership ? "" : article.body,
      requiresMembership
    }
  });
});

app.get("/api/content/:kind", (req, res) => {
  const { kind } = req.params;
  if (!managedContentKinds.has(kind)) return res.status(404).json({ error: "Content type not found." });
  const hasPaidAccess = memberHasPaidAccess(req);
  const items = db.prepare(`
    SELECT id, kind, title, description, body, person_name AS personName, role,
      organization, duration, issue_label AS issueLabel, image, media_url AS mediaUrl,
      slug, category, series, tags, placements, related_content AS relatedContent,
      featured, publication_at AS publicationAt, seo_title AS seoTitle,
      meta_description AS metaDescription, canonical_url AS canonicalUrl,
      access_level AS accessLevel, created_at AS createdAt
    FROM managed_content
    WHERE kind = ? AND status = 'published'
      AND (publication_at = '' OR publication_at IS NULL OR publication_at <= CURRENT_TIMESTAMP)
    ORDER BY featured DESC, COALESCE(NULLIF(publication_at, ''), created_at) DESC, id DESC
  `).all(kind).map((item) => {
    const requiresMembership = item.accessLevel === "member" && !hasPaidAccess;
    return {
      ...item,
      body: requiresMembership ? "" : item.body,
      mediaUrl: requiresMembership ? "" : item.mediaUrl,
      requiresMembership
    };
  });
  return res.json({ items });
});

app.get("/api/site-content", (req, res, next) => {
  try {
    const content = Object.fromEntries(
      db.prepare("SELECT section, content_json FROM site_content").all()
        .map((row) => [row.section, JSON.parse(row.content_json)])
    );
    return res.json({ content });
  } catch (error) {
    return next(error);
  }
});

app.post("/api/contact", rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 10,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  handler: (req, res) => res.status(429).json({ error: "Too many contact submissions. Please try again later." })
}), requireCsrf, async (req, res) => {
  const {
    name, email, company = "", phone = "", jobTitle = "", website = "",
    preferredContact = "email", type, magazineIssue = "", magazineFormat = "",
    magazineBudget = "", message
  } = req.body || {};
  const normalizedName = typeof name === "string" ? name.trim() : "";
  const normalizedEmail = typeof email === "string" ? email.trim().toLowerCase() : "";
  const normalizedCompany = typeof company === "string" ? company.trim() : "";
  const normalizedPhone = typeof phone === "string" ? phone.trim() : "";
  const normalizedJobTitle = typeof jobTitle === "string" ? jobTitle.trim() : "";
  const normalizedWebsite = typeof website === "string" ? website.trim() : "";
  const normalizedPreferredContact = typeof preferredContact === "string" ? preferredContact.trim().toLowerCase() : "";
  const typeInput = typeof type === "string" ? type.normalize("NFKC").trim().replace(/\s+/g, " ") : "";
  const normalizedType = [...enquiryTypes].find((allowedType) =>
    allowedType.toLocaleLowerCase("en-US") === typeInput.toLocaleLowerCase("en-US")
  ) || typeInput;
  const normalizedMagazineIssue = typeof magazineIssue === "string" ? magazineIssue.trim() : "";
  const normalizedMagazineFormat = typeof magazineFormat === "string" ? magazineFormat.trim() : "";
  const normalizedMagazineBudget = typeof magazineBudget === "string" ? magazineBudget.trim() : "";
  const normalizedMessage = typeof message === "string" ? message.trim() : "";
  let validWebsite = !normalizedWebsite;
  if (normalizedWebsite) {
    try {
      const websiteUrl = new URL(normalizedWebsite);
      validWebsite = ["http:", "https:"].includes(websiteUrl.protocol);
    } catch {
      validWebsite = false;
    }
  }
  if (
    !normalizedName || normalizedName.length > 120 ||
    normalizedEmail.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail) ||
    normalizedCompany.length > 160 ||
    normalizedPhone.length > 32 || (normalizedPhone && !/^\+?[0-9()\s.-]{7,32}$/.test(normalizedPhone)) ||
    normalizedJobTitle.length > 120 || !validWebsite || normalizedWebsite.length > 300 ||
    !["email", "phone"].includes(normalizedPreferredContact) ||
    (normalizedPreferredContact === "phone" && !normalizedPhone) ||
    !enquiryTypes.has(normalizedType) ||
    normalizedMagazineIssue.length > 120 || normalizedMagazineFormat.length > 100 || normalizedMagazineBudget.length > 80 ||
    !normalizedMessage || normalizedMessage.length > 5000
  ) {
    return res.status(400).json({ error: "Check your contact details, preferred reply method, and message (maximum 5,000 characters)." });
  }
  const result = db.prepare(`
    INSERT INTO enquiries (
      name, email, company, phone, job_title, website, preferred_contact, type,
      magazine_issue, magazine_format, magazine_budget, message
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    normalizedName, normalizedEmail, normalizedCompany, normalizedPhone, normalizedJobTitle,
    normalizedWebsite, normalizedPreferredContact, normalizedType, normalizedMagazineIssue,
    normalizedMagazineFormat, normalizedMagazineBudget, normalizedMessage
  );
  const enquiryId = Number(result.lastInsertRowid);
  const notification = { adminNotified: false, senderAcknowledged: false };
  const adminEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  if (isEmailDeliveryConfigured() && adminEmail && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(adminEmail)) {
    const outcomes = await Promise.allSettled([
      sendEmail({
        to: adminEmail,
        replyTo: normalizedEmail,
        subject: `New website enquiry: ${normalizedType}`,
        textContent: `A new website enquiry was received.\n\nName: ${normalizedName}\nEmail: ${normalizedEmail}\nPhone: ${normalizedPhone || "Not provided"}\nCompany: ${normalizedCompany || "Not provided"}\nRole: ${normalizedJobTitle || "Not provided"}\nWebsite: ${normalizedWebsite || "Not provided"}\nPreferred reply: ${normalizedPreferredContact}\nType: ${normalizedType}\nMagazine issue: ${normalizedMagazineIssue || "Not provided"}\nMagazine format: ${normalizedMagazineFormat || "Not provided"}\nBudget range: ${normalizedMagazineBudget || "Not provided"}\n\n${normalizedMessage}`
      }),
      sendEmail({
        to: normalizedEmail,
        subject: "We received your Humans of EV enquiry",
        textContent: `Hello ${normalizedName},\n\nThank you for contacting Humans of EV. We have received your enquiry about ${normalizedType} and our team will review it.\n\nRegards,\nHumans of EV`
      })
    ]);
    notification.adminNotified = outcomes[0].status === "fulfilled";
    notification.senderAcknowledged = outcomes[1].status === "fulfilled";
  }
  return res.status(201).json({ enquiry: { id: enquiryId }, notification });
});

app.post("/api/newsletter/subscribe", rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 10,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  handler: (req, res) => res.status(429).json({ error: "Too many newsletter requests. Please try again later." })
}), requireCsrf, async (req, res) => {
  const email = typeof req.body?.email === "string" ? req.body.email.trim().toLowerCase() : "";
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ error: "Enter a valid email address to subscribe." });
  }
  const existingSubscriber = db.prepare("SELECT status FROM newsletter_subscribers WHERE email = ?").get(email);
  if (existingSubscriber?.status === "subscribed") {
    return res.status(200).json({ subscribed: true, alreadySubscribed: true, emailSent: false });
  }

  db.prepare(`
    INSERT INTO newsletter_subscribers (email, status)
    VALUES (?, 'subscribed')
    ON CONFLICT(email) DO UPDATE SET status = 'subscribed', updated_at = CURRENT_TIMESTAMP
  `).run(email);

  let emailSent = false;
  try {
    await sendEmail({
      to: email,
      subject: "Welcome to the Humans of EV weekly brief",
      textContent: "Thank you for subscribing to the Humans of EV weekly intelligence brief. We will share EV industry news, research, events, and executive perspectives with you.\n\nTo request removal from the subscriber list, contact us through the website."
    });
    emailSent = true;
  } catch (error) {
    console.warn("Newsletter signup saved, but the welcome email was not delivered:", error.message);
  }
  return res.status(200).json({
    subscribed: true,
    emailSent,
    message: emailSent
      ? "You are subscribed. A welcome email has been sent."
      : "You are subscribed, but the welcome email could not be delivered."
  });
});

app.get("/api/admin/summary", requirePermission("dashboard.read"), (req, res) => {
  const articleCounts = db.prepare(`
    SELECT COUNT(*) AS total,
      SUM(CASE WHEN status = 'published' THEN 1 ELSE 0 END) AS published,
      SUM(CASE WHEN status = 'draft' THEN 1 ELSE 0 END) AS drafts
    FROM articles
  `).get();
  const enquiryCounts = db.prepare(`
    SELECT COUNT(*) AS total,
      SUM(CASE WHEN status = 'new' THEN 1 ELSE 0 END) AS new
    FROM enquiries
  `).get();
  const contentCounts = db.prepare(`
    SELECT kind, COUNT(*) AS total,
      SUM(CASE WHEN status = 'published' THEN 1 ELSE 0 END) AS published,
      SUM(CASE WHEN status = 'draft' THEN 1 ELSE 0 END) AS drafts
    FROM managed_content GROUP BY kind
  `).all();
  if (req.adminRole === "support") return res.json({ enquiries: enquiryCounts });
  if (req.adminRole === "editor" || req.adminRole === "publisher") {
    return res.json({ articles: articleCounts, managedContent: contentCounts });
  }
  return res.json({ articles: articleCounts, enquiries: enquiryCounts, managedContent: contentCounts });
});

app.get("/api/admin/site-content", requirePermission("site.read"), (req, res, next) => {
  try {
    const content = Object.fromEntries(
      db.prepare("SELECT section, content_json FROM site_content").all()
        .map((row) => [row.section, JSON.parse(row.content_json)])
    );
    return res.json({ content });
  } catch (error) {
    return next(error);
  }
});

app.put("/api/admin/site-content/:section", requirePermission("site.write"), requireCsrf, (req, res) => {
  const { section } = req.params;
  if (!siteContentSections.has(section)) return res.status(404).json({ error: "Site content section not found." });
  const { error, content } = validateSiteContent(section, req.body?.content);
  if (error) return res.status(400).json({ error });
  db.prepare(`
    INSERT INTO site_content (section, content_json, updated_at)
    VALUES (?, ?, CURRENT_TIMESTAMP)
    ON CONFLICT(section) DO UPDATE SET
      content_json = excluded.content_json, updated_at = CURRENT_TIMESTAMP
  `).run(section, JSON.stringify(content));
  return res.json({ section, content });
});

app.get("/api/admin/articles", requirePermission("content.read"), (req, res) => {
  const articles = db.prepare(`
    SELECT id, category, title, excerpt, body, author, read_time AS readTime, image,
      placements,
      status, access_level AS accessLevel, created_at AS createdAt, updated_at AS updatedAt
    FROM articles ORDER BY updated_at DESC, id DESC
  `).all();
  res.json({ articles });
});

app.get("/api/admin/content/:kind", requirePermission("content.read"), (req, res) => {
  const { kind } = req.params;
  if (!managedContentKinds.has(kind)) return res.status(404).json({ error: "Content type not found." });
  const items = db.prepare(`
    SELECT id, kind, title, description, body, person_name AS personName, role,
      organization, duration, issue_label AS issueLabel, image, media_url AS mediaUrl,
      slug, category, series, tags, placements, related_content AS relatedContent,
      featured, publication_at AS publicationAt, seo_title AS seoTitle,
      meta_description AS metaDescription, canonical_url AS canonicalUrl,
      status, access_level AS accessLevel, created_at AS createdAt, updated_at AS updatedAt
    FROM managed_content WHERE kind = ?
    ORDER BY ${kind === "magazine" ? "created_at" : "updated_at"} DESC, id DESC
  `).all(kind);
  return res.json({ items });
});

app.post("/api/admin/uploads/images", requirePermission("content.write"), requireCsrf, uploadImage.single("image"), async (req, res, next) => {
  if (!req.file) return res.status(400).json({ error: "Choose an image to upload." });
  const imageSignatures = [
    { mime: "image/jpeg", extension: ".jpg", matches: (buffer) => buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff },
    { mime: "image/png", extension: ".png", matches: (buffer) => buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) },
    { mime: "image/webp", extension: ".webp", matches: (buffer) => buffer.toString("ascii", 0, 4) === "RIFF" && buffer.toString("ascii", 8, 12) === "WEBP" },
    { mime: "image/gif", extension: ".gif", matches: (buffer) => ["GIF87a", "GIF89a"].includes(buffer.toString("ascii", 0, 6)) }
  ];
  const imageType = imageSignatures.find((signature) => signature.mime === req.file.mimetype && signature.matches(req.file.buffer));
  if (!imageType) return res.status(415).json({ error: "The uploaded file is not a valid supported image." });
  const filename = `${randomBytes(20).toString("hex")}${imageType.extension}`;
  try {
    await writeFile(resolve(uploadsDir, filename), req.file.buffer, { flag: "wx", mode: 0o644 });
  } catch (error) {
    return next(error);
  }
  return res.status(201).json({ image: { url: `/uploads/${filename}` } });
});

app.post("/api/admin/uploads/media", requirePermission("content.write"), requireCsrf, uploadManagedMedia.single("media"), (req, res) => {
  if (!req.file) return res.status(400).json({ error: "Choose a media file to upload." });
  return res.status(201).json({ media: { url: `/media/${req.file.filename}` } });
});

app.post("/api/admin/content/:kind", requirePermission("content.write"), requireCsrf, (req, res) => {
  const { kind } = req.params;
  const { error, values } = validateManagedContent(kind, req.body);
  if (error) return res.status(400).json({ error });
  if (values.status === "published" && !canPublishContent(req.adminRole)) return res.status(403).json({ error: "Editors can save drafts. A publisher or owner must publish this item." });
  const result = db.prepare(`
    INSERT INTO managed_content (
      kind, title, description, body, person_name, role, organization,
      duration, issue_label, image, media_url, slug, category, series, tags,
      placements, related_content, featured, publication_at, seo_title,
      meta_description, canonical_url, status, access_level
    ) VALUES (
      @kind, @title, @description, @body, @person_name, @role, @organization,
      @duration, @issue_label, @image, @media_url, @slug, @category, @series, @tags,
      @placements, @related_content, @featured, @publication_at, @seo_title,
      @meta_description, @canonical_url, @status, @access_level
    )
  `).run({ kind, ...values });
  return res.status(201).json({ item: { id: Number(result.lastInsertRowid), kind, ...values } });
});

app.put("/api/admin/content/:kind/:id", requirePermission("content.write"), requireCsrf, (req, res) => {
  const { kind } = req.params;
  if (!managedContentKinds.has(kind)) return res.status(404).json({ error: "Content type not found." });
  const id = parseId(req.params.id);
  if (id === null) return res.status(400).json({ error: "Content ID must be a positive integer." });
  const { error, values } = validateManagedContent(kind, req.body);
  if (error) return res.status(400).json({ error });
  const existing = db.prepare("SELECT status FROM managed_content WHERE id = ? AND kind = ?").get(id, kind);
  if (existing?.status === "published" && !canPublishContent(req.adminRole)) return res.status(403).json({ error: "A publisher or owner must edit published content." });
  if (values.status === "published" && !canPublishContent(req.adminRole)) return res.status(403).json({ error: "Editors can save drafts. A publisher or owner must publish this item." });
  const result = db.prepare(`
    UPDATE managed_content SET
      title = @title, description = @description, body = @body,
      person_name = @person_name, role = @role, organization = @organization,
      duration = @duration, issue_label = @issue_label, image = @image,
      media_url = @media_url, slug = @slug, category = @category, series = @series,
      tags = @tags, placements = @placements, related_content = @related_content,
      featured = @featured, publication_at = @publication_at, seo_title = @seo_title,
      meta_description = @meta_description, canonical_url = @canonical_url,
      status = @status, access_level = @access_level,
      updated_at = CURRENT_TIMESTAMP
    WHERE id = @id AND kind = @kind
  `).run({ id, kind, ...values });
  if (!result.changes) return res.status(404).json({ error: "Content item not found." });
  return res.json({ item: { id, kind, ...values } });
});

app.delete("/api/admin/content/:kind/:id", requirePermission("content.publish"), requireCsrf, (req, res) => {
  const { kind } = req.params;
  if (!managedContentKinds.has(kind)) return res.status(404).json({ error: "Content type not found." });
  const id = parseId(req.params.id);
  if (id === null) return res.status(400).json({ error: "Content ID must be a positive integer." });
  const result = db.prepare("DELETE FROM managed_content WHERE id = ? AND kind = ?").run(id, kind);
  if (!result.changes) return res.status(404).json({ error: "Content item not found." });
  return res.status(204).end();
});

app.post("/api/admin/articles", requirePermission("content.write"), requireCsrf, (req, res) => {
  const { error, values } = validateArticle(req.body);
  if (error) return res.status(400).json({ error });
  if (values.status === "published" && !canPublishContent(req.adminRole)) return res.status(403).json({ error: "Editors can save drafts. A publisher or owner must publish this article." });
  const result = db.prepare(`
    INSERT INTO articles (category, title, excerpt, body, author, read_time, image, placements, status, access_level)
    VALUES (@category, @title, @excerpt, @body, @author, @read_time, @image, @placements, @status, @access_level)
  `).run(values);
  return res.status(201).json({ article: { id: Number(result.lastInsertRowid), ...values } });
});

app.put("/api/admin/articles/:id", requirePermission("content.write"), requireCsrf, (req, res) => {
  const id = parseId(req.params.id);
  if (id === null) return res.status(400).json({ error: "Article ID must be a positive integer." });
  const { error, values } = validateArticle(req.body);
  if (error) return res.status(400).json({ error });
  const existing = db.prepare("SELECT status FROM articles WHERE id = ?").get(id);
  if (existing?.status === "published" && !canPublishContent(req.adminRole)) return res.status(403).json({ error: "A publisher or owner must edit published content." });
  if (values.status === "published" && !canPublishContent(req.adminRole)) return res.status(403).json({ error: "Editors can save drafts. A publisher or owner must publish this article." });
  const result = db.prepare(`
    UPDATE articles
    SET category = @category, title = @title, excerpt = @excerpt, body = @body,
      author = @author, read_time = @read_time, image = @image, placements = @placements, status = @status,
      access_level = @access_level,
      updated_at = CURRENT_TIMESTAMP
    WHERE id = @id
  `).run({ ...values, id });
  if (!result.changes) return res.status(404).json({ error: "Article not found." });
  return res.json({ article: { id, ...values } });
});

app.delete("/api/admin/articles/:id", requirePermission("content.publish"), requireCsrf, (req, res) => {
  const id = parseId(req.params.id);
  if (id === null) return res.status(400).json({ error: "Article ID must be a positive integer." });
  const result = db.prepare("DELETE FROM articles WHERE id = ?").run(id);
  if (!result.changes) return res.status(404).json({ error: "Article not found." });
  return res.status(204).end();
});

app.get("/api/admin/enquiries", requirePermission("enquiries.read"), (req, res) => {
  const enquiries = db.prepare(`
    SELECT id, name, email, company, phone, job_title AS jobTitle, website,
      preferred_contact AS preferredContact, type, magazine_issue AS magazineIssue,
      magazine_format AS magazineFormat, magazine_budget AS magazineBudget,
      message, status, created_at AS createdAt
    FROM enquiries ORDER BY created_at DESC, id DESC
  `).all();
  res.json({ enquiries });
});

app.get("/api/admin/newsletter-subscribers", requirePermission("newsletter.read"), (req, res) => {
  const subscribers = db.prepare(`
    SELECT id, email, status, subscribed_at AS subscribedAt, updated_at AS updatedAt
    FROM newsletter_subscribers ORDER BY subscribed_at DESC, id DESC
  `).all();
  return res.json({ subscribers });
});

app.delete("/api/admin/newsletter-subscribers/:id", requirePermission("newsletter.manage"), requireCsrf, (req, res) => {
  const id = parseId(req.params.id);
  if (id === null) return res.status(400).json({ error: "Subscriber ID must be a positive integer." });
  const result = db.prepare("DELETE FROM newsletter_subscribers WHERE id = ?").run(id);
  if (!result.changes) return res.status(404).json({ error: "Newsletter subscriber not found." });
  return res.status(204).end();
});

app.patch("/api/admin/enquiries/:id", requirePermission("enquiries.manage"), requireCsrf, (req, res) => {
  const id = parseId(req.params.id);
  if (id === null) return res.status(400).json({ error: "Enquiry ID must be a positive integer." });
  const status = req.body?.status;
  if (!["new", "read", "resolved"].includes(status)) {
    return res.status(400).json({ error: "Status must be new, read, or resolved." });
  }
  const result = db.prepare("UPDATE enquiries SET status = ? WHERE id = ?").run(status, id);
  if (!result.changes) return res.status(404).json({ error: "Enquiry not found." });
  return res.json({ id, status });
});

app.delete("/api/admin/enquiries/:id", requirePermission("enquiries.manage"), requireCsrf, (req, res) => {
  const id = parseId(req.params.id);
  if (id === null) return res.status(400).json({ error: "Enquiry ID must be a positive integer." });
  const result = db.prepare("DELETE FROM enquiries WHERE id = ?").run(id);
  if (!result.changes) return res.status(404).json({ error: "Enquiry not found." });
  return res.status(204).end();
});

const distDir = resolve(rootDir, "dist");
app.use("/uploads", express.static(uploadsDir, {
  dotfiles: "deny",
  index: false,
  immutable: true,
  maxAge: "1y"
}));
app.get("/media/:filename", (req, res, next) => {
  const { filename } = req.params;
  if (!/^[a-f0-9]{40}\.(?:mp4|webm|ogv|mp3|m4a|wav|aac|ogg|pdf)$/.test(filename)) {
    return res.status(404).end();
  }
  const mediaUrl = `/media/${filename}`;
  const visibility = db.prepare(`
    SELECT COUNT(*) AS publishedCount,
      MAX(CASE WHEN access_level = 'member' THEN 1 ELSE 0 END) AS requiresMembership
    FROM managed_content WHERE media_url = ? AND status = 'published'
  `).get(mediaUrl);
  if (!visibility.publishedCount) return res.status(404).end();
  if (visibility.requiresMembership && !memberHasPaidAccess(req)) {
    return res.status(403).json({ error: "An active membership is required to access this media." });
  }
  return res.sendFile(resolve(mediaDir, filename), {
    headers: { "X-Content-Type-Options": "nosniff" }
  }, (error) => {
    if (error) next(error);
  });
});
if (existsSync(distDir)) {
  app.use(express.static(distDir));
  app.use((req, res, next) => {
    if (req.method !== "GET" || req.path.startsWith("/api/")) return next();
    return res.sendFile(resolve(distDir, "index.html"));
  });
}

app.use("/api", (req, res) => res.status(404).json({ error: "API endpoint not found." }));
app.use((error, req, res, next) => {
  console.error("Request failed:", error);
  if (res.headersSent) return next(error);
  if (error instanceof multer.MulterError) {
    const status = error.code === "LIMIT_FILE_SIZE" ? 413 : 400;
    const message = error.code === "LIMIT_FILE_SIZE"
      ? error.field === "media" ? "Media files must be 500 MB or smaller." : "Images must be 5 MB or smaller."
      : error.field === "media" ? "Upload one media file at a time." : "Upload one image file at a time.";
    return res.status(status).json({ error: message });
  }
  if (error.status === 415) return res.status(415).json({ error: error.message });
  if (error.status === 400) return res.status(400).json({ error: "Request body contains invalid JSON." });
  if (error.status === 413) return res.status(413).json({ error: "Request body is too large." });
  return res.status(500).json({ error: "An unexpected server error occurred." });
});

app.listen(port, () => {
  console.info(`Humans of EV API listening on http://localhost:${port}`);
});
