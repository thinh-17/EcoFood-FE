import { useState } from "react";

import { CoreFormActions } from "@thinh-17/fe-core";

import { useUpdatePermission } from "../../hooks/useUpdatePermission.js";

function validate(form) {
  const errors = {};
  if (!form.name.trim()) errors.name = "Name is required.";
  if (!form.code.trim()) errors.code = "Code is required.";
  return errors;
}

/** "Edit Permission" modal content — row-click on the Permissions tab opens this. */
export function PermissionDetailForm({ permission, onCancel, onSaved }) {
  const [form, setForm] = useState({
    name: permission.name ?? "",
    code: permission.code ?? "",
    description: permission.description ?? "",
  });
  const [fieldErrors, setFieldErrors] = useState({});

  const updatePermission = useUpdatePermission();

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

    updatePermission.mutate({ id: permission.id, payload }, { onSuccess: onSaved });
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

      {updatePermission.isError && (
        <p className="permission-list__error" role="alert">
          {updatePermission.error?.response?.data?.message || "Failed to save permission."}
        </p>
      )}

      <div className="fe-modal__footer permission-list__footer">
        <CoreFormActions
          onCancel={onCancel}
          onConfirm={handleSave}
          confirmLabel="Save"
          confirmLoading={updatePermission.isPending}
        />
      </div>
    </div>
  );
}
