import { useState } from "react";

import { CoreFormActions } from "@thinh-17/fe-core";

import { useCreatePermission } from "../../hooks/useCreatePermission.js";

function validate(form) {
  const errors = {};
  if (!form.name.trim()) errors.name = "Name is required.";
  if (!form.code.trim()) errors.code = "Code is required.";
  return errors;
}

/**
 * "+ New Permission" modal content. Creates a standalone Permission row,
 * unattached to any Role — assign it to roles later via a role's Permissions
 * tab (see RolePermissionsForm).
 */
export function PermissionCreateForm({ onCancel, onCreated }) {
  const [form, setForm] = useState({ name: "", code: "", description: "" });
  const [fieldErrors, setFieldErrors] = useState({});

  const createPermission = useCreatePermission();

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
      description: form.description.trim() || undefined,
    };

    createPermission.mutate(payload, { onSuccess: onCreated });
  }

  return (
    <div>
      <div className="fe-field__grid">
        <label className="fe-field">
          Name*
          <input className="fe-input" value={form.name} onChange={handleChange("name")} />
          {fieldErrors.name && <span className="permission-list__error">{fieldErrors.name}</span>}
        </label>

        <label className="fe-field">
          Code*
          <input className="fe-input" value={form.code} onChange={handleChange("code")} />
          {fieldErrors.code && <span className="permission-list__error">{fieldErrors.code}</span>}
        </label>

        <label className="fe-field">
          Description
          <input className="fe-input" value={form.description} onChange={handleChange("description")} />
        </label>
      </div>

      {createPermission.isError && (
        <p className="permission-list__error" role="alert">
          {createPermission.error?.response?.data?.message || "Failed to create permission."}
        </p>
      )}

      <div className="fe-modal__footer permission-list__footer">
        <CoreFormActions
          onCancel={onCancel}
          onConfirm={handleSave}
          confirmLabel="Create permission"
          confirmLoading={createPermission.isPending}
        />
      </div>
    </div>
  );
}
