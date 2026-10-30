import { CoreFormActions } from "@thinh-17/fe-core";

import { useAssignTenantRoles } from "../../hooks/useAssignTenantRoles.js";
import { useAssignmentRows } from "../../hooks/useAssignmentRows.js";
import { AccessPermissionsSection } from "./AccessPermissionsSection.jsx";

function seedAssignments(tenantAssignments) {
  return (tenantAssignments ?? []).map((assignment) => ({
    rowId: assignment.tenantId,
    tenantId: assignment.tenantId,
    roleIds: assignment.roles.map((role) => role.id),
  }));
}

/**
 * "Edit User" modal content (see edit_user.jpeg): a read-only basic-info
 * section (no PUT /api/v1/users/{id} yet) plus the editable Access &
 * Permissions section. Owns its own Save/Cancel footer, same as
 * TenantEditForm, since it's the one holding the assignments draft state
 * that POST /api/v1/users/{id}/tenant-assignments submits.
 */
export function UserDetailForm({ user, onCancel, onSaved }) {
  const { assignments, addAssignment, changeTenant, changeRoles, removeAssignment } = useAssignmentRows(
    seedAssignments(user.tenantAssignments)
  );
  const assignTenantRoles = useAssignTenantRoles();

  function handleSave() {
    const tenantAssignments = assignments
      .filter((assignment) => assignment.tenantId && assignment.roleIds.length > 0)
      .map((assignment) => ({ tenantId: assignment.tenantId, roleIds: assignment.roleIds }));

    assignTenantRoles.mutate({ id: user.id, tenantAssignments }, { onSuccess: onSaved });
  }

  return (
    <div>
      <div className="fe-field__grid">
        <label className="fe-field">
          Username
          <input className="fe-input" value={user.username || ""} disabled />
        </label>

        <label className="fe-field">
          Email
          <input className="fe-input" value={user.email || ""} disabled />
        </label>

        <label className="fe-field">
          First name
          <input className="fe-input" value={user.firstName || ""} disabled />
        </label>

        <label className="fe-field">
          Last name
          <input className="fe-input" value={user.lastName || ""} disabled />
        </label>

        <label className="fe-field">
          User category
          <input className="fe-input" value={user.userCategoryCode || ""} disabled />
        </label>
      </div>

      <AccessPermissionsSection
        assignments={assignments}
        onAddAssignment={addAssignment}
        onTenantChange={changeTenant}
        onRolesChange={changeRoles}
        onRemoveAssignment={removeAssignment}
      />

      {assignTenantRoles.isError && (
        <p className="user-list__error" role="alert">
          {assignTenantRoles.error?.response?.data?.message || "Failed to save role assignments."}
        </p>
      )}

      <div className="fe-modal__footer user-detail-form__footer">
        <CoreFormActions onCancel={onCancel} onConfirm={handleSave} confirmLoading={assignTenantRoles.isPending} />
      </div>
    </div>
  );
}
