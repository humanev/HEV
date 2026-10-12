import bcrypt from "bcryptjs";
import Database from "better-sqlite3";
import express from "express";
import rateLimit from "express-rate-limit";
import session from "express-session";
import helmet from "helmet";
import multer from "multer";
import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { mkdirSync, existsSync } from "node:fs";
import { writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { siteContentDefaults } from "../src/data.js";

const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const localDemoMode = process.env.LOCAL_DEMO_MODE === "true";
const dataDir = resolve(rootDir, "data", localDemoMode ? "demo" : "");
const uploadsDir = resolve(dataDir, "uploads");
const port = Number(process.env.PORT || 3001);
const sessionSecret = process.env.SESSION_SECRET;
const databaseFile = resolve(dataDir, "humans-of-ev.sqlite");
const sessionDuration = 8 * 60 * 60 * 1000;
const brevoApiKey = process.env.BREVO_API_KEY?.trim();
const emailFrom = process.env.EMAIL_FROM?.trim();
const emailFromName = process.env.EMAIL_FROM_NAME?.trim() || "Humans of EV";

if (!sessionSecret || sessionSecret.length < 32) {
  throw new Error("Set SESSION_SECRET to a random value containing at least 32 characters.");
}
if (!Number.isInteger(port) || port < 1 || port > 65535) {
  throw new Error("PORT must be a valid TCP port.");
}
if (localDemoMode && process.env.NODE_ENV === "production") {
  throw new Error("LOCAL_DEMO_MODE cannot be enabled in production.");
}

mkdirSync(dataDir, { recursive: true });
mkdirSync(uploadsDir, { recursive: true });
const db = new Database(databaseFile);
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");
db.exec(`
  CREATE TABLE IF NOT EXISTS admins (
    id INTEGER PRIMARY KEY,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
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
    type TEXT NOT NULL,
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
if (savedNavigation) {
  const currentNavigation = JSON.parse(savedNavigation.content_json);
  if (Array.isArray(currentNavigation) && currentNavigation.map((item) => item.label).join("|") === previousMenuLabels.join("|")) {
    db.prepare("UPDATE site_content SET content_json = ?, updated_at = CURRENT_TIMESTAMP WHERE section = 'navigation'")
      .run(JSON.stringify(siteContentDefaults.navigation));
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

const seedArticles = [
  {
    category: "MARKET",
    title: "India's EV market enters its next phase of scale, infrastructure and intelligent capital",
    excerpt: "The next chapter will be defined by charging density, financing, software and resilient supply chains.",
    body: "Electric mobility is entering a more mature phase. The opportunity is no longer defined by a single vehicle category, but by the connected ecosystem around energy, infrastructure, software, manufacturing and capital.\n\nAcross India, executives and entrepreneurs are moving from experimentation to scale. That shift is changing the way companies build products, raise capital, manage fleets and measure the economics of electrification.\n\nThe strongest businesses are connecting vehicles to charging, batteries to data, and mobility demand to resilient energy infrastructure. This creates a wider market for specialised technology and services.",
    author: "Editorial Desk",
    read_time: "8 min read",
    image: "https://images.unsplash.com/photo-1593941707882-a5bba14938c7?auto=format&fit=crop&w=1200&q=80"
  },
  {
    category: "BATTERY",
    title: "The battery race is moving beyond cell chemistry",
    excerpt: "Manufacturers are investing in localisation, recycling, thermal systems and data.",
    body: "Battery makers are extending their focus beyond cell chemistry. Local supply chains, recycling, thermal management and data are becoming central to the next generation of electric mobility products.",
    author: "Ananya Mehta",
    read_time: "6 min read",
    image: "https://images.unsplash.com/photo-1609521263047-f8f205293f24?auto=format&fit=crop&w=1000&q=80"
  },
  {
    category: "POLICY",
    title: "What India's next mobility policy cycle could mean for industry",
    excerpt: "A closer look at manufacturing incentives, charging networks and clean mobility economics.",
    body: "India's next mobility policy cycle will influence manufacturing incentives, charging networks and the economics of clean mobility. Industry leaders are watching how these priorities translate into long-term investment.",
    author: "Rahul Sharma",
    read_time: "7 min read",
    image: "https://images.unsplash.com/photo-1551830820-330a71b99659?auto=format&fit=crop&w=1000&q=80"
  },
  {
    category: "STARTUPS",
    title: "The new generation of EV startups is building for the entire ecosystem",
    excerpt: "Software, fleet intelligence, energy and components are opening new venture opportunities.",
    body: "A new generation of EV startups is building across software, fleet intelligence, energy and components. Their work is creating opportunities throughout the mobility ecosystem.",
    author: "Priya Nair",
    read_time: "5 min read",
    image: "https://images.unsplash.com/photo-1556761175-b413da4baf72?auto=format&fit=crop&w=1000&q=80"
  }
];

if (db.prepare("SELECT COUNT(*) AS count FROM articles").get().count === 0) {
  const insertArticle = db.prepare(`
    INSERT INTO articles (category, title, excerpt, body, author, read_time, image, status)
    VALUES (@category, @title, @excerpt, @body, @author, @read_time, @image, 'published')
  `);
  const seed = db.transaction((articles) => {
    for (const article of articles) insertArticle.run(article);
  });
  seed(seedArticles);
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

if (localDemoMode) {
  const demoMemberEmail = process.env.DEMO_MEMBER_EMAIL?.trim().toLowerCase();
  const demoMemberPassword = process.env.DEMO_MEMBER_PASSWORD;
  if (!demoMemberEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(demoMemberEmail) ||
      !demoMemberPassword || demoMemberPassword.length < 12) {
    throw new Error("Set valid DEMO_MEMBER_EMAIL and DEMO_MEMBER_PASSWORD values in .env.demo.");
  }
  if (!db.prepare("SELECT id FROM members WHERE email = ?").get(demoMemberEmail)) {
    const passwordHash = await bcrypt.hash(demoMemberPassword, 12);
    const expiresAt = new Date();
    expiresAt.setMonth(expiresAt.getMonth() + 1);
    db.prepare(`
      INSERT INTO members (name, email, password_hash, membership_plan, membership_expires_at)
      VALUES (?, ?, ?, 'Professional', ?)
    `).run("Demo Member", demoMemberEmail, passwordHash, expiresAt.toISOString());
  }

  if (db.prepare("SELECT COUNT(*) AS count FROM managed_content").get().count === 0) {
    const insertManagedContent = db.prepare(`
      INSERT INTO managed_content (
        kind, title, description, body, person_name, role, organization, duration,
        issue_label, image, media_url, status, access_level
      ) VALUES (
        @kind, @title, @description, @body, @person_name, @role, @organization, @duration,
        @issue_label, @image, @media_url, 'published', @access_level
      )
    `);
    const demoContent = [
      {
        kind: "podcast", title: "Demo: Scaling India's EV charging network",
        description: "A sample episode for testing podcast cards and access controls.",
        body: "Demo podcast details.", person_name: "Aarav Mehta", role: "", organization: "",
        duration: "32 min", issue_label: "", image: seedArticles[0].image, media_url: "",
        access_level: "free"
      },
      {
        kind: "podcast", title: "Demo: The next battery breakthrough",
        description: "A members-only sample episode for testing the membership gate.",
        body: "Demo premium podcast details.", person_name: "Nisha Rao", role: "", organization: "",
        duration: "41 min", issue_label: "", image: seedArticles[1].image, media_url: "",
        access_level: "member"
      },
      {
        kind: "magazine", title: "Demo: The Electric Mobility Outlook",
        description: "A sample magazine issue for the archive and access-level UI.",
        body: "Demo magazine issue details.", person_name: "", role: "", organization: "",
        duration: "", issue_label: "Demo issue · October 2026", image: seedArticles[2].image,
        media_url: "", access_level: "free"
      },
      {
        kind: "magazine", title: "Demo: India's Battery Supply Chain",
        description: "A members-only sample issue for testing the membership gate.",
        body: "Demo premium magazine details.", person_name: "", role: "", organization: "",
        duration: "", issue_label: "Demo premium issue", image: seedArticles[1].image,
        media_url: "", access_level: "member"
      },
      {
        kind: "cxo", title: "Demo: Building a resilient EV ecosystem",
        description: "A sample executive profile for testing the CXO directory.",
        body: "Demo executive profile.", person_name: "Kavya Sharma", role: "Chief Executive Officer",
        organization: "Demo Mobility", duration: "", issue_label: "",
        image: seedArticles[3].image, media_url: "", access_level: "free"
      },
      {
        kind: "cxo", title: "Demo: Investing in the electric future",
        description: "A members-only sample executive profile.",
        body: "Demo premium executive profile.", person_name: "Rohan Iyer", role: "Managing Partner",
        organization: "Demo Ventures", duration: "", issue_label: "",
        image: seedArticles[0].image, media_url: "", access_level: "member"
      }
    ];
    const seedManagedContent = db.transaction((items) => {
      for (const item of items) insertManagedContent.run(item);
    });
    seedManagedContent(demoContent);
  }
  db.prepare("UPDATE articles SET access_level = 'member' WHERE id = (SELECT id FROM articles ORDER BY id LIMIT 1 OFFSET 1)").run();
  if (db.prepare("SELECT COUNT(*) AS count FROM enquiries").get().count === 0) {
    db.prepare(`
      INSERT INTO enquiries (name, email, company, type, message, status)
      VALUES ('Demo Contact', 'contact@example.test', 'Demo Mobility', 'General enquiry', 'Sample enquiry for admin inbox testing.', 'new')
    `).run();
  }
  if (db.prepare("SELECT COUNT(*) AS count FROM newsletter_subscribers").get().count === 0) {
    db.prepare("INSERT INTO newsletter_subscribers (email) VALUES ('newsletter@example.test')").run();
  }
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
    console.error("Brevo rejected an email request:", response.status);
    throw new Error("The email provider could not deliver the message.");
  }
}

setInterval(() => {
  db.prepare("DELETE FROM sessions WHERE expires_at <= ?").run(Date.now());
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

function requireAdmin(req, res, next) {
  if (!req.session.adminId) return res.status(401).json({ error: "Sign in as an administrator to continue." });
  return next();
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
  if (values.image && !isValidImageReference(values.image)) {
    return { error: "Image must be a valid HTTP or HTTPS URL or an uploaded image." };
  }
  for (const field of ["media_url"]) {
    if (!values[field]) continue;
    try {
      const url = new URL(values[field]);
      if (!["http:", "https:"].includes(url.protocol)) throw new Error("Unsupported URL.");
    } catch {
      return { error: `${field === "image" ? "Image" : "Media"} URL must be a valid HTTP or HTTPS URL.` };
    }
  }
  return { values };
}

const enquiryTypes = new Set([
  "General enquiry",
  "Editorial / newsroom",
  "Advertising & sponsorship",
  "Membership & subscriptions",
  "Research & intelligence",
  "Events & awards",
  "Enterprise partnership",
  "Media enquiry",
  "Careers"
]);

app.get("/api/auth/csrf", (req, res, next) => {
  if (!req.session.csrfToken) req.session.csrfToken = randomBytes(32).toString("hex");
  req.session.save((error) => {
    if (error) return next(error);
    return res.json({ csrfToken: req.session.csrfToken });
  });
});

app.get("/api/status", (req, res) => {
  return res.json({ localDemoMode });
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
  const admin = db.prepare("SELECT id, email, password_hash FROM admins WHERE email = ?").get(email);
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
      return res.json({ user: { email: admin.email } });
    });
  });
});

app.get("/api/admin/session", requireAdmin, (req, res) => {
  res.json({ user: { email: req.session.adminEmail } });
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
    razorpayEnabled: Boolean(razorpayKeyId && razorpayKeySecret),
    localDemoMode
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
  if (localDemoMode) {
    const orderId = `demo_order_${randomBytes(12).toString("hex")}`;
    db.prepare(`
      INSERT INTO membership_orders (member_id, razorpay_order_id, plan, amount)
      VALUES (?, ?, ?, ?)
    `).run(member.id, orderId, plan, amount);
    return res.status(201).json({
      keyId: "local-demo",
      orderId,
      amount,
      currency: "INR",
      plan,
      name: member.name,
      email: member.email,
      demo: true
    });
  }
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
  if (localDemoMode && razorpayOrderId.startsWith("demo_order_")) {
    if (razorpaySignature !== "local-demo-signature" || !/^demo_payment_[a-f0-9]{24}$/.test(razorpayPaymentId)) {
      return res.status(400).json({ error: "Local demo payment details are invalid." });
    }
    const expiry = db.transaction(() => {
      const memberRecord = db.prepare("SELECT membership_expires_at AS expiresAt FROM members WHERE id = ?").get(order.memberId);
      const currentExpiry = memberRecord.expiresAt ? new Date(memberRecord.expiresAt) : null;
      const startDate = currentExpiry && currentExpiry > new Date() ? currentExpiry : new Date();
      const nextExpiry = addOneMonth(startDate).toISOString();
      db.prepare("UPDATE membership_orders SET status = 'paid', razorpay_payment_id = ? WHERE id = ?").run(razorpayPaymentId, order.id);
      db.prepare("UPDATE members SET membership_plan = ?, membership_expires_at = ? WHERE id = ?").run(order.plan, nextExpiry, order.memberId);
      return nextExpiry;
    })();
    console.info(`Simulated local demo payment for order ${razorpayOrderId}; no money was charged.`);
    return res.json({ user: getMember(order.memberId), demo: true, membershipExpiresAt: expiry });
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
    SELECT id, category, title, excerpt, body, author, read_time AS time, image,
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
    SELECT id, category, title, excerpt, body, author, read_time AS time, image,
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
      access_level AS accessLevel, created_at AS createdAt
    FROM managed_content
    WHERE kind = ? AND status = 'published'
    ORDER BY created_at DESC, id DESC
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
  const { name, email, company = "", type, message } = req.body || {};
  if (
    typeof name !== "string" || !name.trim() || name.trim().length > 120 ||
    typeof email !== "string" || email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
    typeof company !== "string" || company.length > 160 ||
    typeof type !== "string" || !enquiryTypes.has(type) ||
    typeof message !== "string" || !message.trim() || message.trim().length > 5000
  ) {
    return res.status(400).json({ error: "Please provide valid contact details and a message (maximum 5,000 characters)." });
  }
  const result = db.prepare(`
    INSERT INTO enquiries (name, email, company, type, message)
    VALUES (?, ?, ?, ?, ?)
  `).run(name.trim(), email.trim().toLowerCase(), company.trim(), type, message.trim());
  const enquiryId = Number(result.lastInsertRowid);
  const notification = { adminNotified: false, senderAcknowledged: false };
  const adminEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  if (localDemoMode) {
    notification.adminNotified = true;
    notification.senderAcknowledged = true;
    notification.simulated = true;
    console.info(`Simulated local demo contact emails for enquiry ${enquiryId}; no email was sent.`);
  } else if (isEmailDeliveryConfigured() && adminEmail && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(adminEmail)) {
    const outcomes = await Promise.allSettled([
      sendEmail({
        to: adminEmail,
        replyTo: email.trim().toLowerCase(),
        subject: `New website enquiry: ${type}`,
        textContent: `A new website enquiry was received.\n\nName: ${name.trim()}\nEmail: ${email.trim().toLowerCase()}\nCompany: ${company.trim() || "Not provided"}\nType: ${type}\n\n${message.trim()}`
      }),
      sendEmail({
        to: email.trim().toLowerCase(),
        subject: "We received your Humans of EV enquiry",
        textContent: `Hello ${name.trim()},\n\nThank you for contacting Humans of EV. We have received your enquiry about ${type} and our team will review it.\n\nRegards,\nHumans of EV`
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
  if (!localDemoMode && !isEmailDeliveryConfigured()) {
    return res.status(503).json({ error: "Newsletter email delivery is not configured. Please contact us to subscribe." });
  }
  if (localDemoMode) {
    console.info(`Simulated local demo newsletter welcome email to ${email}; no email was sent.`);
  } else {
    try {
      await sendEmail({
        to: email,
        subject: "Welcome to the Humans of EV weekly brief",
        textContent: "Thank you for subscribing to the Humans of EV weekly intelligence brief. We will share EV industry news, research, events, and executive perspectives with you.\n\nTo request removal from the subscriber list, contact us through the website."
      });
    } catch (error) {
      return res.status(502).json({ error: `${error.message} Your subscription was not saved; please try again later.` });
    }
  }
  db.prepare(`
    INSERT INTO newsletter_subscribers (email, status)
    VALUES (?, 'subscribed')
    ON CONFLICT(email) DO UPDATE SET status = 'subscribed', updated_at = CURRENT_TIMESTAMP
  `).run(email);
  return res.status(200).json({ subscribed: true, emailSent: true, simulated: localDemoMode });
});

app.get("/api/admin/summary", requireAdmin, (req, res) => {
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
  res.json({ articles: articleCounts, enquiries: enquiryCounts, managedContent: contentCounts });
});

app.get("/api/admin/site-content", requireAdmin, (req, res, next) => {
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

app.put("/api/admin/site-content/:section", requireAdmin, requireCsrf, (req, res) => {
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

app.get("/api/admin/articles", requireAdmin, (req, res) => {
  const articles = db.prepare(`
    SELECT id, category, title, excerpt, body, author, read_time AS readTime, image,
      status, access_level AS accessLevel, created_at AS createdAt, updated_at AS updatedAt
    FROM articles ORDER BY updated_at DESC, id DESC
  `).all();
  res.json({ articles });
});

app.get("/api/admin/content/:kind", requireAdmin, (req, res) => {
  const { kind } = req.params;
  if (!managedContentKinds.has(kind)) return res.status(404).json({ error: "Content type not found." });
  const items = db.prepare(`
    SELECT id, kind, title, description, body, person_name AS personName, role,
      organization, duration, issue_label AS issueLabel, image, media_url AS mediaUrl,
      status, access_level AS accessLevel, created_at AS createdAt, updated_at AS updatedAt
    FROM managed_content WHERE kind = ?
    ORDER BY updated_at DESC, id DESC
  `).all(kind);
  return res.json({ items });
});

app.post("/api/admin/uploads/images", requireAdmin, requireCsrf, uploadImage.single("image"), async (req, res, next) => {
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

app.post("/api/admin/content/:kind", requireAdmin, requireCsrf, (req, res) => {
  const { kind } = req.params;
  const { error, values } = validateManagedContent(kind, req.body);
  if (error) return res.status(400).json({ error });
  const result = db.prepare(`
    INSERT INTO managed_content (
      kind, title, description, body, person_name, role, organization,
      duration, issue_label, image, media_url, status, access_level
    ) VALUES (
      @kind, @title, @description, @body, @person_name, @role, @organization,
      @duration, @issue_label, @image, @media_url, @status, @access_level
    )
  `).run({ kind, ...values });
  return res.status(201).json({ item: { id: Number(result.lastInsertRowid), kind, ...values } });
});

app.put("/api/admin/content/:kind/:id", requireAdmin, requireCsrf, (req, res) => {
  const { kind } = req.params;
  if (!managedContentKinds.has(kind)) return res.status(404).json({ error: "Content type not found." });
  const id = parseId(req.params.id);
  if (id === null) return res.status(400).json({ error: "Content ID must be a positive integer." });
  const { error, values } = validateManagedContent(kind, req.body);
  if (error) return res.status(400).json({ error });
  const result = db.prepare(`
    UPDATE managed_content SET
      title = @title, description = @description, body = @body,
      person_name = @person_name, role = @role, organization = @organization,
      duration = @duration, issue_label = @issue_label, image = @image,
      media_url = @media_url, status = @status, access_level = @access_level,
      updated_at = CURRENT_TIMESTAMP
    WHERE id = @id AND kind = @kind
  `).run({ id, kind, ...values });
  if (!result.changes) return res.status(404).json({ error: "Content item not found." });
  return res.json({ item: { id, kind, ...values } });
});

app.delete("/api/admin/content/:kind/:id", requireAdmin, requireCsrf, (req, res) => {
  const { kind } = req.params;
  if (!managedContentKinds.has(kind)) return res.status(404).json({ error: "Content type not found." });
  const id = parseId(req.params.id);
  if (id === null) return res.status(400).json({ error: "Content ID must be a positive integer." });
  const result = db.prepare("DELETE FROM managed_content WHERE id = ? AND kind = ?").run(id, kind);
  if (!result.changes) return res.status(404).json({ error: "Content item not found." });
  return res.status(204).end();
});

app.post("/api/admin/articles", requireAdmin, requireCsrf, (req, res) => {
  const { error, values } = validateArticle(req.body);
  if (error) return res.status(400).json({ error });
  const result = db.prepare(`
    INSERT INTO articles (category, title, excerpt, body, author, read_time, image, status, access_level)
    VALUES (@category, @title, @excerpt, @body, @author, @read_time, @image, @status, @access_level)
  `).run(values);
  return res.status(201).json({ article: { id: Number(result.lastInsertRowid), ...values } });
});

app.put("/api/admin/articles/:id", requireAdmin, requireCsrf, (req, res) => {
  const id = parseId(req.params.id);
  if (id === null) return res.status(400).json({ error: "Article ID must be a positive integer." });
  const { error, values } = validateArticle(req.body);
  if (error) return res.status(400).json({ error });
  const result = db.prepare(`
    UPDATE articles
    SET category = @category, title = @title, excerpt = @excerpt, body = @body,
      author = @author, read_time = @read_time, image = @image, status = @status,
      access_level = @access_level,
      updated_at = CURRENT_TIMESTAMP
    WHERE id = @id
  `).run({ ...values, id });
  if (!result.changes) return res.status(404).json({ error: "Article not found." });
  return res.json({ article: { id, ...values } });
});

app.delete("/api/admin/articles/:id", requireAdmin, requireCsrf, (req, res) => {
  const id = parseId(req.params.id);
  if (id === null) return res.status(400).json({ error: "Article ID must be a positive integer." });
  const result = db.prepare("DELETE FROM articles WHERE id = ?").run(id);
  if (!result.changes) return res.status(404).json({ error: "Article not found." });
  return res.status(204).end();
});

app.get("/api/admin/enquiries", requireAdmin, (req, res) => {
  const enquiries = db.prepare(`
    SELECT id, name, email, company, type, message, status, created_at AS createdAt
    FROM enquiries ORDER BY created_at DESC, id DESC
  `).all();
  res.json({ enquiries });
});

app.get("/api/admin/newsletter-subscribers", requireAdmin, (req, res) => {
  const subscribers = db.prepare(`
    SELECT id, email, status, subscribed_at AS subscribedAt, updated_at AS updatedAt
    FROM newsletter_subscribers ORDER BY subscribed_at DESC, id DESC
  `).all();
  return res.json({ subscribers });
});

app.delete("/api/admin/newsletter-subscribers/:id", requireAdmin, requireCsrf, (req, res) => {
  const id = parseId(req.params.id);
  if (id === null) return res.status(400).json({ error: "Subscriber ID must be a positive integer." });
  const result = db.prepare("DELETE FROM newsletter_subscribers WHERE id = ?").run(id);
  if (!result.changes) return res.status(404).json({ error: "Newsletter subscriber not found." });
  return res.status(204).end();
});

app.patch("/api/admin/enquiries/:id", requireAdmin, requireCsrf, (req, res) => {
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

app.delete("/api/admin/enquiries/:id", requireAdmin, requireCsrf, (req, res) => {
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
      ? "Image must be 5 MB or smaller."
      : "Upload one image file at a time.";
    return res.status(status).json({ error: message });
  }
  if (error.status === 415) return res.status(415).json({ error: error.message });
  if (error.status === 400) return res.status(400).json({ error: "Request body contains invalid JSON." });
  if (error.status === 413) return res.status(413).json({ error: "Request body is too large." });
  return res.status(500).json({ error: "An unexpected server error occurred." });
});

const listenOptions = localDemoMode
  ? { port, host: "127.0.0.1" }
  : { port };
app.listen(listenOptions, () => {
  console.info(`Humans of EV API listening on http://${localDemoMode ? "127.0.0.1" : "localhost"}:${port}${localDemoMode ? " (local demo mode)" : ""}`);
});
