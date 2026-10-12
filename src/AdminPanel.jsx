import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  Activity, ArrowLeft, ArrowUpRight, BarChart3, Check, ChevronDown, FileText,
  Inbox, LogOut, Mail, Menu, Mic2, Plus, Search, Settings, ShieldCheck, Trash2,
  Users, X, BookOpen, Video
} from "lucide-react";
import { apiRequest, ApiError } from "./api";
import "./admin.css";

const emptyArticle = {
  category: "MARKET",
  title: "",
  excerpt: "",
  body: "",
  author: "Editorial Desk",
  readTime: "5 min read",
  image: "",
  status: "draft",
  accessLevel: "free"
};

const managedTypes = {
  podcasts: { kind: "podcast", label: "Podcasts", icon: Mic2 },
  videos: { kind: "video", label: "Videos", icon: Video },
  magazine: { kind: "magazine", label: "Magazine", icon: BookOpen },
  cxos: { kind: "cxo", label: "CXO profiles", icon: Users }
};

function emptyManagedContent(kind) {
  return {
    title: "",
    description: "",
    body: "",
    personName: "",
    role: "",
    organization: "",
    duration: "",
    issueLabel: "",
    image: "",
    mediaUrl: "",
    status: "draft",
    accessLevel: "free",
    kind
  };
}

const tabs = [
  { id: "overview", label: "Overview", icon: BarChart3 },
  { id: "site-content", label: "Website content", icon: Settings },
  { id: "articles", label: "News", icon: FileText },
  { id: "podcasts", ...managedTypes.podcasts },
  { id: "videos", ...managedTypes.videos },
  { id: "magazine", ...managedTypes.magazine },
  { id: "cxos", ...managedTypes.cxos },
  { id: "newsletter", label: "Newsletter", icon: Mail },
  { id: "enquiries", label: "Enquiries", icon: Inbox }
];

const siteContentSections = [
  { id: "navigation", label: "Navigation menu", description: "Edit the main desktop and mobile menu, including dropdown links.", type: "json" },
  { id: "homeStats", label: "Home page stats", description: "Numbers displayed in the home-page market dashboard.", fields: ["Label", "Value", "Change"] },
  { id: "directory", label: "Company directory", description: "Companies shown in the Startup Hub and company directory.", fields: ["Company", "Sector", "Location", "Stage"] },
  { id: "events", label: "Events", description: "Upcoming events shown on the events page. Imported event entries may also include an external source link.", fields: ["Event name", "Location", "Date", "Type", "Source / registration URL"], optionalFields: [4] },
  { id: "reports", label: "Research reports", description: "Report cards shown in Intelligence and Research.", fields: ["Report title", "Category", "Access label"] },
  { id: "plans", label: "Membership plans", description: "Plan names, display prices, descriptions, and listed benefits.", type: "plans" },
  { id: "dashboardData", label: "Dashboard metrics", description: "Metric cards shown on the intelligence dashboard.", fields: ["Metric", "Value", "Change"] },
  { id: "investorDeals", label: "Investor deals", description: "Funding headlines and amounts shown in Investors Hub.", fields: ["Deal headline", "Amount", "Date label"] },
  { id: "peopleVoices", label: "People highlights", description: "Featured executive-conversation cards on the People page.", fields: ["Role", "Initials", "Headline"] },
  { id: "learningCourses", label: "Learning courses", description: "Course titles shown in the Learning Centre.", type: "strings" },
  { id: "communityFeatures", label: "Community features", description: "Feature cards shown on the Community page.", fields: ["Feature name", "Description"] },
  { id: "homeCapabilities", label: "Home page feature cards", description: "Capability cards displayed on the home page. Icons: FileText, Users, Building2, Sparkles.", fields: ["Card title", "Description", "Internal link", "Icon"] }
];

function displayDate(value) {
  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(`${value.replace(" ", "T")}Z`));
}

function ImageUploadField({ label, value, onChange }) {
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");

  async function uploadImage(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    const formData = new FormData();
    formData.append("image", file);
    setUploading(true);
    setUploadError("");
    try {
      const result = await apiRequest("/api/admin/uploads/images", {
        method: "POST",
        body: formData
      });
      onChange(result.image.url);
    } catch (requestError) {
      setUploadError(requestError.message);
    } finally {
      setUploading(false);
      event.target.value = "";
    }
  }

  return <label className="span-two admin-image-field">{label}
    <input type="text" inputMode="url" value={value} onChange={(event) => onChange(event.target.value)} placeholder="Paste an image URL or upload a file" required/>
    <span className="admin-image-upload-row">
      <input type="file" accept="image/jpeg,image/png,image/webp,image/gif" onChange={uploadImage} disabled={uploading} aria-label={`Upload ${label.toLowerCase()}`}/>
      <span>{uploading ? "Uploading image…" : "JPEG, PNG, WebP or GIF · max 5 MB"}</span>
    </span>
    {uploadError && <span className="admin-image-upload-error" role="alert">{uploadError}</span>}
    {value && <img className="admin-image-preview" src={value} alt="Selected image preview"/>}
  </label>;
}

