import { CstButton } from "./components/common/ui-components";
import {useEffect, useMemo, useState} from "react";
import {Link, useLocation} from "react-router-dom";
import {ArrowLeft, ArrowUpRight, Check, ChevronDown, LogOut, Menu, ShieldCheck, X} from "lucide-react";
import {apiRequest, ApiError} from "./api";


import "./admin.css";
import SiteContentEditor from "./features/admin/components/SiteContentEditor";
import AdminProfile from "./features/admin/components/AdminProfile";
import NewsletterSubscribers from "./features/admin/components/NewsletterSubscribers";
import TeamManager from "./features/admin/components/TeamManager";
import Overview from "./features/admin/components/Overview";
import ArticleEditor from "./features/admin/components/ArticleEditor";
import ManagedContentEditor from "./features/admin/components/ManagedContentEditor";
import EnquiryManager from "./features/admin/components/EnquiryManager";
import ContentLibrary from "./features/admin/components/ContentLibrary";
import {emptyArticle, getEnquiryDisplay, emptyManagedContent, tabs, adminMenuGroups, adminRoleLabels} from "./features/admin/adminUtils";

function AdminPanel({ onSiteContentChange }) {
  const location = useLocation();
  const [user, setUser] = useState(null);
  const [checkingSession, setCheckingSession] = useState(true);
  const [authMode, setAuthMode] = useState("login");
  const [recoveryCodeSent, setRecoveryCodeSent] = useState(false);
  const [authNotice, setAuthNotice] = useState("");
  const [recoveryChannel, setRecoveryChannel] = useState("email");
  const [activeTab, setActiveTab] = useState(() => new URLSearchParams(location.search).get("section") || "overview");
  const [initialSiteSection, setInitialSiteSection] = useState("navigation");
  const [summary, setSummary] = useState(null);
  const [articles, setArticles] = useState([]);
  const [managedContent, setManagedContent] = useState({ podcast: [], video: [], magazine: [], cxo: [] });
  const [siteContent, setSiteContent] = useState(null);
  const [enquiries, setEnquiries] = useState([]);
  const [subscribers, setSubscribers] = useState([]);
  const [teamAdmins, setTeamAdmins] = useState([]);
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
  const [enquiryTypeFilter, setEnquiryTypeFilter] = useState("all");
  const canPublish = user?.role === "owner" || user?.role === "publisher";

  async function loadData(currentUser = user) {
    const role = currentUser?.role || "owner";
    const canManageContent = ["owner", "editor", "publisher"].includes(role);
    const canManageAudience = ["owner", "support"].includes(role);
    setLoadingData(true);
    setError("");
    try {
      const [summaryResult, articleResult, enquiryResult, podcastResult, videoResult, magazineResult, cxoResult, siteContentResult, subscriberResult] = await Promise.all([
        apiRequest("/api/admin/summary"),
        canManageContent ? apiRequest("/api/admin/articles") : Promise.resolve({ articles: [] }),
        canManageAudience ? apiRequest("/api/admin/enquiries") : Promise.resolve({ enquiries: [] }),
        canManageContent ? apiRequest("/api/admin/content/podcast") : Promise.resolve({ items: [] }),
        canManageContent ? apiRequest("/api/admin/content/video") : Promise.resolve({ items: [] }),
        canManageContent ? apiRequest("/api/admin/content/magazine") : Promise.resolve({ items: [] }),
        canManageContent ? apiRequest("/api/admin/content/cxo") : Promise.resolve({ items: [] }),
        role === "owner" ? apiRequest("/api/admin/site-content") : Promise.resolve({ content: null }),
        canManageAudience ? apiRequest("/api/admin/newsletter-subscribers") : Promise.resolve({ subscribers: [] })
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
      if (role === "owner") {
        const { admins } = await apiRequest("/api/admin/team");
        setTeamAdmins(admins);
      } else {
        setTeamAdmins([]);
      }
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
        // Existing signed-in sessions may predate role fields; preserve the
        // original full-access admin experience until they sign in again.
        const normalizedUser = { ...currentUser, role: currentUser.role || "owner" };
        setUser(normalizedUser);
        return loadData(normalizedUser);
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
    const display = getEnquiryDisplay(enquiry);
    const matchesType = enquiryTypeFilter === "all" || display.type === enquiryTypeFilter;
    const search = query.trim().toLowerCase();
    const matchesQuery = !search || [display.name, display.email, display.company, display.phone, display.jobTitle, display.website, display.type, display.magazineIssue, display.magazineFormat, display.magazineBudget, display.message]
      .some((value) => value.toLowerCase().includes(search));
    return matchesStatus && matchesType && matchesQuery;
  }), [enquiries, enquiryFilter, enquiryTypeFilter, query]);

  async function authenticate(event) {
    event.preventDefault();
    setError("");
    const form = new FormData(event.currentTarget);
    const isSignup = authMode === "signup";
    if (isSignup && form.get("password") !== form.get("confirmPassword")) {
      setError("The passwords do not match.");
      return;
    }
    try {
      const result = await apiRequest(`/api/auth/${isSignup ? "signup" : "login"}`, {
        method: "POST",
        body: JSON.stringify({
          email: form.get("email"),
          password: form.get("password"),
          signupCode: form.get("signupCode")
        })
      });
      const authenticatedUser = { ...result.user, role: result.user.role || "owner" };
      setUser(authenticatedUser);
      await loadData(authenticatedUser);
    } catch (requestError) {
      setError(requestError.message);
    }
  }

  async function recoverAdminAccess(event) {
    event.preventDefault();
    setError("");
    setAuthNotice("");
    const form = new FormData(event.currentTarget);
    const contact = form.get("contact");
    const channel = form.get("channel");
    try {
      if (!recoveryCodeSent) {
        const result = await apiRequest("/api/admin/recovery/request", {
          method: "POST", body: JSON.stringify({ contact, channel })
        });
        setAuthNotice(result.message);
        setRecoveryCodeSent(true);
        return;
      }
      const result = await apiRequest("/api/admin/recovery/reset", {
        method: "POST",
        body: JSON.stringify({ contact, channel, code: form.get("code"), newPassword: form.get("newPassword") })
      });
      setAuthMode("login");
      setRecoveryCodeSent(false);
      setAuthNotice(`${result.message} Admin sign-in email: ${result.email}`);
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
      setManagedContent({ podcast: [], video: [], magazine: [], cxo: [] });
      setSiteContent(null);
      setSubscribers([]);
      setTeamAdmins([]);
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
      placements: article.placements || "[]",
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
      slug: item.slug || "",
      category: item.category || "",
      series: item.series || "",
      tags: item.tags || "",
      placements: item.placements || "[]",
      relatedContent: item.relatedContent || "[]",
      featured: Boolean(item.featured),
      publicationAt: item.publicationAt || "",
      seoTitle: item.seoTitle || "",
      metaDescription: item.metaDescription || "",
      canonicalUrl: item.canonicalUrl || "",
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
    const isSignup = authMode === "signup";
    const isRecovery = authMode === "recovery";
    return <main className="admin-login-page">
      <Link to="/" className="admin-back-link"><ArrowLeft size={16}/> Back to Humans of EV</Link>
      <form className="admin-login-card" onSubmit={isRecovery ? recoverAdminAccess : authenticate}>
        <div className="admin-login-mark"><ShieldCheck size={24}/></div>
        <span className="admin-overline">HUMANS OF EV</span>
        <h1>{isRecovery ? "Recover admin access" : isSignup ? "Create admin account" : "Admin sign in"}</h1>
        <p>{isRecovery ? "Recover the account with its verified, unique admin email or phone. The sign-in email is shown after code verification." : isSignup ? "Registration requires a private invitation code from the site owner." : "Sign in to manage editorial content and contact enquiries."}</p>
        {error && <div className="admin-alert error" role="alert">{error}</div>}
        {authNotice&&<div className="admin-alert success" role="status">{authNotice}</div>}
        {isRecovery ? <>
          <label>{recoveryChannel === "email" ? "Verified recovery email" : "Verified recovery phone"}<input key={recoveryChannel} name="contact" type={recoveryChannel === "email" ? "email" : "tel"} autoComplete={recoveryChannel === "email" ? "email" : "tel"} placeholder={recoveryChannel === "email" ? "name@company.com" : "+918818928294"} pattern={recoveryChannel === "phone" ? "\\+[1-9][0-9]{7,14}" : undefined} title={recoveryChannel === "phone" ? "Enter the full international number with + and country code, without spaces." : undefined} required autoFocus/></label>
          {recoveryChannel === "phone"&&<small className="admin-recovery-hint">Include + and your country code, with no spaces. Example: +918818928294</small>}
          <label>Contact type<select name="channel" value={recoveryChannel} onChange={(event)=>setRecoveryChannel(event.target.value)}><option value="email">Email</option><option value="phone">Phone</option></select></label>
          {recoveryCodeSent&&<>
            <label>6-digit recovery code<input name="code" inputMode="numeric" pattern="[0-9]{6}" maxLength="6" autoComplete="one-time-code" required/></label>
            <label>New password<input name="newPassword" type="password" autoComplete="new-password" minLength="12" maxLength="200" required/><small>Use at least 12 characters.</small></label>
          </>}
          <CstButton className="admin-button primary" type="submit">{recoveryCodeSent ? "Reset password" : "Send recovery code"} <ArrowUpRight size={16}/></CstButton>
          {recoveryCodeSent&&<CstButton className="admin-auth-switch" type="button" onClick={()=>{setRecoveryCodeSent(false);setAuthNotice("");}}>Request another code</CstButton>}
          <CstButton className="admin-auth-switch" type="button" onClick={()=>{setAuthMode("login");setRecoveryCodeSent(false);setAuthNotice("");setError("");}}>Back to sign in</CstButton>
        </> : <>
          <label>Email address<input name="email" type="email" autoComplete="username" required autoFocus/></label>
          {isSignup&&<label>Admin invitation code<input name="signupCode" type="password" autoComplete="off" minLength="24" required/></label>}
          <label>Password<input name="password" type="password" autoComplete={isSignup ? "new-password" : "current-password"} minLength={isSignup ? 12 : undefined} maxLength="200" required/>{isSignup&&<small>Use at least 12 characters.</small>}</label>
          {isSignup&&<label>Confirm password<input name="confirmPassword" type="password" autoComplete="new-password" minLength="12" maxLength="200" required/></label>}
          <CstButton className="admin-button primary" type="submit">{isSignup ? "Create account" : "Sign in"} <ArrowUpRight size={16}/></CstButton>
          {!isSignup&&<CstButton className="admin-auth-switch" type="button" onClick={()=>{setAuthMode("recovery");setError("");setAuthNotice("");}}>Forgot your password?</CstButton>}
          <CstButton className="admin-auth-switch" type="button" onClick={()=>{setAuthMode(isSignup ? "login" : "signup");setError("");setAuthNotice("");}}>{isSignup ? "Already have an admin account? Sign in" : "Have an invitation code? Create an admin account"}</CstButton>
        </>}
        <div className="admin-secure-note"><ShieldCheck size={14}/> Protected administrator access</div>
      </form>
    </main>;
  }

  return <div className="admin-layout">
    {mobileNavOpen && <CstButton className="admin-nav-overlay" onClick={() => setMobileNavOpen(false)} aria-label="Close navigation"/>}
    <aside className={`admin-sidebar${mobileNavOpen ? " open" : ""}`}>
      <div className="admin-brand">
        <span className="admin-brand-mark">H</span>
        <span>HUMANS <i>of</i> EV<small>ADMINISTRATION</small></span>
        <CstButton className="admin-close-nav" onClick={() => setMobileNavOpen(false)} aria-label="Close menu"><X size={19}/></CstButton>
      </div>
      <nav aria-label="Admin sections">
        {adminMenuGroups.map((group) => {
          const groupTabs = group.ids.map((id) => tabs.find((tab) => tab.id === id)).filter((tab) => tab && tab.roles.includes(user.role));
          if (!groupTabs.length) return null;
          return <div className="admin-nav-group" key={group.label}>
            <span className="admin-nav-label">{group.label}</span>
            {groupTabs.map(({ id, label, icon: Icon }) =>
          <CstButton
            className={`admin-nav-item${activeTab === id ? " active" : ""}`}
            key={id}
            onClick={() => { setActiveTab(id); setMobileNavOpen(false); setEditingArticle(null); setEditingContent(null); setError(""); setSuccess(""); }}
          >
            <Icon size={17}/>{label}
            {id === "enquiries" && summary?.enquiries?.new > 0 &&
              <span className="admin-nav-count">{summary.enquiries.new}</span>}
          </CstButton>
            )}
          </div>;
        })}
      </nav>
      <div className="admin-sidebar-bottom">
        <Link to="/" className="admin-view-site"><ArrowUpRight size={16}/> View website</Link>
        <div className="admin-user">
          <div className="admin-avatar">{user.email.charAt(0).toUpperCase()}</div>
          <div><strong>{user.email}</strong><small>{adminRoleLabels[user.role] || "Administrator"}</small></div>
          <CstButton onClick={logout} aria-label="Sign out" title="Sign out"><LogOut size={16}/></CstButton>
        </div>
      </div>
    </aside>

    <section className="admin-workspace">
      <header className="admin-topbar">
        <CstButton className="admin-mobile-menu" onClick={() => setMobileNavOpen(true)} aria-label="Open menu"><Menu size={20}/></CstButton>
        <div className="admin-breadcrumb"><span>Workspace</span><ChevronDown size={13}/><strong>{tabs.find((tab) => tab.id === activeTab)?.label}</strong></div>
        <div className="admin-live"><span/> All changes saved</div>
      </header>
      <main className="admin-content">
        <div className="admin-page-heading">
          <div>
            <span className="admin-overline">HUMANS OF EV / WORKSPACE</span>
            <h1>{activeTab === "overview" ? "Good to see you." : tabs.find((tab) => tab.id === activeTab)?.label}</h1>
            <p>{activeTab === "overview" ? "Here’s what’s happening across your platform." :
              activeTab === "content" || activeTab === "articles" ? "Organize every story and media item, and choose all the pages where it should appear." :
                activeTab === "site-content" ? "Control page sections, navigation, events, reports, plans and shared website details." :
                activeTab === "newsletter" ? "View newsletter subscriptions and remove addresses when requested." :
                activeTab === "enquiries" ? "Review and respond to messages from your contact page." :
                activeTab === "profile" ? "Verify recovery contacts and protect your administrator account." :
                activeTab === "team" ? "Add administrators and assign workspace access by role." :
                  `Create, edit and publish ${tabs.find((tab) => tab.id === activeTab)?.label.toLowerCase()}.`}</p>
          </div>
          {(activeTab === "articles" || activeTab === "content") && !editingArticle && !editingContent &&
            <div className="admin-library-create"><label className="sr-only" htmlFor="admin-create-content">Create content</label><select id="admin-create-content" defaultValue="" onChange={(event) => { const kind = event.target.value; if (kind === "article") beginArticleCreate(); else if (kind) beginContentCreate(kind); event.target.value = ""; }}><option value="" disabled>＋ Add content</option><option value="article">Article</option><option value="podcast">Podcast</option><option value="video">Video</option><option value="magazine">Magazine issue</option><option value="cxo">People profile</option></select></div>}
        </div>

        {error && <div className="admin-alert error" role="alert">{error}</div>}
        {success && <div className="admin-alert success" role="status"><Check size={16}/>{success}</div>}

        {activeTab === "overview" && <Overview
          summary={summary}
          enquiries={enquiries}
          loading={loadingData}
          role={user.role}
          onOpenEnquiries={() => setActiveTab("enquiries")}
          onOpenArticles={() => setActiveTab("content")}
        />}

        {(activeTab === "articles" || activeTab === "content") && editingArticle && <ArticleEditor
            article={articleForm}
            canPublish={canPublish}
            onChange={setArticleForm}
            onCancel={() => setEditingArticle(null)}
            onSave={saveArticle}
          />}

        {(activeTab === "articles" || activeTab === "content") && !editingArticle && !editingContent && <ContentLibrary
          articles={articles}
          managedContent={managedContent}
          events={siteContent?.events || []}
          loading={loadingData}
          onEditArticle={beginArticleEdit}
          onEditContent={beginContentEdit}
          onEditEvent={() => { setInitialSiteSection("events"); setActiveTab("site-content"); }}
          onDeleteArticle={deleteArticle}
          onDeleteContent={deleteContent}
          canPublish={canPublish}
        />}

        {activeTab === "site-content" && siteContent && <SiteContentEditor content={siteContent} initialSection={initialSiteSection} onSave={saveSiteContent}/>}

        {activeTab === "content" && editingContent && <ManagedContentEditor
          kind={editingContent.kind}
          item={contentForm}
          canPublish={canPublish}
          onChange={setContentForm}
          onCancel={() => setEditingContent(null)}
          onSave={saveContent}
        />}

        {activeTab === "enquiries" && <EnquiryManager
          enquiries={filteredEnquiries}
          query={query}
          onQueryChange={setQuery}
          filter={enquiryFilter}
          onFilterChange={setEnquiryFilter}
          typeFilter={enquiryTypeFilter}
          onTypeFilterChange={setEnquiryTypeFilter}
          loading={loadingData}
          onStatusChange={updateEnquiryStatus}
          onDelete={deleteEnquiry}
        />}
        {activeTab === "newsletter" && <NewsletterSubscribers subscribers={subscribers} onDelete={deleteSubscriber}/>}
        {activeTab === "team" && user.role === "owner" && <TeamManager admins={teamAdmins} onChanged={() => loadData(user)} currentUser={user} onError={setError} onSuccess={setSuccess}/>}
        {activeTab === "profile" && <AdminProfile/>}
      </main>
    </section>
  </div>;
}


export default AdminPanel;
