export const sitePages = [
  { placement: "page-home", label: "Home", route: "/", paths: ["/"] },
  { placement: "page-news", label: "News", route: "/news", paths: ["/news"] },
  { placement: "page-intelligence", label: "EV Intelligence", route: "/intelligence", paths: ["/intelligence"] },
  { placement: "page-vehicles", label: "Vehicles", route: "/vehicles", paths: ["/vehicles"] },
  { placement: "page-business", label: "EV Business", route: "/ev-business", paths: ["/ev-business"] },
  { placement: "page-energy", label: "Energy", route: "/energy", paths: ["/energy"] },
  { placement: "page-people", label: "People", route: "/people", paths: ["/people"] },
  { placement: "page-media", label: "HEV Media", route: "/media", paths: ["/media", "/videos", "/podcasts", "/magazine"] },
  { placement: "page-events", label: "Events", route: "/events", paths: ["/events"] },
  { placement: "page-b2b", label: "B2B Solutions", route: "/b2b-solutions", paths: ["/b2b-solutions"] }
];

export const pagePlacementOptions = sitePages.map(({ placement, label }) => ({ value: placement, label: `${label} · Shared content` }));
export const relatedPageOptions = sitePages.map(({ route, label }) => ({ value: route, label }));

const legacyPlacementMap = {
  "homepage-latest-news": "page-home",
  "homepage-media-spotlight": "page-home",
  "homepage-events": "page-home",
  "news-landing": "page-news",
  "media-landing": "page-media",
  "video-landing": "page-media",
  "podcast-landing": "page-media",
  "magazine-archive": "page-media",
  "people-leadership": "page-people",
  "events-landing": "page-events",
  "search-results": "page-news"
};

export function normalizePagePlacements(value) {
  let values = [];
  try { values = Array.isArray(value) ? value : JSON.parse(value || "[]"); } catch { return []; }
  if (!Array.isArray(values)) return [];
  return [...new Set(values.map((item) => legacyPlacementMap[item] || item).filter((item) => sitePages.some((page) => page.placement === item)))];
}

export function getPagePlacement(path) {
  return sitePages.find((page) => page.paths.some((prefix) => prefix === "/" ? path === "/" : path === prefix || path.startsWith(`${prefix}/`)))?.placement || null;
}
