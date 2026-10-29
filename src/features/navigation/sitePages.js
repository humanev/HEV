export const sitePages = [
  { placement: "page-home", label: "Home", route: "/", paths: ["/"] },
  { placement: "page-news", label: "News", route: "/news", paths: ["/news"] },
  { placement: "page-news-all", label: "News · Latest articles", route: "/news/all", paths: ["/news/all"] },
  { placement: "page-intelligence", label: "EV Intelligence", route: "/intelligence", paths: ["/intelligence"] },
  { placement: "page-intelligence-dashboard", label: "EV Intelligence · Dashboard", route: "/intelligence/dashboard", paths: ["/intelligence/dashboard"] },
  { placement: "page-vehicles", label: "Vehicles", route: "/vehicles", paths: ["/vehicles"] },
  { placement: "page-business", label: "EV Business", route: "/ev-business", paths: ["/ev-business"] },
  { placement: "page-ecosystem", label: "Ecosystem", route: "/ecosystem", paths: ["/ecosystem"] },
  { placement: "page-energy", label: "Energy", route: "/energy", paths: ["/energy"] },
  { placement: "page-people", label: "People", route: "/people", paths: ["/people"] },
  { placement: "page-people-cxo", label: "People · CXO Voices", route: "/people/cxo-voices", paths: ["/people/cxo-voices"] },
  { placement: "page-startups", label: "Startup Hub", route: "/startups", paths: ["/startups"] },
  { placement: "page-directory", label: "Company Directory", route: "/directory", paths: ["/directory"] },
  { placement: "page-investors", label: "Investors", route: "/investors", paths: ["/investors"] },
  { placement: "page-research", label: "Research", route: "/research", paths: ["/research"] },
  { placement: "page-media", label: "HEV Media", route: "/media", paths: ["/media"] },
  { placement: "page-videos", label: "Media · Videos", route: "/videos", paths: ["/videos"] },
  { placement: "page-podcasts", label: "Media · Podcasts", route: "/podcasts", paths: ["/podcasts"] },
  { placement: "page-magazine", label: "Magazine", route: "/magazine", paths: ["/magazine"] },
  { placement: "page-magazine-archive", label: "Magazine · Issue archive", route: "/magazine/archive", paths: ["/magazine/archive"] },
  { placement: "page-events", label: "Events", route: "/events", paths: ["/events"] },
  { placement: "page-events-calendar", label: "Events · Calendar", route: "/events/calendar", paths: ["/events/calendar"] },
  { placement: "page-b2b", label: "B2B Solutions", route: "/b2b-solutions", paths: ["/b2b-solutions"] },
  { placement: "page-about", label: "About HEV", route: "/about", paths: ["/about"] },
  { placement: "page-awards", label: "Awards", route: "/awards", paths: ["/awards"] },
  { placement: "page-learning", label: "Learning", route: "/learning", paths: ["/learning"] },
  { placement: "page-community", label: "Community", route: "/community", paths: ["/community"] },
  { placement: "page-membership", label: "Membership", route: "/membership", paths: ["/membership"] },
  { placement: "page-jobs", label: "Jobs", route: "/jobs", paths: ["/jobs"] },
  { placement: "page-contact", label: "Contact", route: "/contact", paths: ["/contact"] },
  { placement: "page-newsletter", label: "Newsletter", route: "/newsletter", paths: ["/newsletter"] }
];

export const pagePlacementOptions = sitePages.map(({ placement, label }) => ({ value: placement, label: `${label} · Shared content` }));
export const relatedPageOptions = sitePages.map(({ route, label }) => ({ value: route, label }));

const legacyPlacementMap = {
  "homepage-latest-news": "page-home",
  "homepage-media-spotlight": "page-home",
  "homepage-events": "page-home",
  "news-landing": "page-news",
  "media-landing": "page-media",
  "video-landing": "page-videos",
  "podcast-landing": "page-podcasts",
  "magazine-archive": "page-magazine-archive",
  "people-leadership": "page-people-cxo",
  "events-landing": "page-events-calendar",
  "search-results": "page-news"
};

export function normalizePagePlacements(value) {
  let values = [];
  try { values = Array.isArray(value) ? value : JSON.parse(value || "[]"); } catch { return []; }
  if (!Array.isArray(values)) return [];
  return [...new Set(values.map((item) => legacyPlacementMap[item] || item).filter((item) => sitePages.some((page) => page.placement === item)))];
}

export function getPagePlacement(path) {
  const exactMatch = sitePages.find((page) => page.paths.includes(path));
  if (exactMatch) return exactMatch.placement;
  return sitePages.find((page) => page.paths.some((prefix) => prefix !== "/" && path.startsWith(`${prefix}/`)))?.placement || null;
}
