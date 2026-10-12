import Database from "better-sqlite3";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = resolve(fileURLToPath(new URL("..", import.meta.url)));
const sourceApi = "https://humansofev.info/wp-json/wp/v2";
const sourceOrigin = "https://humansofev.info";
const imageFallback = "https://images.unsplash.com/photo-1593941707882-a5bba14938c7?auto=format&fit=crop&w=1200&q=80";
const args = new Set(process.argv.slice(2));
const applyChanges = args.has("--apply");
const target = process.argv.slice(2).find((value) => value.startsWith("--target="))?.split("=")[1] || "demo";
if (!["demo", "main"].includes(target)) {
  throw new Error("Use --target=demo or --target=main.");
}
const databasePath = resolve(projectRoot, "data", target === "demo" ? "demo" : "", "humans-of-ev.sqlite");
const categoryIds = { news: 5, article: 4, events: 6, magazine: 91 };
const interviewTitlePattern = /interview|conversation|sanjay tripathi|arunima singh|rashi gupta|gaurav lohia|grounded currents/i;
const podcastTitlePattern = /\bpodcast\b|\bepisode\s*#?\d/i;
const podcastEmbedPattern = /(?:open\.spotify\.com\/embed\/episode|spotify\.com\/episode|soundcloud\.com|podcasts\.apple\.com|<audio\b|wp:audio)/i;

function decodeEntities(value) {
  const named = {
    amp: "&", apos: "'", gt: ">", lt: "<", nbsp: " ", quot: "\"",
    rsquo: "’", lsquo: "‘", rdquo: "”", ldquo: "“", ndash: "–",
    mdash: "—", hellip: "…", copy: "©", reg: "®", trade: "™"
  };
  return value
    .replace(/&#(\d+);?/g, (entity, code) => {
      const point = Number(code);
      return point <= 0x10ffff ? String.fromCodePoint(point) : entity;
    })
    .replace(/&#x([0-9a-f]+);?/gi, (entity, code) => {
      const point = parseInt(code, 16);
      return point <= 0x10ffff ? String.fromCodePoint(point) : entity;
    })
    .replace(/&([a-z]+);/gi, (entity, name) => named[name.toLowerCase()] ?? entity);
}

function sourceLink(post) {
  const url = new URL(post.link);
  if (url.protocol !== "https:" || url.hostname !== "humansofev.info") {
    throw new Error(`Unexpected source link in WordPress post ${post.id}.`);
  }
  return url.href;
}

function htmlToText(value) {
  return decodeEntities(value
    .replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1>/gi, " ")
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<br\s*\/?>|<\/(?:p|div|h[1-6]|li|blockquote|section|article|ul|ol|figure)>/gi, "\n")
    .replace(/<[^>]+>/g, " "))
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n[ \t]+/g, "\n")
    .replace(/[ \t]{2,}/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function sourceImage(post) {
  const embedded = post._embedded?.["wp:featuredmedia"]?.[0]?.source_url;
  if (typeof embedded === "string" && embedded.startsWith(sourceOrigin)) return embedded;
  const image = post.content.rendered.match(/<img[^>]+src=["']([^"']+)["']/i)?.[1];
  if (image) {
    try {
      const url = new URL(image, sourceOrigin);
      if (url.protocol === "https:" && url.hostname === "humansofev.info") return url.href;
    } catch {
      return imageFallback;
    }
  }
  return imageFallback;
}

function authorName(post) {
  return post._embedded?.author?.[0]?.name || "Humans of EV";
}

function publishedTimestamp(value) {
  return value.replace("T", " ").replace(/(?:Z|[+-]\d{2}:\d{2})$/, "").slice(0, 19);
}

function displayPublishedDate(value) {
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit", month: "short", year: "numeric", timeZone: "UTC"
  }).format(new Date(`${value.slice(0, 19)}Z`));
}

function sourceBody(post) {
  const body = htmlToText(post.content.rendered);
  return `${body.slice(0, 19000)}\n\nSource: ${sourceLink(post)}`;
}

