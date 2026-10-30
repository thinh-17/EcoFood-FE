import { CoreButton, CoreMultiSelect, CoreSelect } from "@thinh-17/fe-core";
import { FiPlus, FiTrash2 } from "react-icons/fi";

import { useAllTenants } from "../../../tenant/hooks/useAllTenants.js";
import { deriveTenantActor } from "../../../tenant/lib/tenantActor.js";
import { useRolesByActor } from "../../../role/hooks/useRolesByActor.js";

/**
 * One assignment row — its own component (not inlined in a .map()) because
 * useRolesByActor depends on THIS row's chosen tenant, and hooks can't be
 * called conditionally/per-iteration inside a parent's render.
 */
function RoleAssignmentRow({ index, assignment, tenants, onTenantChange, onRolesChange, onRemove }) {
  const tenant = tenants.find((candidate) => candidate.id === assignment.tenantId);
  const actor = tenant ? deriveTenantActor(tenant.partnerTypeCode, tenant.tenantType) : null;
  const { data: roles, isLoading: isRolesLoading } = useRolesByActor(actor);

  const tenantOptions = tenants.map((candidate) => ({
    value: candidate.id,
    label: `${candidate.tenantName} (${candidate.realm})`,
  }));
  const roleOptions = (roles ?? []).map((role) => ({ value: role.id, label: role.code }));

  return (
    <div className="access-assignment">
      <div className="access-assignment__header">
        <span>Assignment #{index + 1}</span>
        <button
          type="button"
          className="access-assignment__remove"
          onClick={() => onRemove(index)}
          aria-label={`Remove assignment ${index + 1}`}
        >
          <FiTrash2 />
        </button>
      </div>

      <label className="fe-field">
        Entities*
        <CoreSelect
          value={assignment.tenantId}
          onChange={(tenantId) => onTenantChange(index, tenantId)}
          options={tenantOptions}
          placeholder="Select a tenant..."
        />
      </label>

      <label className="fe-field">
        Roles*
        <CoreMultiSelect
          selected={assignment.roleIds}
          onChange={(roleIds) => onRolesChange(index, roleIds)}
          options={roleOptions}
          placeholder={actor ? "Select roles..." : "Pick a tenant first"}
          searchPlaceholder="Search Roles ..."
          disabled={!actor || isRolesLoading}
        />
      </label>
    </div>
  );
}

/**
 * The "Edit User" modal's Access & Permissions section (see edit_user.jpeg):
 * current tenant+role assignments (from the user_role collection, via
 * UserDetailResponse.tenantAssignments) plus an "Add New Role Assignment"
 * flow. Purely a controlled list — all state lives in the parent
 * (UserDetailForm), which owns the single Save button that submits every
 * row via POST /api/v1/users/{id}/tenant-assignments.
 */
export function AccessPermissionsSection({
  assignments,
  onAddAssignment,
  onTenantChange,
  onRolesChange,
  onRemoveAssignment,
}) {
  const { data: tenants, isLoading: isTenantsLoading } = useAllTenants();

  return (
    <div className="access-permissions">
      <div className="access-permissions__header">
        <div>
          <h3>Access & Permissions</h3>
          <p>Assign the user to an organization and specify their role.</p>
        </div>
        <CoreButton type="button" onClick={onAddAssignment}>
          <FiPlus /> Add New Role Assignment
        </CoreButton>
      </div>

      {isTenantsLoading && <p>Loading tenants…</p>}

      {assignments.map((assignment, index) => (
        <RoleAssignmentRow
          key={assignment.rowId}
          index={index}
          assignment={assignment}
          tenants={tenants ?? []}
          onTenantChange={onTenantChange}
          onRolesChange={onRolesChange}
          onRemove={onRemoveAssignment}
        />
      ))}
    </div>
  );
}
