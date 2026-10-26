import {Mic2, Video, BookOpen, Users, BarChart3, Settings, FileText, Inbox, Mail, ShieldCheck, Activity} from "lucide-react";
import {readLegacyContactMessage} from "../../contactMetadata";

export const emptyArticle = {
  category: "MARKET",
  title: "",
  excerpt: "",
  body: "",
  author: "Editorial Desk",
  readTime: "5 min read",
  image: "",
  status: "draft",
  accessLevel: "free"
};

export const managedTypes = {
  podcasts: { kind: "podcast", label: "Podcasts", icon: Mic2 },
  videos: { kind: "video", label: "Videos", icon: Video },
  magazine: { kind: "magazine", label: "Magazine", icon: BookOpen },
  cxos: { kind: "cxo", label: "CXO profiles", icon: Users }
};

export const tabs = [
  { id: "overview", label: "Overview", icon: BarChart3, roles: ["owner", "editor", "publisher", "support"] },
  { id: "site-content", label: "Website content", icon: Settings, roles: ["owner"] },
  { id: "articles", label: "News", icon: FileText, roles: ["owner", "editor", "publisher"] },
  { id: "podcasts", ...managedTypes.podcasts, roles: ["owner", "editor", "publisher"] },
  { id: "videos", ...managedTypes.videos, roles: ["owner", "editor", "publisher"] },
  { id: "magazine", ...managedTypes.magazine, roles: ["owner", "editor", "publisher"] },
  { id: "cxos", ...managedTypes.cxos, roles: ["owner", "editor", "publisher"] },
  { id: "enquiries", label: "Enquiries", icon: Inbox, roles: ["owner", "support"] },
  { id: "newsletter", label: "Newsletter", icon: Mail, roles: ["owner", "support"] },
  { id: "team", label: "Team & roles", icon: Users, roles: ["owner"] },
  { id: "profile", label: "Profile & security", icon: ShieldCheck, roles: ["owner", "editor", "publisher", "support"] }
];

export const adminMenuGroups = [
  { label: "Workspace", ids: ["overview"] },
  { label: "Publishing", ids: ["articles", "podcasts", "videos", "magazine", "cxos"] },
  { label: "Audience", ids: ["enquiries", "newsletter"] },
  { label: "Administration", ids: ["site-content", "team", "profile"] }
];

export const adminRoleLabels = { owner: "Owner", editor: "Editor", publisher: "Publisher", support: "Support" };

export const siteContentSections = [
  { id: "navigation", label: "Navigation menu", description: "Edit the main desktop and mobile menu, including dropdown links.", type: "json" },
  { id: "homeStats", label: "Home page stats", description: "Numbers displayed in the home-page market dashboard.", fields: ["Label", "Value", "Change"] },
  { id: "directory", label: "Company directory", description: "Companies shown in the Startup Hub and company directory.", fields: ["Company", "Sector", "Location", "Stage"] },
  { id: "events", label: "Events", description: "Upcoming events shown on the events page. Imported event entries may also include an external source link.", fields: ["Event name", "Location", "Date", "Type", "Source / registration URL"], optionalFields: [4] },
  { id: "reports", label: "Research reports", description: "Report cards shown in Intelligence and Research.", fields: ["Report title", "Category", "Access label"] },
  { id: "plans", label: "Membership plans", description: "Plan names, display prices, descriptions, and listed benefits.", type: "plans" },
  { id: "dashboardData", label: "Dashboard metrics", description: "Metric cards shown on the intelligence dashboard.", fields: ["Metric", "Value", "Change"] },
  { id: "investorDeals", label: "Investor deals", description: "Funding headlines and amounts shown in Investors Hub.", fields: ["Deal headline", "Amount", "Date label"] },
  { id: "peopleVoices", label: "People highlights", description: "Featured executive-conversation cards on the People page.", fields: ["Role", "Initials", "Headline"] },
  { id: "learningCourses", label: "Learning courses", description: "Course titles shown in the Learning Centre.", type: "strings" },
  { id: "communityFeatures", label: "Community features", description: "Feature cards shown on the Community page.", fields: ["Feature name", "Description"] },
  { id: "homeCapabilities", label: "Home page feature cards", description: "Capability cards displayed on the home page. Icons: FileText, Users, Building2, Sparkles.", fields: ["Card title", "Description", "Internal link", "Icon"] }
];

export function getEnquiryDisplay(enquiry) {
  const legacy = readLegacyContactMessage(enquiry.message);
  return {
    ...enquiry,
    type: legacy?.type || enquiry.type,
    message: legacy?.message ?? enquiry.message,
    phone: enquiry.phone || legacy?.phone || "",
    jobTitle: enquiry.jobTitle || legacy?.jobTitle || "",
    website: enquiry.website || legacy?.website || "",
    preferredContact: enquiry.preferredContact || legacy?.preferredContact || "",
    magazineIssue: enquiry.magazineIssue || legacy?.magazineIssue || "",
    magazineFormat: enquiry.magazineFormat || legacy?.magazineFormat || "",
    magazineBudget: enquiry.magazineBudget || legacy?.magazineBudget || ""
  };
}

export function emptyManagedContent(kind) {
  return {
    title: "",
    description: "",
    body: "",
    personName: "",
    role: "",
    organization: "",
    duration: "",
    issueLabel: "",
    image: "",
    mediaUrl: "",
    status: "draft",
    accessLevel: "free",
    kind
  };
}

export function displayDate(value) {
  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(`${value.replace(" ", "T")}Z`));
}
