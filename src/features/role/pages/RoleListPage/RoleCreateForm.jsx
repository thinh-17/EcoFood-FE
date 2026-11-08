import { useState } from "react";

import { CoreFormActions, CoreSelect } from "@thinh-17/fe-core";

import { useGroupDirectory } from "../../../group/hooks/useGroupDirectory.js";
import { useCreateRole } from "../../hooks/useCreateRole.js";

const ROLE_TYPE_OPTIONS = [
  { value: "Functional", label: "Functional" },
  { value: "Administrative", label: "Administrative" },
];

const NO_GROUP_VALUE = "";

function validate(form) {
  const errors = {};
  if (!form.name.trim()) errors.name = "Name is required.";
  if (!form.code.trim()) errors.code = "Code is required.";
  return errors;
}

/**
 * "+ New Role" modal content. The Group field is optional — picking an
 * existing group links the new role into that group's GroupRole doc in the
 * same POST /api/v1/roles call (see RoleController.createRole).
 */
export function RoleCreateForm({ onCancel, onCreated }) {
  const [form, setForm] = useState({
    name: "",
    code: "",
    roleType: "Functional",
    groupId: NO_GROUP_VALUE,
  });
  const [fieldErrors, setFieldErrors] = useState({});

  const { data: groups, isLoading: isGroupsLoading } = useGroupDirectory();
  const createRole = useCreateRole();

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

    createRole.mutate(payload, { onSuccess: onCreated });
  }

  return (
    <div>
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

      {createRole.isError && (
        <p className="role-list__error" role="alert">
          {createRole.error?.response?.data?.message || "Failed to create role."}
        </p>
      )}

      <div className="fe-modal__footer role-list__footer">
        <CoreFormActions
          onCancel={onCancel}
          onConfirm={handleSave}
          confirmLabel="Create role"
          confirmLoading={createRole.isPending}
        />
      </div>
    </div>
  );
}
