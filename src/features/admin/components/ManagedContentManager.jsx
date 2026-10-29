import { CstButton } from "../../../components/common/ui-components";

import {Link} from "react-router-dom";
import {useMemo, useState} from "react";
import {ArrowUpRight, FileText, Trash2, Video, Mic2} from "lucide-react";
import {articleCategories, displayDate, readJsonList, websitePlacements} from "../adminUtils";




export default function ManagedContentManager({ kind, items, loading, onEdit, onDelete, canPublish }) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const [access, setAccess] = useState("all");
  const [placement, setPlacement] = useState("all");
  const [featured, setFeatured] = useState("all");
  const [category, setCategory] = useState("all");
  const filteredItems = useMemo(() => {
    const search = query.trim().toLowerCase();
    return items.filter((item) => {
      const haystack = [item.title, item.description, item.personName, item.organization, item.category, item.series, item.tags, item.issueLabel].filter(Boolean).join(" ").toLowerCase();
      return (!search || haystack.includes(search))
        && (status === "all" || item.status === status)
        && (access === "all" || item.accessLevel === access)
        && (placement === "all" || readJsonList(item.placements).includes(placement))
        && (category === "all" || item.category === category)
        && (featured === "all" || Boolean(item.featured) === (featured === "yes"));
    });
  }, [access, category, featured, items, placement, query, status]);
  const title = kind === "cxo" ? "CXO profiles" : kind === "podcast" ? "Podcast episodes" : kind === "video" ? "Videos" : "Magazine issues";
  const currentMagazineId = kind === "magazine" ? filteredItems.find((item) => item.status === "published")?.id : null;
  return <section className="admin-panel-card admin-table-card">
    <div className="admin-panel-head"><div><h2>{kind === "cxo" ? "People" : kind === "magazine" ? "Magazine" : title}</h2><p>{filteredItems.length} of {items.length} item{items.length === 1 ? "" : "s"} in your library</p></div></div>
    <div className="admin-filter-bar"><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={`Search ${kind === "cxo" ? "people, role or company" : "title, person or topic"}`} aria-label={`Search ${title}`}/><select value={category} onChange={(event) => setCategory(event.target.value)}><option value="all">All categories</option>{articleCategories.map((item) => <option key={item} value={item}>{item}</option>)}</select><select value={placement} onChange={(event) => setPlacement(event.target.value)}><option value="all">All website pages</option>{websitePlacements.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select><select value={status} onChange={(event) => setStatus(event.target.value)}><option value="all">All statuses</option><option value="draft">Draft</option><option value="published">Published</option></select><select value={access} onChange={(event) => setAccess(event.target.value)}><option value="all">All access</option><option value="free">Free</option><option value="member">Members</option></select><select value={featured} onChange={(event) => setFeatured(event.target.value)}><option value="all">Featured: all</option><option value="yes">Featured only</option><option value="no">Not featured</option></select></div>
    {loading ? <div className="admin-empty"><span className="admin-spinner"/>Loading content…</div> :
      filteredItems.length === 0 ? <div className="admin-empty"><FileText size={24}/><p>{items.length ? "No content matches these filters." : `No ${title.toLowerCase()} yet. Add one to get started.`}</p></div> :
      kind === "podcast" || kind === "video"
        ? <div className="admin-media-library">{filteredItems.map((item) => <article className="admin-media-library-card" key={item.id}>
          <div className="admin-media-library-image">
            {item.image ? <img src={item.image} alt="" loading="lazy"/> : kind === "podcast" ? <Mic2 size={26}/> : <Video size={26}/>}
            <span className={`admin-status ${item.status}`}>{item.status}</span>
          </div>
          <div className="admin-media-library-body">
            <div className="admin-media-library-meta">
              <span>{kind === "podcast" ? "PODCAST EPISODE" : "VIDEO"}</span>
              <span className={`admin-access-level ${item.accessLevel}`}>{item.accessLevel === "member" ? "Member only" : "Free"}</span>
            </div>
            <h3>{item.title}</h3>
            <p>{item.description}</p>
            <small>{kind === "podcast" ? [item.personName, item.duration].filter(Boolean).join(" · ") || "No guest details" : item.personName || "No presenter details"}</small>
            <span className="admin-media-library-file">{item.mediaUrl?.startsWith("/media/") ? "Uploaded media file" : item.mediaUrl ? "External media link" : "No media attached"}</span>
          </div>
          <div className="admin-media-library-actions">
            {item.status === "published" && <Link to={kind === "video" ? "/videos" : "/podcasts"} target="_blank" aria-label={`View ${item.title}`} title="View published content"><ArrowUpRight size={15}/></Link>}
            {(canPublish || item.status !== "published") && <CstButton onClick={() => onEdit(item)} aria-label={`Edit ${item.title}`} title="Edit item"><FileText size={15}/></CstButton>}
            {canPublish && <CstButton className="danger" onClick={() => onDelete(item)} aria-label={`Delete ${item.title}`} title="Delete item"><Trash2 size={15}/></CstButton>}
          </div>
        </article>)}</div>
        : <div className="admin-table-wrap"><table className="admin-table">
          <thead><tr><th>Title</th>{kind === "cxo" && <th>Executive</th>}{kind === "magazine" && <th>Issue</th>}{kind === "podcast" && <th>Guest / host</th>}{kind === "video" && <th>Video URL</th>}<th>Access</th><th>Status</th><th>Last updated</th><th><span className="sr-only">Actions</span></th></tr></thead>
          <tbody>{filteredItems.map((item) =>
            <tr key={item.id}>
              <td><div className="admin-article-title"><strong>{item.title}</strong><span>{item.description}</span>{item.id === currentMagazineId && <span className="admin-current-issue">Current issue on website</span>}</div></td>
              {kind === "cxo" && <td><div className="admin-article-title"><strong>{item.personName}</strong><span>{item.role} · {item.organization}</span></div></td>}
              {kind === "magazine" && <td><span className="admin-category">{item.issueLabel}</span></td>}
              {kind === "podcast" && <td><div className="admin-article-title"><strong>{item.personName || "—"}</strong><span>{item.duration}</span></div></td>}
              {kind === "video" && <td><div className="admin-article-title"><span>{item.mediaUrl}</span></div></td>}
              <td><span className={`admin-access-level ${item.accessLevel}`}>{item.accessLevel === "member" ? "Member only" : "Free"}</span></td>
              <td><span className={`admin-status ${item.status}`}>{item.status}</span></td>
              <td className="admin-date">{displayDate(item.updatedAt)}</td>
              <td><div className="admin-row-actions">
                {item.status === "published" && <Link to={kind === "cxo" ? "/people" : kind === "magazine" ? "/magazine" : kind === "video" ? "/videos" : "/podcasts"} target="_blank" aria-label="View published content" title="View published content"><ArrowUpRight size={15}/></Link>}
                {(canPublish || item.status !== "published") && <CstButton onClick={() => onEdit(item)} aria-label={`Edit ${item.title}`} title="Edit item"><FileText size={15}/></CstButton>}
                {canPublish && <CstButton className="danger" onClick={() => onDelete(item)} aria-label={`Delete ${item.title}`} title="Delete item"><Trash2 size={15}/></CstButton>}
              </div></td>
            </tr>)}</tbody>
        </table></div>}
  </section>;
}
