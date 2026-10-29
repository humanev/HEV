import { CstButton } from "../../../components/common/ui-components";


import {Check} from "lucide-react";

import ImageUploadField from "./ImageUploadField";
import MediaUploadField from "./MediaUploadField";
import PlacementTagPicker from "./PlacementTagPicker";
import {articleCategories, normalizePagePlacements, readJsonList, relatedPageOptions, websitePlacements} from "../adminUtils";


export default function ManagedContentEditor({ kind, item, onChange, onCancel, onSave, canPublish }) {
  const label = kind === "cxo" ? "CXO profile" : kind === "podcast" ? "podcast episode" : kind === "video" ? "video" : "magazine issue";
  function set(field, value) {
    onChange((current) => ({ ...current, [field]: value }));
  }
  const placements = normalizePagePlacements(item.placements);
  const relatedPages = readJsonList(item.relatedContent).filter((value) => relatedPageOptions.some((page) => page.value === value));
  function updateRelatedPages(next) {
    const current = readJsonList(item.relatedContent);
    const legacyReferences = current.filter((value) => !relatedPageOptions.some((page) => page.value === value));
    set("relatedContent", JSON.stringify([...legacyReferences, ...next]));
  }
  return <form className="admin-panel-card admin-article-editor" onSubmit={onSave}>
    <div className="admin-panel-head"><div><h2>{kind === "cxo" ? "Executive profile details" : kind === "podcast" ? "Podcast episode details" : kind === "video" ? "Video details" : "Magazine issue details"}</h2><p>Complete the details below and choose whether to publish this {label}.</p></div></div>
    <div className="admin-editor-grid">
      {kind === "cxo" ? <>
        <label>Executive name<input value={item.personName} onChange={(event) => set("personName", event.target.value)} maxLength="120" required/></label>
        <label>Role / title<input value={item.role} onChange={(event) => set("role", event.target.value)} maxLength="120" placeholder="e.g. Chief Executive Officer" required/></label>
        <label>Company / organisation<input value={item.organization} onChange={(event) => set("organization", event.target.value)} maxLength="160" required/></label>
        <label>Profile headline<input value={item.title} onChange={(event) => set("title", event.target.value)} maxLength="180" required/></label>
      </> : <>
        <label className="span-two">{kind === "podcast" ? "Episode title" : kind === "video" ? "Video title" : "Issue title"}<input value={item.title} onChange={(event) => set("title", event.target.value)} maxLength="180" required/></label>
        {kind === "podcast"
          ? <><label>Guest / host<input value={item.personName} onChange={(event) => set("personName", event.target.value)} maxLength="120" placeholder="Episode guest or host"/></label>
            <label>Episode duration<input value={item.duration} onChange={(event) => set("duration", event.target.value)} maxLength="40" placeholder="e.g. 32 min" required/></label></>
          : kind === "video"
            ? <label>Presenter / channel<input value={item.personName} onChange={(event) => set("personName", event.target.value)} maxLength="120" placeholder="Optional"/></label>
            : <><label>Issue number / label<input value={item.issueLabel} onChange={(event) => set("issueLabel", event.target.value)} maxLength="80" placeholder="e.g. ISSUE 19 · 2026" required/></label>
            <label>Editor / contributor<input value={item.personName} onChange={(event) => set("personName", event.target.value)} maxLength="120" placeholder="Optional"/></label></>}
      </>}
      <label className="span-two">Short description<textarea value={item.description} onChange={(event) => set("description", event.target.value)} maxLength="500" rows="3" required/></label>
      <label className="span-two">{kind === "cxo" ? "Profile / conversation" : kind === "podcast" ? "Episode notes / transcript" : kind === "video" ? "Video notes (optional)" : "Issue overview"}<textarea value={item.body} onChange={(event) => set("body", event.target.value)} maxLength="20000" rows="7" placeholder="Additional details (optional)"/></label>
      <label>Slug<input value={item.slug} onChange={(event) => set("slug", event.target.value.toLowerCase().replace(/[^a-z0-9-]+/g, "-").replace(/^-|-$/g, ""))} maxLength="180" placeholder="Generated from the title"/></label>
      <label>Category<select value={item.category} onChange={(event) => set("category", event.target.value)}>{!articleCategories.includes(item.category) && item.category && <option value={item.category}>{item.category}</option>}<option value="">Choose a category</option>{articleCategories.map((category) => <option value={category} key={category}>{category}</option>)}</select></label>
      <label>Series<input value={item.series} onChange={(event) => set("series", event.target.value)} maxLength="120" placeholder="Optional series or collection"/></label>
      <label>Tags<input value={item.tags} onChange={(event) => set("tags", event.target.value)} maxLength="1000" placeholder="Comma-separated topics"/></label>
      <div className="span-two"><PlacementTagPicker options={websitePlacements} selected={placements} onChange={(next) => set("placements", JSON.stringify(next))}/></div>
      <div className="span-two"><PlacementTagPicker options={relatedPageOptions} selected={relatedPages} onChange={updateRelatedPages} label="Related pages" help="Choose pages by name. Each choice is saved as its site route, such as /events."/></div>
      <ImageUploadField label={kind === "cxo" ? "Portrait image URL" : kind === "podcast" ? "Episode cover image URL" : kind === "video" ? "Video thumbnail image URL" : "Magazine cover image URL"} value={item.image} onChange={(value) => set("image", value)}/>
      {kind === "cxo"
        ? <label className="span-two">Related interview or video URL (optional)<input type="url" value={item.mediaUrl} onChange={(event) => set("mediaUrl", event.target.value)} placeholder="https://…"/></label>
        : <MediaUploadField
          kind={kind}
          label={kind === "video" ? "Video URL or upload" : kind === "podcast" ? "Episode audio/video URL or upload" : "Digital edition URL or PDF upload"}
          value={item.mediaUrl}
          onChange={(value) => set("mediaUrl", value)}
          required={kind === "video"}
        />}
      <label>Content access<select value={item.accessLevel} onChange={(event) => set("accessLevel", event.target.value)}><option value="free">Free for everyone</option><option value="member">Active members only</option></select></label>
      <label>Publication date/time<input type="datetime-local" value={item.publicationAt} onChange={(event) => set("publicationAt", event.target.value)}/></label>
      <label className="admin-checkbox-label"><input type="checkbox" checked={item.featured} onChange={(event) => set("featured", event.target.checked)}/> Featured content</label>
      <label>SEO title<input value={item.seoTitle} onChange={(event) => set("seoTitle", event.target.value)} maxLength="180"/></label>
      <label className="span-two">Meta description<textarea value={item.metaDescription} onChange={(event) => set("metaDescription", event.target.value)} maxLength="320" rows="3"/></label>
      <label className="span-two">Canonical URL<input type="url" value={item.canonicalUrl} onChange={(event) => set("canonicalUrl", event.target.value)} maxLength="2048" placeholder="Optional https:// URL"/></label>
      {canPublish ? <label>Visibility<select value={item.status} onChange={(event) => set("status", event.target.value)}><option value="draft">Draft</option><option value="published">Published</option></select></label> : <label>Visibility<input value="Draft · publisher approval required" readOnly/></label>}
    </div>
    <div className="admin-editor-actions"><CstButton type="button" className="admin-button secondary" onClick={onCancel}>Cancel</CstButton><CstButton className="admin-button primary" type="submit"><Check size={16}/> Save {kind === "cxo" ? "profile" : kind === "podcast" ? "episode" : kind === "video" ? "video" : "issue"}</CstButton></div>
  </form>;
}
