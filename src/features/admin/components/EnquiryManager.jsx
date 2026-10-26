import { CstButton } from "../../../components/common/ui-components";


import {Inbox, Search, Trash2} from "lucide-react";

import {contactEnquiryTypes} from "../../../data";

import {getEnquiryDisplay, displayDate} from "../adminUtils";

export default function EnquiryManager({ enquiries, query, onQueryChange, filter, onFilterChange, typeFilter, onTypeFilterChange, loading, onStatusChange, onDelete }) {
  return <section className="admin-panel-card admin-table-card">
    <div className="admin-panel-head"><div><h2>Contact inbox</h2><p>Manage submissions from the public contact page.</p></div></div>
    <div className="admin-inbox-tools">
      <label className="admin-search"><Search size={16}/><input value={query} onChange={(event) => onQueryChange(event.target.value)} placeholder="Search contact, company or message"/></label>
      <select value={filter} onChange={(event) => onFilterChange(event.target.value)} aria-label="Filter enquiries by status">
        <option value="all">All enquiries</option><option value="new">New</option><option value="read">Read</option><option value="resolved">Resolved</option>
      </select>
      <select value={typeFilter} onChange={(event) => onTypeFilterChange(event.target.value)} aria-label="Filter enquiries by type">
        <option value="all">All enquiry types</option>
        {contactEnquiryTypes.map((type) => <option key={type} value={type}>{type}</option>)}
      </select>
    </div>
    {loading ? <div className="admin-empty"><span className="admin-spinner"/>Loading enquiries…</div> :
      enquiries.length === 0 ? <div className="admin-empty"><Inbox size={24}/><p>No enquiries match this view.</p></div> :
        <div className="admin-inbox-list">{enquiries.map((enquiry) => {
          const display = getEnquiryDisplay(enquiry);
          return <article className="admin-enquiry" key={enquiry.id}>
            <div className="admin-enquiry-top">
              <div><h3>{display.name}</h3><a href={`mailto:${display.email}`}>{display.email}</a>{display.company && <span className="admin-company">{display.company}</span>}{display.jobTitle && <span className="admin-company">{display.jobTitle}</span>}</div>
              <span className={`admin-status ${enquiry.status}`}>{enquiry.status}</span>
            </div>
            <div className="admin-enquiry-meta"><span>{display.type}</span><span>{displayDate(enquiry.createdAt)}</span></div>
            {(display.phone||display.website||display.magazineIssue||display.magazineFormat||display.magazineBudget)&&<div className="admin-enquiry-details">
              {display.phone&&<a href={`tel:${display.phone}`}>Phone: {display.phone}</a>}
              {display.website&&<a href={display.website} target="_blank" rel="noreferrer">Website: {display.website}</a>}
              {display.preferredContact&&<span>Reply by: {display.preferredContact}</span>}
              {display.magazineIssue&&<span>Issue / timing: {display.magazineIssue}</span>}
              {display.magazineFormat&&<span>Format: {display.magazineFormat}</span>}
              {display.magazineBudget&&<span>Budget: {display.magazineBudget}</span>}
            </div>}
            <p className="admin-enquiry-message">{display.message}</p>
            <div className="admin-enquiry-actions">
              <label>Status<select value={enquiry.status} onChange={(event) => onStatusChange(enquiry, event.target.value)}>
                <option value="new">New</option><option value="read">Read</option><option value="resolved">Resolved</option>
              </select></label>
              <CstButton className="admin-delete-link" onClick={() => onDelete(enquiry)}><Trash2 size={14}/> Delete</CstButton>
            </div>
          </article>;
        })}</div>}
  </section>;
}