function SiteContentEditor({ content, onSave }) {
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
        {siteContentSections.map((item) => <button type="button" className={section === item.id ? "active" : ""} key={item.id} onClick={() => { setSection(item.id); setSaveError(""); setSaved(false); }}>{item.label}</button>)}
      </nav>
      <form className="admin-site-editor" onSubmit={save}>
        <div className="admin-site-editor-heading"><div><h3>{selected.label}</h3><p>{selected.description}</p></div>{selected.type !== "json" && selected.type !== "plans" && <button className="admin-button secondary" type="button" onClick={addEntry}><Plus size={15}/> Add item</button>}</div>
        {selected.type === "json"
          ? <label className="admin-site-json-label">Navigation JSON<textarea value={navigationText} onChange={(event) => setNavigationText(event.target.value)} rows="22" spellCheck="false" required/><small>Use simple menu links with a label and internal path (for example, /contact). Dropdown and mega-menu columns are not displayed.</small></label>
          : selected.type === "plans"
            ? <div className="admin-site-items">{draft.map((plan, index) => <article className="admin-site-item" key={`${plan.name}-${index}`}><div className="admin-site-item-head"><strong>Plan {index + 1}</strong></div><label>Plan name (fixed)<input value={plan.name} readOnly/></label><label>Display price<input value={plan.price} onChange={(event) => updateEntry(index, { ...plan, price: event.target.value })} required/><small>Paid tier price must use whole rupees, for example ₹1299. This also updates the server-verified checkout amount.</small></label><label>Description<textarea value={plan.description} onChange={(event) => updateEntry(index, { ...plan, description: event.target.value })} rows="2" required/></label><label>Benefits (one per line)<textarea value={plan.features.join("\n")} onChange={(event) => updateEntry(index, { ...plan, features: event.target.value.split("\n") })} rows="5" required/></label><label className="admin-site-checkbox"><input type="checkbox" checked={Boolean(plan.popular)} onChange={(event) => updateEntry(index, { ...plan, popular: event.target.checked })}/> Show “Most popular” badge</label></article>)}</div>
            : selected.type === "strings"
              ? <div className="admin-site-items">{draft.map((value, index) => <article className="admin-site-item admin-site-string-item" key={`${value}-${index}`}><label>Course title<input value={value} onChange={(event) => updateEntry(index, event.target.value)} required/></label><button type="button" className="admin-delete-link" onClick={() => setDraft((current) => current.filter((_, itemIndex) => itemIndex !== index))}><Trash2 size={14}/> Remove</button></article>)}</div>
              : <div className="admin-site-items">{draft.map((row, index) => <article className="admin-site-item" key={`${row[0]}-${index}`}><div className="admin-site-item-head"><strong>Item {index + 1}</strong><button type="button" className="admin-delete-link" onClick={() => setDraft((current) => current.filter((_, itemIndex) => itemIndex !== index))}><Trash2 size={14}/> Remove</button></div><div className="admin-site-fields">{selected.fields.map((field, fieldIndex) => <label key={field}>{field}<input value={row[fieldIndex] || ""} onChange={(event) => updateEntry(index, [...row, ...Array(Math.max(0, selected.fields.length - row.length)).fill("")].map((value, valueIndex) => valueIndex === fieldIndex ? event.target.value : value))} required={!selected.optionalFields?.includes(fieldIndex)}/></label>)}</div></article>)}</div>}
        {saveError && <div className="admin-alert error" role="alert">{saveError}</div>}
        {saved && <div className="admin-alert success" role="status"><Check size={16}/>Changes saved.</div>}
        <div className="admin-editor-actions"><button className="admin-button primary" type="submit" disabled={saving}><Check size={16}/>{saving ? "Saving…" : "Save changes"}</button></div>
      </form>
    </div>
  </section>;
}

