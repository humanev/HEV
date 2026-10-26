import { CstButton } from "../../../components/common/ui-components";

import {Link} from "react-router-dom";
import {ArrowUpRight, FileText, Trash2, Video, Mic2} from "lucide-react";




export default function ManagedContentManager({ kind, items, loading, onEdit, onDelete, canPublish }) {
  const title = kind === "cxo" ? "CXO profiles" : kind === "podcast" ? "Podcast episodes" : kind === "video" ? "Videos" : "Magazine issues";
  const currentMagazineId = kind === "magazine" ? items.find((item) => item.status === "published")?.id : null;
  return <section className="admin-panel-card admin-table-card">
    <div className="admin-panel-head"><div><h2>{title}</h2><p>{items.length} item{items.length === 1 ? "" : "s"} in your library</p></div></div>
    {loading ? <div className="admin-empty"><span className="admin-spinner"/>Loading content…</div> :
      items.length === 0 ? <div className="admin-empty"><FileText size={24}/><p>No {title.toLowerCase()} yet. Add one to get started.</p></div> :
      kind === "podcast" || kind === "video"
        ? <div className="admin-media-library">{items.map((item) => <article className="admin-media-library-card" key={item.id}>
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
          <tbody>{items.map((item) =>
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
