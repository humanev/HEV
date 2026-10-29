import { CstButton } from "../../../components/common/ui-components";

import {Link} from "react-router-dom";
import {useMemo, useState} from "react";
import {ArrowUpRight, FileText, Trash2} from "lucide-react";



import {articleCategories, displayDate, readJsonList, websitePlacements} from "../adminUtils";

export default function ArticleManager({ articles, loading, onEdit, onDelete, canPublish }) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const [access, setAccess] = useState("all");
  const [placement, setPlacement] = useState("all");
  const categories = useMemo(() => [...new Set([...articleCategories, ...articles.map((article) => article.category).filter(Boolean)])].sort(), [articles]);
  const [category, setCategory] = useState("all");
  const filteredArticles = useMemo(() => {
    const search = query.trim().toLowerCase();
    return articles.filter((article) => {
      const haystack = [article.title, article.excerpt, article.author, article.category].filter(Boolean).join(" ").toLowerCase();
      return (!search || haystack.includes(search))
        && (category === "all" || article.category === category)
        && (status === "all" || article.status === status)
        && (access === "all" || article.accessLevel === access)
        && (placement === "all" || readJsonList(article.placements).includes(placement));
    });
  }, [access, articles, category, placement, query, status]);
  return <section className="admin-panel-card admin-table-card">
    <div className="admin-panel-head"><div><h2>News</h2><p>{filteredArticles.length} of {articles.length} article{articles.length === 1 ? "" : "s"} in your content library</p></div></div>
    <div className="admin-filter-bar"><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search title, author or topic" aria-label="Search news"/><select value={category} onChange={(event) => setCategory(event.target.value)}><option value="all">All topics</option>{categories.map((item) => <option key={item} value={item}>{item}</option>)}</select><select value={placement} onChange={(event) => setPlacement(event.target.value)}><option value="all">All website pages</option>{websitePlacements.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select><select value={status} onChange={(event) => setStatus(event.target.value)}><option value="all">All statuses</option><option value="draft">Draft</option><option value="published">Published</option></select><select value={access} onChange={(event) => setAccess(event.target.value)}><option value="all">All access</option><option value="free">Free</option><option value="member">Members</option></select></div>
    {loading ? <div className="admin-empty"><span className="admin-spinner"/>Loading articles…</div> :
      filteredArticles.length === 0 ? <div className="admin-empty"><FileText size={24}/><p>{articles.length ? "No news matches these filters." : "No articles yet. Create one to get started."}</p></div> :
        <div className="admin-table-wrap"><table className="admin-table">
          <thead><tr><th>Article</th><th>Category</th><th>Access</th><th>Status</th><th>Last updated</th><th><span className="sr-only">Actions</span></th></tr></thead>
          <tbody>{filteredArticles.map((article) =>
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