function AdminPanel({ onSiteContentChange }) {
  const [user, setUser] = useState(null);
  const [checkingSession, setCheckingSession] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");
  const [summary, setSummary] = useState(null);
  const [articles, setArticles] = useState([]);
  const [managedContent, setManagedContent] = useState({ podcast: [], video: [], magazine: [], cxo: [] });
  const [siteContent, setSiteContent] = useState(null);
  const [enquiries, setEnquiries] = useState([]);
  const [subscribers, setSubscribers] = useState([]);
  const [loadingData, setLoadingData] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [editingArticle, setEditingArticle] = useState(null);
  const [articleForm, setArticleForm] = useState(emptyArticle);
  const [editingContent, setEditingContent] = useState(null);
  const [contentForm, setContentForm] = useState(emptyManagedContent("podcast"));
  const [query, setQuery] = useState("");
  const [enquiryFilter, setEnquiryFilter] = useState("all");

  async function loadData() {
    setLoadingData(true);
    setError("");
    try {
      const [summaryResult, articleResult, enquiryResult, podcastResult, videoResult, magazineResult, cxoResult, siteContentResult, subscriberResult] = await Promise.all([
        apiRequest("/api/admin/summary"),
        apiRequest("/api/admin/articles"),
        apiRequest("/api/admin/enquiries"),
        apiRequest("/api/admin/content/podcast"),
        apiRequest("/api/admin/content/video"),
        apiRequest("/api/admin/content/magazine"),
        apiRequest("/api/admin/content/cxo"),
        apiRequest("/api/admin/site-content"),
        apiRequest("/api/admin/newsletter-subscribers")
      ]);
      setSummary(summaryResult);
      setArticles(articleResult.articles);
      setEnquiries(enquiryResult.enquiries);
      setManagedContent({
        podcast: podcastResult.items,
        video: videoResult.items,
        magazine: magazineResult.items,
        cxo: cxoResult.items
      });
      setSiteContent(siteContentResult.content);
      setSubscribers(subscriberResult.subscribers);
    } catch (requestError) {
      setError(requestError.message);
      if (requestError instanceof ApiError && requestError.status === 401) setUser(null);
    } finally {
      setLoadingData(false);
    }
  }

  useEffect(() => {
    let mounted = true;
    apiRequest("/api/admin/session")
      .then(({ user: currentUser }) => {
        if (!mounted) return;
        setUser(currentUser);
        return loadData();
      })
      .catch((requestError) => {
        if (!mounted) return;
        if (!(requestError instanceof ApiError && requestError.status === 401)) {
          setError(requestError.message);
        }
      })
      .finally(() => {
        if (mounted) setCheckingSession(false);
      });
    return () => { mounted = false; };
  }, []);

  const filteredEnquiries = useMemo(() => enquiries.filter((enquiry) => {
    const matchesStatus = enquiryFilter === "all" || enquiry.status === enquiryFilter;
    const search = query.trim().toLowerCase();
    const matchesQuery = !search || [enquiry.name, enquiry.email, enquiry.company, enquiry.type, enquiry.message]
      .some((value) => value.toLowerCase().includes(search));
    return matchesStatus && matchesQuery;
  }), [enquiries, enquiryFilter, query]);

  async function login(event) {
    event.preventDefault();
    setError("");
    const form = new FormData(event.currentTarget);
    try {
      const result = await apiRequest("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({
          email: form.get("email"),
          password: form.get("password")
        })
      });
      setUser(result.user);
      await loadData();
    } catch (requestError) {
      setError(requestError.message);
    }
  }

  async function logout() {
    setError("");
    try {
      await apiRequest("/api/auth/logout", { method: "POST" });
      setUser(null);
      setSummary(null);
      setArticles([]);
      setEnquiries([]);
      setManagedContent({ podcast: [], magazine: [], cxo: [] });
    } catch (requestError) {
      setError(requestError.message);
    }
  }

  function beginArticleEdit(article) {
    setEditingArticle(article.id);
    setArticleForm({
      category: article.category,
      title: article.title,
      excerpt: article.excerpt,
      body: article.body,
      author: article.author,
      readTime: article.readTime,
      image: article.image,
      status: article.status,
      accessLevel: article.accessLevel
    });
    setError("");
    setSuccess("");
  }

  function beginArticleCreate() {
    setEditingArticle("new");
    setArticleForm(emptyArticle);
    setError("");
    setSuccess("");
  }

  async function saveArticle(event) {
    event.preventDefault();
    setError("");
    setSuccess("");
    try {
      await apiRequest(
        editingArticle === "new" ? "/api/admin/articles" : `/api/admin/articles/${editingArticle}`,
        {
          method: editingArticle === "new" ? "POST" : "PUT",
          body: JSON.stringify(articleForm)
        }
      );
      setSuccess(editingArticle === "new" ? "Article created." : "Article changes saved.");
      setEditingArticle(null);
      await loadData();
    } catch (requestError) {
      setError(requestError.message);
    }
  }

  async function deleteArticle(article) {
    if (!window.confirm(`Delete "${article.title}"? This cannot be undone.`)) return;
    setError("");
    setSuccess("");
    try {
      await apiRequest(`/api/admin/articles/${article.id}`, { method: "DELETE" });
      setSuccess("Article deleted.");
      await loadData();
    } catch (requestError) {
      setError(requestError.message);
    }
  }

  function beginContentCreate(kind) {
    setEditingContent({ kind, id: "new" });
    setContentForm(emptyManagedContent(kind));
    setError("");
    setSuccess("");
  }

  function beginContentEdit(item) {
    setEditingContent({ kind: item.kind, id: item.id });
    setContentForm({
      title: item.title,
      description: item.description,
      body: item.body,
      personName: item.personName,
      role: item.role,
      organization: item.organization,
      duration: item.duration,
      issueLabel: item.issueLabel,
      image: item.image,
      mediaUrl: item.mediaUrl,
      status: item.status,
      accessLevel: item.accessLevel,
      kind: item.kind
    });
    setError("");
    setSuccess("");
  }

  async function saveContent(event) {
    event.preventDefault();
    setError("");
    setSuccess("");
    const { kind, id } = editingContent;
    const path = id === "new" ? `/api/admin/content/${kind}` : `/api/admin/content/${kind}/${id}`;
    try {
      await apiRequest(path, {
        method: id === "new" ? "POST" : "PUT",
        body: JSON.stringify(contentForm)
      });
      const label = tabs.find((tab) => tab.kind === kind)?.label || "Content";
      setSuccess(id === "new" ? `${label} item created.` : `${label} item changes saved.`);
      setEditingContent(null);
      await loadData();
    } catch (requestError) {
      setError(requestError.message);
    }
  }

  async function saveSiteContent(section, content) {
    setError("");
    setSuccess("");
    const result = await apiRequest(`/api/admin/site-content/${section}`, {
      method: "PUT",
      body: JSON.stringify({ content })
    });
    setSiteContent((current) => ({ ...current, [result.section]: result.content }));
    onSiteContentChange(result.section, result.content);
    setSuccess("Website content saved and published.");
  }

  async function deleteContent(item) {
    if (!window.confirm(`Delete "${item.title}"? This cannot be undone.`)) return;
    setError("");
    setSuccess("");
    try {
      await apiRequest(`/api/admin/content/${item.kind}/${item.id}`, { method: "DELETE" });
      setSuccess("Content item deleted.");
      await loadData();
    } catch (requestError) {
      setError(requestError.message);
    }
  }

  async function updateEnquiryStatus(enquiry, status) {
    setError("");
    setSuccess("");
    try {
      await apiRequest(`/api/admin/enquiries/${enquiry.id}`, {
        method: "PATCH",
        body: JSON.stringify({ status })
      });
      setSuccess("Enquiry status updated.");
      await loadData();
    } catch (requestError) {
      setError(requestError.message);
    }
  }

  async function deleteEnquiry(enquiry) {
    if (!window.confirm(`Delete the enquiry from ${enquiry.name}? This cannot be undone.`)) return;
    setError("");
    try {
      await apiRequest(`/api/admin/enquiries/${enquiry.id}`, { method: "DELETE" });
      setSuccess("Enquiry deleted.");
      await loadData();
    } catch (requestError) {
      setError(requestError.message);
    }
  }

  async function deleteSubscriber(subscriber) {
    if (!window.confirm(`Remove ${subscriber.email} from the subscriber list? This cannot be undone.`)) return;
    setError("");
    setSuccess("");
    try {
      await apiRequest(`/api/admin/newsletter-subscribers/${subscriber.id}`, { method: "DELETE" });
      setSubscribers((current) => current.filter((item) => item.id !== subscriber.id));
      setSuccess("Newsletter subscriber removed.");
    } catch (requestError) {
      setError(requestError.message);
    }
  }

  if (checkingSession) {
    return <div className="admin-loading"><span className="admin-spinner"/>Checking admin session…</div>;
  }

  if (!user) {
    return <main className="admin-login-page">
      <Link to="/" className="admin-back-link"><ArrowLeft size={16}/> Back to Humans of EV</Link>
      <form className="admin-login-card" onSubmit={login}>
        <div className="admin-login-mark"><ShieldCheck size={24}/></div>
        <span className="admin-overline">HUMANS OF EV</span>
        <h1>Admin sign in</h1>
        <p>Sign in to manage editorial content and contact enquiries.</p>
        {error && <div className="admin-alert error" role="alert">{error}</div>}
        <label>Email address<input name="email" type="email" autoComplete="username" required autoFocus/></label>
        <label>Password<input name="password" type="password" autoComplete="current-password" required/></label>
        <button className="admin-button primary" type="submit">Sign in <ArrowUpRight size={16}/></button>
        <div className="admin-secure-note"><ShieldCheck size={14}/> Protected administrator access</div>
      </form>
    </main>;
  }

  return <div className="admin-layout">
    <aside className={`admin-sidebar${mobileNavOpen ? " open" : ""}`}>
      <div className="admin-brand">
        <span className="admin-brand-mark">H</span>
        <span>HUMANS <i>of</i> EV<small>ADMINISTRATION</small></span>
        <button className="admin-close-nav" onClick={() => setMobileNavOpen(false)} aria-label="Close menu"><X size={19}/></button>
      </div>
      <span className="admin-nav-label">WORKSPACE</span>
      <nav aria-label="Admin sections">
        {tabs.map(({ id, label, icon: Icon }) =>
          <button
            className={`admin-nav-item${activeTab === id ? " active" : ""}`}
            key={id}
            onClick={() => { setActiveTab(id); setMobileNavOpen(false); setEditingArticle(null); setEditingContent(null); setError(""); setSuccess(""); }}
          >
            <Icon size={17}/>{label}
            {id === "enquiries" && summary?.enquiries?.new > 0 &&
              <span className="admin-nav-count">{summary.enquiries.new}</span>}
          </button>
        )}
      </nav>
      <div className="admin-sidebar-bottom">
        <Link to="/" className="admin-view-site"><ArrowUpRight size={16}/> View website</Link>
        <div className="admin-user">
          <div className="admin-avatar">{user.email.charAt(0).toUpperCase()}</div>
          <div><strong>{user.email}</strong><small>Administrator</small></div>
          <button onClick={logout} aria-label="Sign out" title="Sign out"><LogOut size={16}/></button>
        </div>
      </div>
    </aside>

    <section className="admin-workspace">
      <header className="admin-topbar">
        <button className="admin-mobile-menu" onClick={() => setMobileNavOpen(true)} aria-label="Open menu"><Menu size={20}/></button>
        <div className="admin-breadcrumb"><span>Workspace</span><ChevronDown size={13}/><strong>{tabs.find((tab) => tab.id === activeTab)?.label}</strong></div>
        <div className="admin-live"><span/> All changes saved</div>
      </header>
      <main className="admin-content">
        <div className="admin-page-heading">
          <div>
            <span className="admin-overline">HUMANS OF EV / WORKSPACE</span>
            <h1>{activeTab === "overview" ? "Good to see you." : tabs.find((tab) => tab.id === activeTab)?.label}</h1>
            <p>{activeTab === "overview" ? "Here’s what’s happening across your platform." :
              activeTab === "articles" ? "Create, edit and publish your newsroom content." :
                activeTab === "site-content" ? "Update navigation and the structured content shown across your website." :
                activeTab === "newsletter" ? "View newsletter subscriptions and remove addresses when requested." :
                activeTab === "enquiries" ? "Review and respond to messages from your contact page." :
                  `Create, edit and publish ${tabs.find((tab) => tab.id === activeTab)?.label.toLowerCase()}.`}</p>
          </div>
          {activeTab === "articles" && !editingArticle &&
            <button className="admin-button primary" onClick={beginArticleCreate}><Plus size={16}/> New article</button>}
          {managedTypes[activeTab] && !editingContent &&
            <button className="admin-button primary" onClick={() => beginContentCreate(managedTypes[activeTab].kind)}><Plus size={16}/> Add {managedTypes[activeTab].label.replace(/s$/, "")}</button>}
        </div>

        {error && <div className="admin-alert error" role="alert">{error}</div>}
        {success && <div className="admin-alert success" role="status"><Check size={16}/>{success}</div>}

        {activeTab === "overview" && <Overview
          summary={summary}
          enquiries={enquiries}
          loading={loadingData}
          onOpenEnquiries={() => setActiveTab("enquiries")}
          onOpenArticles={() => setActiveTab("articles")}
        />}

        {activeTab === "articles" && (editingArticle
          ? <ArticleEditor
            article={articleForm}
            onChange={setArticleForm}
            onCancel={() => setEditingArticle(null)}
            onSave={saveArticle}
          />
          : <ArticleManager
            articles={articles}
            loading={loadingData}
            onEdit={beginArticleEdit}
            onDelete={deleteArticle}
          />)}

        {activeTab === "site-content" && siteContent && <SiteContentEditor content={siteContent} onSave={saveSiteContent}/>}

        {managedTypes[activeTab] && (editingContent
          ? <ManagedContentEditor
            kind={editingContent.kind}
            item={contentForm}
            onChange={setContentForm}
            onCancel={() => setEditingContent(null)}
            onSave={saveContent}
          />
          : <ManagedContentManager
            kind={managedTypes[activeTab].kind}
            items={managedContent[managedTypes[activeTab].kind]}
            loading={loadingData}
            onEdit={beginContentEdit}
            onDelete={deleteContent}
          />)}

        {activeTab === "enquiries" && <EnquiryManager
          enquiries={filteredEnquiries}
          query={query}
          onQueryChange={setQuery}
          filter={enquiryFilter}
          onFilterChange={setEnquiryFilter}
          loading={loadingData}
          onStatusChange={updateEnquiryStatus}
          onDelete={deleteEnquiry}
        />}
        {activeTab === "newsletter" && <NewsletterSubscribers subscribers={subscribers} onDelete={deleteSubscriber}/>}
      </main>
    </section>
  </div>;
}

