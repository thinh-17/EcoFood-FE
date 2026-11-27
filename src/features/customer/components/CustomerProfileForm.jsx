import { useState } from "react";
import { CoreCard, CoreFormActions } from "@thinh-17/fe-core";
import { customerProfilePayload } from "../customer.lib.js";

export function CustomerProfileForm({ profile, busy, save, reset }) {
  const [firstName, setFirstName] = useState(profile.firstName || "");
  const [lastName, setLastName] = useState(profile.lastName || "");
  const [validation, setValidation] = useState("");
  const changed = firstName !== (profile.firstName || "") || lastName !== (profile.lastName || "");
  function cancel() {
    setFirstName(profile.firstName || ""); setLastName(profile.lastName || ""); setValidation(""); reset();
  }
  function submit(event) {
    event.preventDefault();
    try { const payload = customerProfilePayload({ firstName, lastName }, profile); setValidation(""); save(payload); }
    catch (failure) { setValidation(failure.message); }
  }
  return <CoreCard title="Personal information" description="Keep your name up to date. Your verified email is read-only."
    className="customer-panel customer-profile-card">
    <form className="customer-profile-form" onSubmit={submit}>
      <div className="customer-profile-fields">
        <label className="fe-field">First name<input className="fe-input" autoComplete="given-name" required maxLength={100}
          value={firstName} onChange={(event) => setFirstName(event.target.value)} disabled={busy} /></label>
        <label className="fe-field">Last name<input className="fe-input" autoComplete="family-name" required maxLength={100}
          value={lastName} onChange={(event) => setLastName(event.target.value)} disabled={busy} /></label>
        <label className="fe-field">Email<input className="fe-input" type="email" readOnly value={profile.email || ""}
          aria-describedby="customer-email-help" /></label>
        <label className="fe-field">Username<input className="fe-input" readOnly value={profile.username || ""} /></label>
      </div>
      <p id="customer-email-help" className="customer-profile-hint">Email and sign-in details are managed by your identity provider.</p>
      {validation && <p className="customer-error" role="alert">{validation}</p>}
      <div className="customer-profile-actions"><CoreFormActions cancelLabel="Reset" onCancel={cancel}
        confirmLabel="Save changes" confirmType="submit" confirmLoading={busy} confirmDisabled={!changed} /></div>
    </form>
  </CoreCard>;
}
