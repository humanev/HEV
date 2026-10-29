import { ArrowUpRight, BookOpen, Mic2, Video, Users, CalendarDays } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { SectionTitle, StoryCard, imgFallback, useArticles, useManagedContent, useSiteContent } from "./PageRuntime";
import RelatedPageLinks from "./RelatedPageLinks";
import { normalizePagePlacements, sitePages } from "../../features/navigation/sitePages";

const pagesByPlacement = Object.fromEntries(sitePages.map((page) => [page.placement.replace("page-", ""), page]));

function MediaCard({ item, kind }) {
  const Icon = kind === "video" ? Video : kind === "podcast" ? Mic2 : kind === "magazine" ? BookOpen : Users;
  const destination = kind === "video" ? "/videos" : kind === "podcast" ? "/podcasts" : kind === "magazine" ? "/magazine" : "/people";
  return <article className="assigned-content-card"><img src={item.image || imgFallback} alt="" onError={(event) => { event.currentTarget.src = imgFallback; }}/><div><span className="tag"><Icon size={13}/>{kind}</span><h3>{item.title || item.personName}</h3><p>{item.description || [item.personName, item.role, item.organization].filter(Boolean).join(" · ")}</p><RelatedPageLinks item={item}/><Link to={destination}>Explore <ArrowUpRight size={14}/></Link></div></article>;
}

function isAssigned(item, placement) {
  return normalizePagePlacements(item.placements).includes(placement);
}

function EventCard({ event }) {
  return <article className="assigned-event-card"><CalendarDays size={19}/><span className="tag">{event[3] || "Event"}</span><h3>{event[0]}</h3><p>{[event[1], event[2]].filter(Boolean).join(" · ")}</p><Link to="/events">Event details <ArrowUpRight size={14}/></Link></article>;
}

export default function AssignedPageContent({ page }) {
  const location = useLocation();
  const placement = page ? `page-${page}` : null;
  const { articles } = useArticles(placement);
  const { items: videos } = useManagedContent("video", placement);
  const { items: podcasts } = useManagedContent("podcast", placement);
  const { items: magazines } = useManagedContent("magazine", placement);
  const { items: people } = useManagedContent("cxo", placement);
  const { events = [] } = useSiteContent();
  if (!page) return null;
  const isNewsListing = location.pathname === "/news/all";
  const isCxoVoices = location.pathname === "/people/cxo-voices";
  const isEventCalendar = location.pathname.startsWith("/events/calendar");
  const items = [
    ...articles.filter((item) => isAssigned(item, placement) && !(page === "home" || page === "news-all" || page === "news" && isNewsListing || isCxoVoices)).map((item) => ({ kind: "article", item })),
    ...videos.filter((item) => isAssigned(item, placement) && page !== "media" && page !== "videos" && !isCxoVoices).map((item) => ({ kind: "video", item })),
    ...podcasts.filter((item) => isAssigned(item, placement) && page !== "media" && page !== "podcasts" && !isCxoVoices).map((item) => ({ kind: "podcast", item })),
    ...magazines.filter((item) => isAssigned(item, placement) && page !== "media" && page !== "magazine" && page !== "magazine-archive").map((item) => ({ kind: "magazine", item })),
    ...people.filter((item) => isAssigned(item, placement) && page !== "people" && page !== "people-cxo" && !isCxoVoices).map((item) => ({ kind: "people", item })),
    ...(isEventCalendar ? [] : events.filter((event) => { try { const placements = JSON.parse(event[5] || "[]"); return placements.includes(placement) || page === "events" && !placements.length; } catch { return page === "events"; } }).map((event, index) => ({ kind: "event", item: event, id: index })))
  ];
  if (!items.length) return null;
  const pageDetails = pagesByPlacement[page];
  return <section className="section assigned-page-content"><div className="container"><SectionTitle kicker="SELECTED FOR THIS PAGE" title={`${pageDetails.label} highlights`} link={pageDetails.route}/><div className="assigned-content-grid">{items.map(({ kind, item, id }) => kind === "article" ? <StoryCard key={`${kind}-${item.id}`} story={item}/> : kind === "event" ? <EventCard key={`${kind}-${id}`} event={item}/> : <MediaCard key={`${kind}-${item.id}`} kind={kind} item={item}/>)}</div></div></section>;
}