function NewsletterSubscribers({ subscribers, onDelete }) {
  return <section className="admin-panel-card admin-table-card">
    <div className="admin-panel-head"><div><h2>Newsletter subscribers</h2><p>{subscribers.length} subscribed address{subscribers.length === 1 ? "" : "es"}</p></div></div>
    {subscribers.length === 0
      ? <div className="admin-empty"><Inbox size={24}/><p>No newsletter subscriptions yet.</p></div>
      : <div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>Email address</th><th>Status</th><th>Subscribed</th><th><span className="sr-only">Actions</span></th></tr></thead><tbody>{subscribers.map((subscriber) => <tr key={subscriber.id}><td><a href={`mailto:${subscriber.email}`}>{subscriber.email}</a></td><td><span className={`admin-status ${subscriber.status}`}>{subscriber.status}</span></td><td className="admin-date">{displayDate(subscriber.subscribedAt)}</td><td><div className="admin-row-actions"><button className="danger" onClick={() => onDelete(subscriber)} aria-label={`Remove ${subscriber.email}`} title="Remove subscriber"><Trash2 size={15}/></button></div></td></tr>)}</tbody></table></div>}
  </section>;
}

function Overview({ summary, enquiries, loading, onOpenEnquiries, onOpenArticles }) {
  const contentCount = (kind) => summary?.managedContent?.find((item) => item.kind === kind) || { total: 0, published: 0, drafts: 0 };
  const metrics = [
    { label: "Published news", value: summary?.articles?.published ?? 0, caption: `${summary?.articles?.drafts ?? 0} drafts`, icon: FileText, color: "green" },
    { label: "Podcasts", value: contentCount("podcast").total, caption: `${contentCount("podcast").published} published`, icon: Mic2, color: "blue" },
    { label: "Magazine issues", value: contentCount("magazine").total, caption: `${contentCount("magazine").published} published`, icon: BookOpen, color: "orange" },
    { label: "CXO profiles", value: contentCount("cxo").total, caption: `${contentCount("cxo").published} published`, icon: Users, color: "green" },
    { label: "All news", value: summary?.articles?.total ?? 0, caption: "Across your newsroom", icon: Activity, color: "blue" },
    { label: "New enquiries", value: summary?.enquiries?.new ?? 0, caption: `${summary?.enquiries?.total ?? 0} total received`, icon: Inbox, color: "orange" }
  ];
  return <>
    <div className="admin-metric-grid">
      {metrics.map(({ label, value, caption, icon: Icon, color }) =>
        <div className="admin-metric-card" key={label}>
          <div className={`admin-metric-icon ${color}`}><Icon size={18}/></div>
          <span>{label}</span><strong>{loading ? "—" : value.toLocaleString("en-IN")}</strong><small>{caption}</small>
        </div>)}
    </div>
    <div className="admin-overview-grid">
      <section className="admin-panel-card">
        <div className="admin-panel-head"><div><h2>Recent enquiries</h2><p>Latest messages from your contact page</p></div><button className="admin-text-link" onClick={onOpenEnquiries}>View all <ArrowUpRight size={14}/></button></div>
        {enquiries.length === 0 ? <div className="admin-empty compact"><Inbox size={21}/><p>No enquiries yet.</p></div> :
          <div className="admin-recent-list">{enquiries.slice(0, 4).map((enquiry) =>
            <div className="admin-recent-row" key={enquiry.id}>
              <div className="admin-recent-avatar">{enquiry.name.charAt(0).toUpperCase()}</div>
              <div className="admin-recent-person"><strong>{enquiry.name}</strong><span>{enquiry.type}</span></div>
              <span className={`admin-status ${enquiry.status}`}>{enquiry.status}</span>
            </div>)}</div>}
      </section>
      <section className="admin-panel-card admin-quick-card">
        <div><span className="admin-overline">QUICK ACTION</span><h2>Keep your newsroom moving.</h2><p>Draft a story or review the latest messages from your readers and partners.</p></div>
        <button className="admin-button primary" onClick={onOpenArticles}><Plus size={16}/> Manage articles</button>
      </section>
    </div>
  </>;
}

