import { CstButton } from "../../../components/common/ui-components";

import {Link} from "react-router-dom";
import {ArrowUpRight, FileText, Trash2} from "lucide-react";



import {displayDate} from "../adminUtils";

export default function ArticleManager({ articles, loading, onEdit, onDelete, canPublish }) {
  return <section className="admin-panel-card admin-table-card">
    <div className="admin-panel-head"><div><h2>Newsroom articles</h2><p>{articles.length} article{articles.length === 1 ? "" : "s"} in your content library</p></div></div>
    {loading ? <div className="admin-empty"><span className="admin-spinner"/>Loading articles…</div> :
      articles.length === 0 ? <div className="admin-empty"><FileText size={24}/><p>No articles yet. Create one to get started.</p></div> :
        <div className="admin-table-wrap"><table className="admin-table">
          <thead><tr><th>Article</th><th>Category</th><th>Access</th><th>Status</th><th>Last updated</th><th><span className="sr-only">Actions</span></th></tr></thead>
          <tbody>{articles.map((article) =>
            <tr key={article.id}>
              <td><div className="admin-article-title"><strong>{article.title}</strong><span>{article.author}</span></div></td>
              <td><span className="admin-category">{article.category}</span></td>
              <td><span className={`admin-access-level ${article.accessLevel}`}>{article.accessLevel === "member" ? "Member only" : "Free"}</span></td>
              <td><span className={`admin-status ${article.status}`}>{article.status}</span></td>
              <td className="admin-date">{displayDate(article.updatedAt)}</td>
              <td><div className="admin-row-actions">
                {article.status === "published" && <Link to={`/news/${article.id}`} target="_blank" aria-label="View article" title="View article"><ArrowUpRight size={15}/></Link>}
                {(canPublish || article.status !== "published") && <CstButton onClick={() => onEdit(article)} aria-label={`Edit ${article.title}`} title="Edit article"><FileText size={15}/></CstButton>}
                {canPublish && <CstButton className="danger" onClick={() => onDelete(article)} aria-label={`Delete ${article.title}`} title="Delete article"><Trash2 size={15}/></CstButton>}
              </div></td>
            </tr>)}</tbody>
        </table></div>}
  </section>;
}
