import { CstButton } from "../../../components/common/ui-components";
import {useEffect, useMemo, useState} from "react";

import {Check, Plus, Trash2} from "lucide-react";



import {siteContentSections, websitePlacements} from "../adminUtils";
import PlacementTagPicker from "./PlacementTagPicker";

function EventPlacementPicker({row, onChange}) {
  let selected = row[5] ? [] : ["page-events"];
  try { if (row[5]) selected = JSON.parse(row[5]); } catch { selected = ["page-events"]; }
  const pagePlacements = websitePlacements.filter((item) => item.value.startsWith("page-"));
  return <PlacementTagPicker options={pagePlacements} selected={selected} onChange={onChange} label="Show this event on pages" help="The event stays in the Events list and can also appear in shared page highlights."/>;
}

export default function SiteContentEditor({ content, onSave, initialSection = siteContentSections[0].id }) {
  const [section, setSection] = useState(initialSection);
  const [draft, setDraft] = useState(content[section]);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [saved, setSaved] = useState(false);
  const [query, setQuery] = useState("");
  const selected = siteContentSections.find((item) => item.id === section);
  const visibleDraft = useMemo(() => {
    const search = query.trim().toLowerCase();
    if (!search) return draft.map((value, index) => ({value, index}));
    return draft.map((value, index) => ({value, index})).filter(({value}) => JSON.stringify(value).toLowerCase().includes(search));
  }, [draft, query]);

  useEffect(() => {
    setDraft(content[section]);
  }, [content, section]);

  function addEntry() {
    if (selected.type === "navigation") {
      setDraft((current) => [...current, { label: "", path: "/" }]);
    } else if (selected.type === "plans") {
      setDraft((current) => [...current, { name: "", price: "", description: "", features: [] }]);
    } else if (selected.type === "strings") {
      setDraft((current) => [...current, ""]);
    } else {
      setDraft((current) => [...current, selected.fields.map(() => "")]);
    }
  }

  function updateEntry(index, value) {
    setDraft((current) => current.map((entry, entryIndex) => entryIndex === index ? value : entry));
  }

  async function save(event) {
    event.preventDefault();
    setSaveError("");
    setSaved(false);
    const nextContent = draft;
    setSaving(true);
    try {
      await onSave(section, nextContent);
      setSaved(true);
    } catch (requestError) {
      setSaveError(requestError.message);
    } finally {
      setSaving(false);
    }
  }

  return <section className="admin-panel-card admin-site-content">
    <div className="admin-panel-head"><div><h2>Manage website content</h2><p>Changes are saved to the database and appear on the public site.</p></div></div>
    <div className="admin-site-content-layout">
      <nav className="admin-site-sections" aria-label="Website content sections">
        {siteContentSections.map((item) => <CstButton type="button" className={section === item.id ? "active" : ""} key={item.id} onClick={() => { setSection(item.id); setSaveError(""); setSaved(false); }}>{item.label}</CstButton>)}
      </nav>
      <form className="admin-site-editor" onSubmit={save}>
        <div className="admin-site-editor-heading"><div><h3>{selected.label}</h3><p>{selected.description}</p></div><div className="admin-site-editor-tools"><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={`Find in ${selected.label.toLowerCase()}`} aria-label={`Find in ${selected.label}`}/>{selected.type !== "plans" && <CstButton className="admin-button secondary" type="button" onClick={addEntry}><Plus size={15}/> Add item</CstButton>}</div></div>
        {selected.type === "navigation"
          ? <div className="admin-site-items">{visibleDraft.map(({value: item, index}) => <article className="admin-site-item" key={`${item.label}-${index}`}><div className="admin-site-item-head"><strong>Menu item {index + 1}</strong><CstButton type="button" className="admin-delete-link" onClick={() => setDraft((current) => current.filter((_, itemIndex) => itemIndex !== index))}><Trash2 size={14}/> Remove</CstButton></div><div className="admin-site-fields"><label>Website section name<input value={item.label || ""} onChange={(event) => updateEntry(index, { ...item, label: event.target.value })} maxLength="60" required placeholder="Example: News"/></label><label>Page destination<input value={item.path || ""} onChange={(event) => updateEntry(index, { ...item, path: event.target.value })} maxLength="180" required placeholder="Example: /news"/></label></div></article>)}</div>
          : selected.type === "plans"
            ? <div className="admin-site-items">{visibleDraft.map(({value: plan, index}) => <article className="admin-site-item" key={`${plan.name}-${index}`}><div className="admin-site-item-head"><strong>Plan {index + 1}</strong></div><label>Plan name (fixed)<input value={plan.name} readOnly/></label><label>Display price<input value={plan.price} onChange={(event) => updateEntry(index, { ...plan, price: event.target.value })} required/><small>Paid tier price must use whole rupees, for example ₹1299. This also updates the server-verified checkout amount.</small></label><label>Description<textarea value={plan.description} onChange={(event) => updateEntry(index, { ...plan, description: event.target.value })} rows="2" required/></label><label>Benefits (one per line)<textarea value={plan.features.join("\n")} onChange={(event) => updateEntry(index, { ...plan, features: event.target.value.split("\n") })} rows="5" required/></label><label className="admin-site-checkbox"><input type="checkbox" checked={Boolean(plan.popular)} onChange={(event) => updateEntry(index, { ...plan, popular: event.target.checked })}/> Show “Most popular” badge</label></article>)}</div>
            : selected.type === "strings"
              ? <div className="admin-site-items">{visibleDraft.map(({value, index}) => <article className="admin-site-item admin-site-string-item" key={`${value}-${index}`}><label>Course title<input value={value} onChange={(event) => updateEntry(index, event.target.value)} required/></label><CstButton type="button" className="admin-delete-link" onClick={() => setDraft((current) => current.filter((_, itemIndex) => itemIndex !== index))}><Trash2 size={14}/> Remove</CstButton></article>)}</div>
              : <div className="admin-site-items">{visibleDraft.map(({value: row, index}) => <article className="admin-site-item" key={`${row[0]}-${index}`}><div className="admin-site-item-head"><strong>Item {index + 1}</strong><CstButton type="button" className="admin-delete-link" onClick={() => setDraft((current) => current.filter((_, itemIndex) => itemIndex !== index))}><Trash2 size={14}/> Remove</CstButton></div><div className="admin-site-fields">{selected.fields.map((field, fieldIndex) => selected.id === "events" && fieldIndex === 5 ? <EventPlacementPicker key={field} row={row} onChange={(placements) => updateEntry(index, [...row.slice(0, 5), JSON.stringify(placements)])}/> : <label key={field}>{field}<input value={row[fieldIndex] || ""} onChange={(event) => updateEntry(index, [...row, ...Array(Math.max(0, selected.fields.length - row.length)).fill("")].map((value, valueIndex) => valueIndex === fieldIndex ? event.target.value : value))} required={!selected.optionalFields?.includes(fieldIndex)}/></label>)}</div></article>)}</div>}
        {saveError && <div className="admin-alert error" role="alert">{saveError}</div>}
        {saved && <div className="admin-alert success" role="status"><Check size={16}/>Changes saved.</div>}
        <div className="admin-editor-actions"><CstButton className="admin-button primary" type="submit" disabled={saving}><Check size={16}/>{saving ? "Saving…" : "Save changes"}</CstButton></div>
      </form>
    </div>
  </section>;
}
