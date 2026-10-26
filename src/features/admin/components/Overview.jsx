import { CstButton } from "../../../components/common/ui-components";


import {Activity, ArrowUpRight, FileText, Inbox, Mic2, Plus, Users, BookOpen} from "lucide-react";




export default function Overview({ summary, enquiries, loading, role, onOpenEnquiries, onOpenArticles }) {
  const audienceRole = role === "owner" || role === "support";
  const contentCount = (kind) => summary?.managedContent?.find((item) => item.kind === kind) || { total: 0, published: 0, drafts: 0 };
  const contentMetrics = [
    { label: "Published news", value: summary?.articles?.published ?? 0, caption: `${summary?.articles?.drafts ?? 0} drafts`, icon: FileText, color: "green" },
    { label: "Podcasts", value: contentCount("podcast").total, caption: `${contentCount("podcast").published} published`, icon: Mic2, color: "blue" },
    { label: "Magazine issues", value: contentCount("magazine").total, caption: `${contentCount("magazine").published} published`, icon: BookOpen, color: "orange" },
    { label: "CXO profiles", value: contentCount("cxo").total, caption: `${contentCount("cxo").published} published`, icon: Users, color: "green" },
    { label: "All news", value: summary?.articles?.total ?? 0, caption: "Across your newsroom", icon: Activity, color: "blue" },
  ];
  const metrics = audienceRole
    ? [{ label: "New enquiries", value: summary?.enquiries?.new ?? 0, caption: `${summary?.enquiries?.total ?? 0} total received`, icon: Inbox, color: "orange" }]
    : contentMetrics;
  return <>
    <div className="admin-metric-grid">
      {metrics.map(({ label, value, caption, icon: Icon, color }) =>
        <div className="admin-metric-card" key={label}>
          <div className={`admin-metric-icon ${color}`}><Icon size={18}/></div>
          <span>{label}</span><strong>{loading ? "—" : value.toLocaleString("en-IN")}</strong><small>{caption}</small>
        </div>)}
    </div>
    <div className="admin-overview-grid">
      {audienceRole && <section className="admin-panel-card">
        <div className="admin-panel-head"><div><h2>Recent enquiries</h2><p>Latest messages from your contact page</p></div><CstButton className="admin-text-link" onClick={onOpenEnquiries}>View all <ArrowUpRight size={14}/></CstButton></div>
        {enquiries.length === 0 ? <div className="admin-empty compact"><Inbox size={21}/><p>No enquiries yet.</p></div> :
          <div className="admin-recent-list">{enquiries.slice(0, 4).map((enquiry) =>
            <div className="admin-recent-row" key={enquiry.id}>
              <div className="admin-recent-avatar">{enquiry.name.charAt(0).toUpperCase()}</div>
              <div className="admin-recent-person"><strong>{enquiry.name}</strong><span>{enquiry.type}</span></div>
              <span className={`admin-status ${enquiry.status}`}>{enquiry.status}</span>
            </div>)}</div>}
      </section>}
      <section className="admin-panel-card admin-quick-card">
        <div><span className="admin-overline">QUICK ACTION</span><h2>{audienceRole ? "Keep your audience supported." : "Keep your newsroom moving."}</h2><p>{audienceRole ? "Review contact submissions and newsletter requests." : "Create stories and manage your publishing workflow."}</p></div>
        {audienceRole ? <CstButton className="admin-button primary" onClick={onOpenEnquiries}><Inbox size={16}/> Open enquiries</CstButton> : <CstButton className="admin-button primary" onClick={onOpenArticles}><Plus size={16}/> Manage articles</CstButton>}
      </section>
    </div>
  </>;
}
