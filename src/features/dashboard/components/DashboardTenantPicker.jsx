import { useState } from "react";
import { tenantLabel } from "../../../lib/tenantLabel.js";
import "./DashboardTenantPicker.css";

export function DashboardTenantPicker({ tenants, selected, onChange }) {
  const [search, setSearch] = useState("");
  const available = tenants.filter((tenant) => tenant.accessible !== false);
  const all = available.length > 0 && available.every((tenant) => selected.includes(tenant.id));
  const names = tenants.filter((tenant) => selected.includes(tenant.id)).map(tenantLabel);
  const toggle = (id) => onChange(selected.includes(id) ? selected.filter((value) => value !== id) : [...selected, id]);
  return <div className="fe-field business-filter dashboard-tenant-picker">
    <span>Tenant</span>
    <details onKeyDown={(event) => { if (event.key === "Escape") event.currentTarget.open = false; }}>
      <summary aria-label="Select tenants" title={names.join(", ")}>{all ? "All accessible tenants" : names.join(", ") || "Select tenants…"}</summary>
      <div className="dashboard-tenant-picker__panel">
        <input className="fe-input" type="search" aria-label="Search tenants" placeholder="Search tenants…" value={search} onChange={(event) => setSearch(event.target.value)} />
        <label className="dashboard-tenant-picker__all"><input type="checkbox" checked={all} disabled={!available.length}
          ref={(element) => { if (element) element.indeterminate = selected.length > 0 && !all; }}
          onChange={() => onChange(all ? [] : available.map((tenant) => tenant.id))} />All accessible tenants</label>
        <div className="dashboard-tenant-picker__options">
          {tenants.filter((tenant) => tenantLabel(tenant).toLowerCase().includes(search.toLowerCase())).map((tenant) =>
            <label key={tenant.id} className={tenant.accessible === false ? "dashboard-tenant-picker__disabled" : ""}>
              <input type="checkbox" checked={selected.includes(tenant.id)} disabled={tenant.accessible === false} onChange={() => toggle(tenant.id)} />
              <span>{tenantLabel(tenant)}{tenant.accessible === false && <small>No data access</small>}</span>
            </label>)}
        </div>
      </div>
    </details>
  </div>;
}
