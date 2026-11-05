import { useEffect, useState } from "react";

import { CoreFormActions, CoreSelect, CoreTabs } from "@thinh-17/fe-core";

import { useGroupDirectory } from "../../../group/hooks/useGroupDirectory.js";
import { useUpdateRole } from "../../hooks/useUpdateRole.js";
import { RolePermissionsForm } from "./RolePermissionsForm.jsx";

const ROLE_TYPE_OPTIONS = [
  { value: "Functional", label: "Functional" },
  { value: "Administrative", label: "Administrative" },
];

const NO_GROUP_VALUE = "";

const TABS = [
  { id: "details", label: "Details" },
  { id: "permissions", label: "Permissions" },
];

function validate(form) {
  const errors = {};
  if (!form.name.trim()) errors.name = "Name is required.";
  if (!form.code.trim()) errors.code = "Code is required.";
  return errors;
}

/**
 * "Edit Role" modal content — row-click on the Roles tab opens this.
 * Details and Permissions are separate concerns against separate endpoints
 * (PUT /api/v1/roles/{id} vs POST /api/v1/roles/{id}/permissions), so each
 * tab owns its own Save action rather than sharing one combined payload.
 */
export function RoleDetailForm({ role, onCancel, onSaved }) {
  const [activeTab, setActiveTab] = useState("details");
  const [form, setForm] = useState({
    name: role.name ?? "",
    code: role.code ?? "",
    roleType: role.roleType ?? "Functional",
    groupId: role.groupId ?? NO_GROUP_VALUE,
  });
  const [fieldErrors, setFieldErrors] = useState({});

  useEffect(() => {
    setForm({
      name: role.name ?? "",
      code: role.code ?? "",
      roleType: role.roleType ?? "Functional",
      groupId: role.groupId ?? NO_GROUP_VALUE,
    });
  }, [role]);

  const { data: groups, isLoading: isGroupsLoading } = useGroupDirectory();
  const updateRole = useUpdateRole();

  const groupOptions = [
    { value: NO_GROUP_VALUE, label: "No group" },
    ...(groups ?? []).map((group) => ({ value: group.id, label: group.name })),
  ];

  function handleChange(field) {
    return (event) => setForm((prev) => ({ ...prev, [field]: event.target.value }));
  }

  function handleSave() {
    const errors = validate(form);
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) {
      return;
    }

    const payload = {
      name: form.name.trim(),
      code: form.code.trim(),
      roleType: form.roleType,
      groupId: form.groupId || undefined,
    };

    updateRole.mutate({ id: role.id, payload }, { onSuccess: onSaved });
  }

  return (
    <div>
      <CoreTabs tabs={TABS} activeId={activeTab} onChange={setActiveTab} />

      {activeTab === "details" && (
        <div style={{ marginTop: 16 }}>
          <div className="fe-field__grid">
            <label className="fe-field">
              Name*
              <input className="fe-input" value={form.name} onChange={handleChange("name")} />
              {fieldErrors.name && <span className="role-list__error">{fieldErrors.name}</span>}
            </label>

            <label className="fe-field">
              Code*
              <input className="fe-input" value={form.code} onChange={handleChange("code")} />
              {fieldErrors.code && <span className="role-list__error">{fieldErrors.code}</span>}
            </label>

            <label className="fe-field">
              Role type
              <CoreSelect
                value={form.roleType}
                onChange={(value) => setForm((prev) => ({ ...prev, roleType: value }))}
                options={ROLE_TYPE_OPTIONS}
              />
            </label>

            <label className="fe-field">
              Group
              <CoreSelect
                value={form.groupId}
                onChange={(value) => setForm((prev) => ({ ...prev, groupId: value }))}
                options={groupOptions}
                placeholder={isGroupsLoading ? "Loading groups..." : "Select a group..."}
                disabled={isGroupsLoading}
              />
            </label>
          </div>

          {updateRole.isError && (
            <p className="role-list__error" role="alert">
              {updateRole.error?.response?.data?.message || "Failed to save role."}
            </p>
          )}

          <div className="fe-modal__footer role-list__footer">
            <CoreFormActions
              onCancel={onCancel}
              onConfirm={handleSave}
              confirmLabel="Save"
              confirmLoading={updateRole.isPending}
            />
          </div>
        </div>
      )}

      {activeTab === "permissions" && (
        <div style={{ marginTop: 16 }}>
          <RolePermissionsForm role={role} onCancel={onCancel} onSaved={onSaved} />
        </div>
      )}
    </div>
  );
}
