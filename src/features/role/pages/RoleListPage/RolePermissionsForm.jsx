import { useEffect, useState } from "react";

import { CoreFormActions, CoreMultiSelect } from "@thinh-17/fe-core";

import { usePermissionDirectory } from "../../../permission/hooks/usePermissionDirectory.js";
import { useAddPermissionsToRole } from "../../hooks/useAddPermissionsToRole.js";
import { useRolePermissions } from "../../hooks/useRolePermissions.js";

/**
 * "Manage Permissions" modal content — row-click on a role opens this,
 * prefilled from GET /api/v1/roles/{roleId}/permissions. Save is additive
 * (never un-assigns a permission already on the role), matching
 * RolePermissionService.addPermissionsToRole's semantics.
 */
export function RolePermissionsForm({ role, onCancel, onSaved }) {
  const [permissionIds, setPermissionIds] = useState([]);

  const { data: allPermissions, isLoading: isPermissionsLoading } = usePermissionDirectory();
  const { data: rolePermissions, isLoading: isAssignedLoading, isError } = useRolePermissions(role.id);
  const addPermissions = useAddPermissionsToRole();

  useEffect(() => {
    if (rolePermissions) {
      setPermissionIds(rolePermissions.permissions.map((permission) => permission.id));
    }
  }, [rolePermissions]);

  const permissionOptions = (allPermissions ?? []).map((permission) => ({
    value: permission.id,
    label: permission.name,
  }));

  function handleSave() {
    addPermissions.mutate({ roleId: role.id, permissionIds }, { onSuccess: onSaved });
  }

  return (
    <div>
      <label className="fe-field">
        Permissions
        <CoreMultiSelect
          selected={permissionIds}
          onChange={setPermissionIds}
          options={permissionOptions}
          placeholder={isPermissionsLoading || isAssignedLoading ? "Loading..." : "Select permissions..."}
          searchPlaceholder="Search permissions..."
          disabled={isPermissionsLoading || isAssignedLoading}
        />
      </label>

      {isError && (
        <p className="role-list__error" role="alert">
          Failed to load this role's current permissions.
        </p>
      )}

      {addPermissions.isError && (
        <p className="role-list__error" role="alert">
          {addPermissions.error?.response?.data?.message || "Failed to save permissions."}
        </p>
      )}

      <div className="fe-modal__footer role-list__footer">
        <CoreFormActions
          onCancel={onCancel}
          onConfirm={handleSave}
          confirmLabel="Save"
          confirmLoading={addPermissions.isPending}
        />
      </div>
    </div>
  );
}
