import { CstButton } from "../../../components/common/ui-components";


import {Inbox, Trash2} from "lucide-react";



import {displayDate} from "../adminUtils";

export default function NewsletterSubscribers({ subscribers, onDelete }) {
  return <section className="admin-panel-card admin-table-card">
    <div className="admin-panel-head"><div><h2>Newsletter subscribers</h2><p>{subscribers.length} subscribed address{subscribers.length === 1 ? "" : "es"}</p></div></div>
    {subscribers.length === 0
      ? <div className="admin-empty"><Inbox size={24}/><p>No newsletter subscriptions yet.</p></div>
      : <div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>Email address</th><th>Status</th><th>Subscribed</th><th><span className="sr-only">Actions</span></th></tr></thead><tbody>{subscribers.map((subscriber) => <tr key={subscriber.id}><td><a href={`mailto:${subscriber.email}`}>{subscriber.email}</a></td><td><span className={`admin-status ${subscriber.status}`}>{subscriber.status}</span></td><td className="admin-date">{displayDate(subscriber.subscribedAt)}</td><td><div className="admin-row-actions"><CstButton className="danger" onClick={() => onDelete(subscriber)} aria-label={`Remove ${subscriber.email}`} title="Remove subscriber"><Trash2 size={15}/></CstButton></div></td></tr>)}</tbody></table></div>}
  </section>;
}