function ArticleManager({ articles, loading, onEdit, onDelete }) {
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
                <button onClick={() => onEdit(article)} aria-label={`Edit ${article.title}`} title="Edit article"><FileText size={15}/></button>
                <button className="danger" onClick={() => onDelete(article)} aria-label={`Delete ${article.title}`} title="Delete article"><Trash2 size={15}/></button>
              </div></td>
            </tr>)}</tbody>
        </table></div>}
  </section>;
}

function ArticleEditor({ article, onChange, onCancel, onSave }) {
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
      <label>Visibility<select value={article.status} onChange={(event) => set("status", event.target.value)}><option value="draft">Draft</option><option value="published">Published</option></select></label>
    </div>
    <div className="admin-editor-actions"><button type="button" className="admin-button secondary" onClick={onCancel}>Cancel</button><button className="admin-button primary" type="submit"><Check size={16}/> Save article</button></div>
  </form>;
}

function ManagedContentManager({ kind, items, loading, onEdit, onDelete }) {
  const title = kind === "cxo" ? "CXO profiles" : kind === "podcast" ? "Podcast episodes" : kind === "video" ? "Videos" : "Magazine issues";
  return <section className="admin-panel-card admin-table-card">
    <div className="admin-panel-head"><div><h2>{title}</h2><p>{items.length} item{items.length === 1 ? "" : "s"} in your library</p></div></div>
    {loading ? <div className="admin-empty"><span className="admin-spinner"/>Loading content…</div> :
      items.length === 0 ? <div className="admin-empty"><FileText size={24}/><p>No {title.toLowerCase()} yet. Add one to get started.</p></div> :
        <div className="admin-table-wrap"><table className="admin-table">
          <thead><tr><th>Title</th>{kind === "cxo" && <th>Executive</th>}{kind === "magazine" && <th>Issue</th>}{kind === "podcast" && <th>Guest / host</th>}{kind === "video" && <th>Video URL</th>}<th>Access</th><th>Status</th><th>Last updated</th><th><span className="sr-only">Actions</span></th></tr></thead>
          <tbody>{items.map((item) =>
            <tr key={item.id}>
              <td><div className="admin-article-title"><strong>{item.title}</strong><span>{item.description}</span></div></td>
              {kind === "cxo" && <td><div className="admin-article-title"><strong>{item.personName}</strong><span>{item.role} · {item.organization}</span></div></td>}
              {kind === "magazine" && <td><span className="admin-category">{item.issueLabel}</span></td>}
              {kind === "podcast" && <td><div className="admin-article-title"><strong>{item.personName || "—"}</strong><span>{item.duration}</span></div></td>}
              {kind === "video" && <td><div className="admin-article-title"><span>{item.mediaUrl}</span></div></td>}
              <td><span className={`admin-access-level ${item.accessLevel}`}>{item.accessLevel === "member" ? "Member only" : "Free"}</span></td>
              <td><span className={`admin-status ${item.status}`}>{item.status}</span></td>
              <td className="admin-date">{displayDate(item.updatedAt)}</td>
              <td><div className="admin-row-actions">
                {item.status === "published" && <Link to={kind === "cxo" ? "/people" : kind === "magazine" ? "/magazine" : kind === "video" ? "/videos" : "/podcasts"} target="_blank" aria-label="View published content" title="View published content"><ArrowUpRight size={15}/></Link>}
                <button onClick={() => onEdit(item)} aria-label={`Edit ${item.title}`} title="Edit item"><FileText size={15}/></button>
                <button className="danger" onClick={() => onDelete(item)} aria-label={`Delete ${item.title}`} title="Delete item"><Trash2 size={15}/></button>
              </div></td>
            </tr>)}</tbody>
        </table></div>}
  </section>;
}