function postExcerpt(post) {
  const text = htmlToText(post.excerpt.rendered);
  if (text) return text.slice(0, 500);
  return htmlToText(post.content.rendered).split(/\n/)[0].slice(0, 500);
}

async function fetchCategory(categoryId, limit = Infinity) {
  const firstUrl = new URL(`${sourceApi}/posts`);
  firstUrl.searchParams.set("categories", String(categoryId));
  firstUrl.searchParams.set("per_page", "100");
  firstUrl.searchParams.set("page", "1");
  firstUrl.searchParams.set("_embed", "1");
  const firstResponse = await fetch(firstUrl, { signal: AbortSignal.timeout(20000) });
  if (!firstResponse.ok || new URL(firstResponse.url).hostname !== "humansofev.info") {
    throw new Error(`Could not read source category ${categoryId} (HTTP ${firstResponse.status}).`);
  }
  const totalPages = Math.max(1, Number(firstResponse.headers.get("X-WP-TotalPages")) || 1);
  const posts = await firstResponse.json();
  const pageCount = Math.min(totalPages, Math.ceil(limit / 100));
  for (let page = 2; page <= pageCount; page += 1) {
    const url = new URL(firstUrl);
    url.searchParams.set("page", String(page));
    const response = await fetch(url, { signal: AbortSignal.timeout(20000) });
    if (!response.ok || new URL(response.url).hostname !== "humansofev.info") {
      throw new Error(`Could not read source category ${categoryId}, page ${page} (HTTP ${response.status}).`);
    }
    posts.push(...await response.json());
  }
  return posts.slice(0, limit);
}

function interviewPerson(title) {
  const knownName = title.match(/Sanjay Tripathi|Arunima Singh|Rashi Gupta|Gaurav Lohia/i)?.[0];
  if (knownName) return knownName;
  const interviewee = title.match(/interview with\s+((?:(?:mr|mrs|ms|dr)\.?\s+)?[^,:]+?)(?:,|:|$)/i)?.[1];
  return interviewee?.trim() || "Industry leader";
}

const [newsPosts, articlePosts, eventPosts, magazinePosts] = await Promise.all([
  fetchCategory(categoryIds.news, 100),
  fetchCategory(categoryIds.article),
  fetchCategory(categoryIds.events),
  fetchCategory(categoryIds.magazine)
]);
const interviewPosts = articlePosts.filter((post) => interviewTitlePattern.test(htmlToText(post.title.rendered)));
const selectedPosts = [...newsPosts, ...articlePosts, ...eventPosts, ...magazinePosts];
const uniquePosts = [...new Map(selectedPosts.map((post) => [post.id, post])).values()];
const podcastPosts = uniquePosts.filter((post) =>
  podcastTitlePattern.test(htmlToText(post.title.rendered)) || podcastEmbedPattern.test(post.content.rendered)
);

const plan = {
  news: newsPosts.length,
  events: eventPosts.length,
  interviews: interviewPosts.length,
  podcasts: podcastPosts.length,
  magazine: magazinePosts.length,
  target: databasePath,
  action: applyChanges ? "import" : "preview only"
};
console.log("Content migration plan:", JSON.stringify(plan, null, 2));
if (!applyChanges) {
  console.log("No records changed. Re-run with --apply to import this preview.");
  process.exit(0);
}
if (!existsSync(databasePath)) {
  throw new Error(`The ${target} SQLite database does not exist at ${databasePath}. Start the local server once to initialize it.`);
}
const db = new Database(databasePath);

const articleInsert = db.prepare(`
  INSERT INTO articles (category, title, excerpt, body, author, read_time, image, status, access_level, created_at, updated_at)
  VALUES (@category, @title, @excerpt, @body, @author, @read_time, @image, 'published', 'free', @created_at, CURRENT_TIMESTAMP)
`);
const managedInsert = db.prepare(`
  INSERT INTO managed_content (
    kind, title, description, body, person_name, role, organization, duration,
    issue_label, image, media_url, status, access_level, created_at, updated_at
  ) VALUES (
    @kind, @title, @description, @body, @person_name, @role, @organization, @duration,
    @issue_label, @image, @media_url, 'published', 'free', @created_at, CURRENT_TIMESTAMP
  )
`);
const existingSourceArticle = db.prepare("SELECT id FROM articles WHERE body LIKE ?");
const existingManagedSource = db.prepare("SELECT id FROM managed_content WHERE media_url = ?");
const counts = { news: 0, interviews: 0, podcasts: 0, magazine: 0, events: eventPosts.length };

