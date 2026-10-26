import { CstButton } from "../../../components/common/ui-components";
import {useEffect, useState} from "react";

import {Check, ShieldCheck} from "lucide-react";
import {apiRequest} from "../../../api";



export default function AdminProfile() {
  const [profile, setProfile] = useState(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [recoveryEmail, setRecoveryEmail] = useState("");
  const [recoveryPhone, setRecoveryPhone] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [codeByChannel, setCodeByChannel] = useState({ email: "", phone: "" });
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function refreshProfile() {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);
    setProfileLoading(true);
    setError("");
    try {
      const result = await apiRequest("/api/admin/profile", { signal: controller.signal });
      setProfile(result.profile);
      setRecoveryEmail(result.profile.recoveryEmail || "");
      setRecoveryPhone(result.profile.recoveryPhone || "");
    } catch (requestError) {
      if (requestError.name === "AbortError") {
        throw new Error("Loading the administrator profile timed out. Check that the API server is running, then retry.");
      }
      throw requestError;
    } finally {
      clearTimeout(timeout);
      setProfileLoading(false);
    }
  }

  useEffect(() => { refreshProfile().catch((requestError) => setError(requestError.message)); }, []);

  async function saveRecoveryDetails(event) {
    event.preventDefault();
    setBusy(true); setError(""); setMessage("");
    try {
      const result = await apiRequest("/api/admin/profile", {
        method: "PUT",
        body: JSON.stringify({ recoveryEmail, recoveryPhone, currentPassword })
      });
      setProfile(result.profile);
      setCurrentPassword("");
      setMessage("Recovery contacts saved. Verify each method before it can be used for account recovery.");
    } catch (requestError) { setError(requestError.message); }
    finally { setBusy(false); }
  }

  async function requestVerification(channel) {
    setBusy(true); setError(""); setMessage("");
    try {
      const result = await apiRequest(`/api/admin/profile/recovery/${channel}/request-verification`, { method: "POST", body: "{}" });
      setMessage(result.message);
    } catch (requestError) { setError(requestError.message); }
    finally { setBusy(false); }
  }

  async function verifyContact(channel) {
    setBusy(true); setError(""); setMessage("");
    try {
      await apiRequest(`/api/admin/profile/recovery/${channel}/verify`, {
        method: "POST", body: JSON.stringify({ code: codeByChannel[channel] })
      });
      setCodeByChannel((current) => ({ ...current, [channel]: "" }));
      await refreshProfile();
      setMessage(`Recovery ${channel} verified.`);
    } catch (requestError) { setError(requestError.message); }
    finally { setBusy(false); }
  }

  async function changePassword(event) {
    event.preventDefault();
    const formElement = event.currentTarget;
    setBusy(true); setError(""); setMessage("");
    const form = new FormData(event.currentTarget);
    const nextPassword = form.get("newPassword");
    if (nextPassword !== form.get("confirmPassword")) {
      setError("The new passwords do not match."); setBusy(false); return;
    }
    try {
      await apiRequest("/api/admin/profile/password", {
        method: "POST",
        body: JSON.stringify({ currentPassword: form.get("currentPassword"), newPassword: nextPassword })
      });
      setCurrentPassword("");
      formElement.reset();
      setMessage("Password changed.");
    } catch (requestError) { setError(requestError.message); }
    finally { setBusy(false); }
  }

  if (!profile) return <section className="admin-panel-card admin-profile-load-state">
    {profileLoading
      ? <div className="admin-empty"><span className="admin-spinner"/>Loading profile…</div>
      : <div className="admin-empty"><ShieldCheck size={24}/><p>Could not load administrator profile.</p>{error&&<div className="admin-alert error" role="alert">{error}</div>}<CstButton className="admin-button secondary" type="button" onClick={() => refreshProfile().catch((requestError) => setError(requestError.message))}>Retry profile load</CstButton></div>}
  </section>;
  const channelCard = (channel, value, verifiedAt) => <article className="admin-security-channel" key={channel}>
    <div><strong>{channel === "email" ? "Recovery email" : "Recovery phone"}</strong><span>{value || "Not set"}</span></div>
    <span className={`admin-status ${verifiedAt ? "published" : "draft"}`}>{verifiedAt ? "Verified" : "Unverified"}</span>
    {!verifiedAt&&value&&<>
      <CstButton type="button" className="admin-button secondary" disabled={busy} onClick={() => requestVerification(channel)}>Send verification code</CstButton>
      <div className="admin-verify-row"><input aria-label={`${channel} verification code`} inputMode="numeric" pattern="[0-9]{6}" maxLength="6" placeholder="6-digit code" value={codeByChannel[channel]} onChange={(event) => setCodeByChannel((current) => ({ ...current, [channel]: event.target.value }))}/><CstButton type="button" className="admin-button primary" disabled={busy||codeByChannel[channel].length!==6} onClick={() => verifyContact(channel)}>Verify</CstButton></div>
    </>}
  </article>;
  return <div className="admin-profile-grid">
    <section className="admin-panel-card">
      <div className="admin-panel-head"><div><h2>Admin identity</h2><p>Only authenticated administrators can view or update this profile.</p></div><ShieldCheck size={21}/></div>
      <div className="admin-profile-readonly"><span>Sign-in email</span><strong>{profile.email}</strong></div>
      {error&&<div className="admin-alert error" role="alert">{error}</div>}{message&&<div className="admin-alert success" role="status">{message}</div>}
      <form className="admin-profile-form" onSubmit={saveRecoveryDetails}>
        <label>Recovery email<input type="email" autoComplete="email" value={recoveryEmail} onChange={(event) => setRecoveryEmail(event.target.value)} placeholder="name@company.com"/></label>
        <label>Recovery phone<input type="tel" autoComplete="tel" value={recoveryPhone} onChange={(event) => setRecoveryPhone(event.target.value)} placeholder="+14155552671"/><small>Include country code in international format.</small></label>
        <label>Current password<input type="password" autoComplete="current-password" value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} required/></label>
        <CstButton className="admin-button primary" type="submit" disabled={busy}>Save recovery contacts</CstButton>
      </form>
      <div className="admin-security-list">{channelCard("email", profile.recoveryEmail, profile.recoveryEmailVerifiedAt)}{channelCard("phone", profile.recoveryPhone, profile.recoveryPhoneVerifiedAt)}</div>
    </section>
    <section className="admin-panel-card">
      <div className="admin-panel-head"><div><h2>Change password</h2><p>Use a unique password with at least 12 characters.</p></div></div>
      <form className="admin-profile-form" onSubmit={changePassword}>
        <label>Current password<input name="currentPassword" type="password" autoComplete="current-password" required/></label>
        <label>New password<input name="newPassword" type="password" autoComplete="new-password" minLength="12" maxLength="200" required/></label>
        <label>Confirm new password<input name="confirmPassword" type="password" autoComplete="new-password" minLength="12" maxLength="200" required/></label>
        <CstButton className="admin-button primary" type="submit" disabled={busy}>Update password</CstButton>
      </form>
      <div className="admin-security-note"><ShieldCheck size={17}/><p>Recovery codes expire after 10 minutes and are limited to five attempts. All active admin sessions are signed out after a password reset.</p></div>
    </section>
  </div>;
}
