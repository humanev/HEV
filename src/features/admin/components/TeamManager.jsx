import { CstButton } from "../../../components/common/ui-components";
import {useState} from "react";

import {Users} from "lucide-react";
import {apiRequest} from "../../../api";


import {adminRoleLabels, displayDate} from "../adminUtils";

export default function TeamManager({ admins, onChanged, currentUser, onError, onSuccess }) {
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("editor");
  const roles = ["owner", "editor", "publisher", "support"];

  async function addAdmin(event) {
    event.preventDefault();
    setBusy(true); setFormError("");
    try {
      await apiRequest("/api/admin/team", { method: "POST", body: JSON.stringify({ email, password, role }) });
      setEmail(""); setPassword(""); setRole("editor");
      onSuccess("Administrator added to the workspace.");
      await onChanged();
    } catch (requestError) { setFormError(requestError.message); }
    finally { setBusy(false); }
  }

  async function changeRole(admin, nextRole) {
    if (admin.id === currentUser.id) return;
    setBusy(true); setFormError("");
    try {
      await apiRequest(`/api/admin/team/${admin.id}/role`, { method: "PATCH", body: JSON.stringify({ role: nextRole }) });
      onSuccess(`Role updated for ${admin.email}.`);
      await onChanged();
    } catch (requestError) { setFormError(requestError.message); }
    finally { setBusy(false); }
  }

  return <div className="admin-team-grid">
    <section className="admin-panel-card">
      <div className="admin-panel-head"><div><h2>Workspace team</h2><p>Assign each administrator only the access needed for their work.</p></div><Users size={21}/></div>
      {(formError) && <div className="admin-alert error" role="alert">{formError}</div>}
      <div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>Administrator</th><th>Role</th><th>Added</th></tr></thead><tbody>{admins.map((admin) => <tr key={admin.id}>
        <td><div className="admin-article-title"><strong>{admin.email}</strong>{admin.id === currentUser.id && <span>You</span>}</div></td>
        <td>{admin.id === currentUser.id ? <span className="admin-role-badge">{adminRoleLabels[admin.role]}</span> : <select aria-label={`Role for ${admin.email}`} value={admin.role} disabled={busy} onChange={(event) => changeRole(admin, event.target.value)}>{roles.map((item) => <option key={item} value={item}>{adminRoleLabels[item]}</option>)}</select>}</td>
        <td className="admin-date">{admin.createdAt ? displayDate(admin.createdAt) : "—"}</td>
      </tr>)}</tbody></table></div>
    </section>
    <section className="admin-panel-card">
      <div className="admin-panel-head"><div><h2>Add administrator</h2><p>Set a temporary password and share it with the team member securely.</p></div></div>
      <form className="admin-profile-form" onSubmit={addAdmin}>
        <label>Work email<input type="email" autoComplete="off" value={email} onChange={(event) => setEmail(event.target.value)} required/></label>
        <label>Temporary password<input type="password" autoComplete="new-password" minLength="12" maxLength="200" value={password} onChange={(event) => setPassword(event.target.value)} required/><small>At least 12 characters. The administrator can update it in Profile &amp; security.</small></label>
        <label>Workspace role<select value={role} onChange={(event) => setRole(event.target.value)}>{roles.map((item) => <option key={item} value={item}>{adminRoleLabels[item]}</option>)}</select></label>
        <CstButton className="admin-button primary" type="submit" disabled={busy}>{busy ? "Saving…" : "Add administrator"}</CstButton>
      </form>
    </section>
    <section className="admin-panel-card admin-role-guide"><div className="admin-panel-head"><div><h2>Role permissions</h2><p>These permissions are checked by the API.</p></div></div>
      <ul><li><strong>Owner</strong><span>Full workspace access, website settings, and team roles.</span></li><li><strong>Editor</strong><span>Create and revise drafts. Published content is protected.</span></li><li><strong>Publisher</strong><span>Manage, publish, and remove editorial content.</span></li><li><strong>Support</strong><span>Handle contact enquiries and newsletter subscribers.</span></li></ul>
    </section>
  </div>;
}
