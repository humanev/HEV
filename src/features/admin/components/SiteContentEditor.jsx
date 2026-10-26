import { CstButton } from "../../../components/common/ui-components";
import {useEffect, useState} from "react";

import {Check, Plus, Trash2} from "lucide-react";



import {siteContentSections} from "../adminUtils";

export default function SiteContentEditor({ content, onSave }) {
  const [section, setSection] = useState(siteContentSections[0].id);
  const [draft, setDraft] = useState(content[section]);
  const [navigationText, setNavigationText] = useState(JSON.stringify(content.navigation, null, 2));
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [saved, setSaved] = useState(false);
  const selected = siteContentSections.find((item) => item.id === section);

  useEffect(() => {
    setDraft(content[section]);
  }, [content, section]);

  useEffect(() => {
    setNavigationText(JSON.stringify(content.navigation, null, 2));
  }, [content.navigation]);

  function addEntry() {
    if (selected.type === "plans") {
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
    let nextContent = draft;
    if (selected.type === "json") {
      try {
        nextContent = JSON.parse(navigationText);
      } catch {
        setSaveError("Navigation must be valid JSON. Check brackets, quotes, and commas.");
        return;
      }
    }
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
        <div className="admin-site-editor-heading"><div><h3>{selected.label}</h3><p>{selected.description}</p></div>{selected.type !== "json" && selected.type !== "plans" && <CstButton className="admin-button secondary" type="button" onClick={addEntry}><Plus size={15}/> Add item</CstButton>}</div>
        {selected.type === "json"
          ? <label className="admin-site-json-label">Navigation JSON<textarea value={navigationText} onChange={(event) => setNavigationText(event.target.value)} rows="22" spellCheck="false" required/><small>Use simple menu links with a label and internal path (for example, /contact). Dropdown and mega-menu columns are not displayed.</small></label>
          : selected.type === "plans"
            ? <div className="admin-site-items">{draft.map((plan, index) => <article className="admin-site-item" key={`${plan.name}-${index}`}><div className="admin-site-item-head"><strong>Plan {index + 1}</strong></div><label>Plan name (fixed)<input value={plan.name} readOnly/></label><label>Display price<input value={plan.price} onChange={(event) => updateEntry(index, { ...plan, price: event.target.value })} required/><small>Paid tier price must use whole rupees, for example ₹1299. This also updates the server-verified checkout amount.</small></label><label>Description<textarea value={plan.description} onChange={(event) => updateEntry(index, { ...plan, description: event.target.value })} rows="2" required/></label><label>Benefits (one per line)<textarea value={plan.features.join("\n")} onChange={(event) => updateEntry(index, { ...plan, features: event.target.value.split("\n") })} rows="5" required/></label><label className="admin-site-checkbox"><input type="checkbox" checked={Boolean(plan.popular)} onChange={(event) => updateEntry(index, { ...plan, popular: event.target.checked })}/> Show “Most popular” badge</label></article>)}</div>
            : selected.type === "strings"
              ? <div className="admin-site-items">{draft.map((value, index) => <article className="admin-site-item admin-site-string-item" key={`${value}-${index}`}><label>Course title<input value={value} onChange={(event) => updateEntry(index, event.target.value)} required/></label><CstButton type="button" className="admin-delete-link" onClick={() => setDraft((current) => current.filter((_, itemIndex) => itemIndex !== index))}><Trash2 size={14}/> Remove</CstButton></article>)}</div>
              : <div className="admin-site-items">{draft.map((row, index) => <article className="admin-site-item" key={`${row[0]}-${index}`}><div className="admin-site-item-head"><strong>Item {index + 1}</strong><CstButton type="button" className="admin-delete-link" onClick={() => setDraft((current) => current.filter((_, itemIndex) => itemIndex !== index))}><Trash2 size={14}/> Remove</CstButton></div><div className="admin-site-fields">{selected.fields.map((field, fieldIndex) => <label key={field}>{field}<input value={row[fieldIndex] || ""} onChange={(event) => updateEntry(index, [...row, ...Array(Math.max(0, selected.fields.length - row.length)).fill("")].map((value, valueIndex) => valueIndex === fieldIndex ? event.target.value : value))} required={!selected.optionalFields?.includes(fieldIndex)}/></label>)}</div></article>)}</div>}
        {saveError && <div className="admin-alert error" role="alert">{saveError}</div>}
        {saved && <div className="admin-alert success" role="status"><Check size={16}/>Changes saved.</div>}
        <div className="admin-editor-actions"><CstButton className="admin-button primary" type="submit" disabled={saving}><Check size={16}/>{saving ? "Saving…" : "Save changes"}</CstButton></div>
      </form>
    </div>
  </section>;
}