function ManagedContentEditor({ kind, item, onChange, onCancel, onSave }) {
  const label = kind === "cxo" ? "CXO profile" : kind === "podcast" ? "podcast episode" : kind === "video" ? "video" : "magazine issue";
  function set(field, value) {
    onChange((current) => ({ ...current, [field]: value }));
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
      <ImageUploadField label={kind === "cxo" ? "Portrait image URL" : kind === "podcast" ? "Episode cover image URL" : kind === "video" ? "Video thumbnail image URL" : "Magazine cover image URL"} value={item.image} onChange={(value) => set("image", value)}/>
      <label className="span-two">{kind === "video" ? "YouTube, Vimeo, or direct video URL" : kind === "podcast" ? "Episode audio / video URL (optional)" : kind === "magazine" ? "Digital edition / download URL (optional)" : "Related interview or video URL (optional)"}<input type="url" value={item.mediaUrl} onChange={(event) => set("mediaUrl", event.target.value)} placeholder={kind === "video" ? "https://youtu.be/… or https://…/video.mp4" : "https://…"} required={kind === "video"}/>{kind === "video" && <small>Use a public video link. YouTube and Vimeo links play inline; MP4, WebM, and Ogg files use the built-in player.</small>}</label>
      <label>Content access<select value={item.accessLevel} onChange={(event) => set("accessLevel", event.target.value)}><option value="free">Free for everyone</option><option value="member">Active members only</option></select></label>
      <label>Visibility<select value={item.status} onChange={(event) => set("status", event.target.value)}><option value="draft">Draft</option><option value="published">Published</option></select></label>
    </div>
    <div className="admin-editor-actions"><button type="button" className="admin-button secondary" onClick={onCancel}>Cancel</button><button className="admin-button primary" type="submit"><Check size={16}/> Save {kind === "cxo" ? "profile" : kind === "podcast" ? "episode" : kind === "video" ? "video" : "issue"}</button></div>
  </form>;
}

function EnquiryManager({ enquiries, query, onQueryChange, filter, onFilterChange, loading, onStatusChange, onDelete }) {
  return <section className="admin-panel-card admin-table-card">
    <div className="admin-panel-head"><div><h2>Contact inbox</h2><p>Manage submissions from the public contact page.</p></div></div>
    <div className="admin-inbox-tools">
      <label className="admin-search"><Search size={16}/><input value={query} onChange={(event) => onQueryChange(event.target.value)} placeholder="Search name, email or message"/></label>
      <select value={filter} onChange={(event) => onFilterChange(event.target.value)} aria-label="Filter enquiries by status">
        <option value="all">All enquiries</option><option value="new">New</option><option value="read">Read</option><option value="resolved">Resolved</option>
      </select>
    </div>
    {loading ? <div className="admin-empty"><span className="admin-spinner"/>Loading enquiries…</div> :
      enquiries.length === 0 ? <div className="admin-empty"><Inbox size={24}/><p>No enquiries match this view.</p></div> :
        <div className="admin-inbox-list">{enquiries.map((enquiry) =>
          <article className="admin-enquiry" key={enquiry.id}>
            <div className="admin-enquiry-top">
              <div><h3>{enquiry.name}</h3><a href={`mailto:${enquiry.email}`}>{enquiry.email}</a>{enquiry.company && <span className="admin-company">{enquiry.company}</span>}</div>
              <span className={`admin-status ${enquiry.status}`}>{enquiry.status}</span>
            </div>
            <div className="admin-enquiry-meta"><span>{enquiry.type}</span><span>{displayDate(enquiry.createdAt)}</span></div>
            <p className="admin-enquiry-message">{enquiry.message}</p>
            <div className="admin-enquiry-actions">
              <label>Status<select value={enquiry.status} onChange={(event) => onStatusChange(enquiry, event.target.value)}>
                <option value="new">New</option><option value="read">Read</option><option value="resolved">Resolved</option>
              </select></label>
              <button className="admin-delete-link" onClick={() => onDelete(enquiry)}><Trash2 size={14}/> Delete</button>
            </div>
          </article>)}</div>}
  </section>;
}

export default AdminPanel;
