import { CstButton } from "../../../components/common/ui-components";


import {Check} from "lucide-react";



import ImageUploadField from "./ImageUploadField";


export default function ArticleEditor({ article, onChange, onCancel, onSave, canPublish }) {
  function set(field, value) {
    onChange((current) => ({ ...current, [field]: value }));
  }
  return <form className="admin-panel-card admin-article-editor" onSubmit={onSave}>
    <div className="admin-panel-head"><div><h2>Article details</h2><p>Fill in the story details and choose whether to publish it.</p></div></div>
    <div className="admin-editor-grid">
      <label>Headline<input value={article.title} onChange={(event) => set("title", event.target.value)} maxLength="180" required/></label>
      <label>Category<input value={article.category} onChange={(event) => set("category", event.target.value)} maxLength="60" required/></label>
      <label>Author<input value={article.author} onChange={(event) => set("author", event.target.value)} maxLength="100" required/></label>
      <label>Reading time<input value={article.readTime} onChange={(event) => set("readTime", event.target.value)} maxLength="40" required/></label>
      <label className="span-two">Summary<textarea value={article.excerpt} onChange={(event) => set("excerpt", event.target.value)} maxLength="500" rows="3" required/></label>
      <label className="span-two">Article body<textarea value={article.body} onChange={(event) => set("body", event.target.value)} maxLength="20000" rows="9" required/></label>
      <ImageUploadField label="Cover image URL" value={article.image} onChange={(value) => set("image", value)}/>
      <label>Content access<select value={article.accessLevel} onChange={(event) => set("accessLevel", event.target.value)}><option value="free">Free for everyone</option><option value="member">Active members only</option></select></label>
      {canPublish ? <label>Visibility<select value={article.status} onChange={(event) => set("status", event.target.value)}><option value="draft">Draft</option><option value="published">Published</option></select></label> : <label>Visibility<input value="Draft · publisher approval required" readOnly/></label>}
    </div>
    <div className="admin-editor-actions"><CstButton type="button" className="admin-button secondary" onClick={onCancel}>Cancel</CstButton><CstButton className="admin-button primary" type="submit"><Check size={16}/> Save article</CstButton></div>
  </form>;
}