const importContent = db.transaction(() => {
  if (target === "demo") {
    db.prepare(`
      DELETE FROM articles WHERE title IN (
        'India''s EV market enters its next phase of scale, infrastructure and intelligent capital',
        'The battery race is moving beyond cell chemistry',
        'What India''s next mobility policy cycle could mean for industry',
        'The new generation of EV startups is building for the entire ecosystem'
      )
    `).run();
    db.prepare("DELETE FROM managed_content WHERE title LIKE 'Demo:%'").run();
  }

  for (const post of newsPosts) {
    const link = sourceLink(post);
    if (existingSourceArticle.get(`%Source: ${link}%`)) continue;
    const title = htmlToText(post.title.rendered).slice(0, 180);
    const body = sourceBody(post);
    const wordCount = body.split(/\s+/).filter(Boolean).length;
    articleInsert.run({
      category: "NEWS",
      title,
      excerpt: postExcerpt(post),
      body,
      author: authorName(post).slice(0, 100),
      read_time: `${Math.max(1, Math.ceil(wordCount / 220))} min read`,
      image: sourceImage(post),
      created_at: publishedTimestamp(post.date)
    });
    counts.news += 1;
  }

  const managedItems = [
    ...interviewPosts.map((post) => ({
      kind: "cxo",
      title: htmlToText(post.title.rendered).slice(0, 180),
      description: postExcerpt(post),
      body: sourceBody(post),
      person_name: interviewPerson(htmlToText(post.title.rendered)).slice(0, 180),
      role: "Executive interview",
      organization: "Organization not listed",
      duration: "",
      issue_label: "",
      image: sourceImage(post),
      media_url: sourceLink(post),
      created_at: publishedTimestamp(post.date)
    })),
    ...podcastPosts.map((post) => ({
      kind: "podcast",
      title: htmlToText(post.title.rendered).slice(0, 180),
      description: postExcerpt(post),
      body: sourceBody(post),
      person_name: authorName(post),
      role: "",
      organization: "",
      duration: "",
      issue_label: "",
      image: sourceImage(post),
      media_url: sourceLink(post),
      created_at: publishedTimestamp(post.date)
    })),
    ...magazinePosts.map((post) => ({
      kind: "magazine",
      title: htmlToText(post.title.rendered).slice(0, 180),
      description: postExcerpt(post),
      body: sourceBody(post),
      person_name: "",
      role: "",
      organization: "",
      duration: "",
      issue_label: displayPublishedDate(post.date),
      image: sourceImage(post),
      media_url: sourceLink(post),
      created_at: publishedTimestamp(post.date)
    }))
  ];
  for (const item of managedItems) {
    if (existingManagedSource.get(item.media_url)) continue;
    managedInsert.run(item);
    counts[item.kind === "cxo" ? "interviews" : item.kind === "magazine" ? "magazine" : "podcasts"] += 1;
  }

  const sourceEvents = eventPosts.map((post) => [
    htmlToText(post.title.rendered).slice(0, 300),
    postExcerpt(post).slice(0, 300) || "View the original event announcement.",
    `Published ${displayPublishedDate(post.date)}`,
    "EV Events",
    sourceLink(post)
  ]);
  db.prepare(`
    INSERT INTO site_content (section, content_json, updated_at)
    VALUES ('events', ?, CURRENT_TIMESTAMP)
    ON CONFLICT(section) DO UPDATE SET content_json = excluded.content_json, updated_at = CURRENT_TIMESTAMP
  `).run(JSON.stringify(sourceEvents));
});

try {
  importContent();
} catch (error) {
  db.close();
  throw error;
}
console.log("Imported records:", JSON.stringify(counts, null, 2));
if (podcastPosts.length === 0) {
  console.log("No podcast-specific items were exposed by the source WordPress API; no podcast was fabricated.");
}
db.close();
