import { useMemo, useState } from "react";
import { FileText, Mic2, Video, BookOpen, Users, CalendarDays, Search, SlidersHorizontal } from "lucide-react";
import { CstButton } from "../../../components/common/ui-components";
import { displayDate, normalizePagePlacements, readJsonList, websitePlacements } from "../adminUtils";

const types = [
  ["article", "Articles", FileText], ["podcast", "Podcasts", Mic2], ["video", "Videos", Video], ["event", "Events", CalendarDays],
  ["magazine", "Magazine", BookOpen], ["cxo", "People", Users]
];

export default function ContentLibrary({ articles, managedContent, events = [], loading, onEditArticle, onEditContent, onEditEvent, onDeleteArticle, onDeleteContent, canPublish }) {
  const [query, setQuery] = useState("");
  const [type, setType] = useState("all");
  const [status, setStatus] = useState("all");
  const [placement, setPlacement] = useState("all");
  const [access, setAccess] = useState("all");
  const allItems = useMemo(() => [
    ...articles.map((item) => ({ ...item, contentType: "article", typeLabel: "Article", onEdit: onEditArticle, onDelete: onDeleteArticle })),
    ...events.map((event, index) => {
      let placements = [];
      try { placements = JSON.parse(event[5] || "[]"); } catch { placements = []; }
      if (!placements.length) placements = ["page-events"];
      return { id: `event-${index}`, kind: "event", contentType: "event", typeLabel: "Event", title: event[0], description: [event[1], event[2], event[3]].filter(Boolean).join(" · "), placements: JSON.stringify(placements), status: "published", accessLevel: "free", onEdit: onEditEvent, canDelete: false };
    }),
    ...Object.entries(managedContent).flatMap(([kind, items]) => items.map((item) => ({ ...item, contentType: kind, typeLabel: types.find(([id]) => id === kind)?.[1] || kind, onEdit: onEditContent, onDelete: onDeleteContent })))
  ], [articles, managedContent, events, onEditArticle, onEditEvent, onEditContent, onDeleteArticle, onDeleteContent]);
  const filtered = useMemo(() => {
    const search = query.trim().toLowerCase();
    return allItems.filter((item) => {
      const haystack = [item.title, item.excerpt, item.description, item.author, item.personName, item.category, item.tags, item.role, item.organization].filter(Boolean).join(" ").toLowerCase();
      return (!search || haystack.includes(search)) && (type === "all" || item.contentType === type)
        && (status === "all" || item.status === status) && (access === "all" || item.accessLevel === access)
        && (placement === "all" || readJsonList(item.placements).includes(placement));
    }).sort((a, b) => new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0));
  }, [allItems, query, type, status, access, placement]);
  const counts = useMemo(() => Object.fromEntries([["all", allItems.length], ...types.map(([id]) => [id, allItems.filter((item) => item.contentType === id).length])]), [allItems]);
  return <section className="admin-library">
    <div className="admin-library-intro"><div><span className="admin-overline">ONE LIBRARY · MANY PAGES</span><h2>Everything you publish, in one place.</h2><p>Organize stories and media, then place the same item on every page where it belongs.</p></div><div className="admin-library-total"><strong>{allItems.length}</strong><span>content items</span></div></div>
    <div className="admin-library-types" role="tablist" aria-label="Content types">
      <button type="button" className={type === "all" ? "active" : ""} onClick={() => setType("all")}>All content <span>{counts.all}</span></button>
      {types.map(([id, label, Icon]) => <button type="button" role="tab" aria-selected={type === id} className={type === id ? "active" : ""} key={id} onClick={() => setType(id)}><Icon size={15}/>{label}<span>{counts[id]}</span></button>)}
    </div>
    <div className="admin-library-toolbar"><label className="admin-library-search"><Search size={17}/><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search titles, people, topics…" aria-label="Search all content"/></label><div className="admin-library-filters"><SlidersHorizontal size={16}/><select aria-label="Filter by page placement" value={placement} onChange={(event) => setPlacement(event.target.value)}><option value="all">All website pages</option>{websitePlacements.map((item) => <option value={item.value} key={item.value}>{item.label}</option>)}</select><select aria-label="Filter by status" value={status} onChange={(event) => setStatus(event.target.value)}><option value="all">Any status</option><option value="published">Published</option><option value="draft">Draft</option></select><select aria-label="Filter by access" value={access} onChange={(event) => setAccess(event.target.value)}><option value="all">Any access</option><option value="free">Free</option><option value="member">Members</option></select></div></div>
    {loading ? <div className="admin-empty"><span className="admin-spinner"/>Loading your content…</div> : filtered.length ? <div className="admin-library-list">{filtered.map((item) => {
      const Icon = types.find(([id]) => id === item.contentType)?.[2] || FileText;
      const assigned = normalizePagePlacements(item.placements);
      return <article className="admin-library-item" key={`${item.contentType}-${item.id}`}><div className="admin-library-icon"><Icon size={18}/></div><div className="admin-library-main"><div className="admin-library-meta"><span>{item.typeLabel}</span><span className={`admin-status ${item.status}`}>{item.status}</span></div><h3>{item.title || item.personName}</h3><p>{item.description || item.excerpt || [item.personName, item.role, item.organization].filter(Boolean).join(" · ") || "No description"}</p><div className="admin-library-placements">{assigned.length ? assigned.map((value) => <span key={value}>{websitePlacements.find((place) => place.value === value)?.label || value}</span>) : <span className="unassigned">Not placed on a page</span>}</div></div><div className="admin-library-side"><span className={`admin-access-level ${item.accessLevel}`}>{item.accessLevel === "member" ? "Members" : "Free"}</span><small>{item.updatedAt ? displayDate(item.updatedAt) : "Page controls"}</small></div><div className="admin-library-actions"><CstButton onClick={() => item.onEdit(item)} aria-label={`Edit ${item.title}`}>Edit</CstButton>{canPublish && item.canDelete !== false && <CstButton className="danger" onClick={() => item.onDelete(item)} aria-label={`Delete ${item.title}`}>Delete</CstButton>}</div></article>;
    })}</div> : <div className="admin-empty"><FileText size={25}/><p>{allItems.length ? "No content matches these filters." : "Your content library is ready. Add your first story or media item."}</p></div>}
  </section>;
}
