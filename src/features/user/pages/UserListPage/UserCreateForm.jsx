import { useState } from "react";

import { CoreFormActions, CoreSelect } from "@thinh-17/fe-core";

import { useAssignmentRows } from "../../hooks/useAssignmentRows.js";
import { useCreateUser } from "../../hooks/useCreateUser.js";
import { AccessPermissionsSection } from "./AccessPermissionsSection.jsx";

const USER_CATEGORY_OPTIONS = [
  { value: "CUSTOMER", label: "Customer" },
  { value: "PARTNER", label: "Partner" },
];

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validate(form, assignments) {
  const errors = {};

  if (!form.email.trim()) {
    errors.email = "Email is required.";
  } else if (!EMAIL_PATTERN.test(form.email.trim())) {
    errors.email = "Invalid email address.";
  }

  if (!assignments.some((assignment) => assignment.tenantId)) {
    errors.assignments = "At least one tenant assignment is required.";
  }

  return errors;
}

/**
 * "+ New User" modal content — same layout/sections as UserDetailForm (see
 * edit_user.jpeg), but every basic-info field is a live input instead of
 * disabled, since there's a real POST /api/v1/users behind it. Access &
 * Permissions starts empty: a brand-new user needs at least one initial
 * tenant assignment (UserCreateRequest.tenantAssignments is non-empty), but
 * unlike the edit form's Save, roleIds per assignment is optional here — a
 * user can be created with no role yet on a tenant.
 *
 * No Username field — UserCreateRequest.username is sent as a copy of the
 * email (a valid email never contains whitespace, so Keycloak's
 * no-whitespace username rule is always satisfied without a separate check).
 */
export function UserCreateForm({ onCancel, onCreated }) {
  const [form, setForm] = useState({
    email: "",
    firstName: "",
    lastName: "",
    userCategoryCode: "PARTNER",
  });
  const [fieldErrors, setFieldErrors] = useState({});
  const { assignments, addAssignment, changeTenant, changeRoles, removeAssignment } = useAssignmentRows([]);
  const createUser = useCreateUser();

  function handleChange(field) {
    return (event) => setForm((prev) => ({ ...prev, [field]: event.target.value }));
  }

  function handleSave() {
    const errors = validate(form, assignments);
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) {
      return;
    }

    const payload = {
      username: form.email.trim(),
      email: form.email.trim(),
      firstName: form.firstName.trim() || undefined,
      lastName: form.lastName.trim() || undefined,
      userCategoryCode: form.userCategoryCode,
      tenantAssignments: assignments
        .filter((assignment) => assignment.tenantId)
        .map((assignment) => ({
          tenantId: assignment.tenantId,
          roleIds: assignment.roleIds.length > 0 ? assignment.roleIds : undefined,
        })),
    };

    createUser.mutate(payload, { onSuccess: onCreated });
  }

  return (
    <div>
      <div className="fe-field__grid">
        <label className="fe-field">
          Email*
          <input className="fe-input" value={form.email} onChange={handleChange("email")} />
          {fieldErrors.email && <span className="user-create-form__error">{fieldErrors.email}</span>}
        </label>

        <label className="fe-field">
          First name
          <input className="fe-input" value={form.firstName} onChange={handleChange("firstName")} />
        </label>

        <label className="fe-field">
          Last name
          <input className="fe-input" value={form.lastName} onChange={handleChange("lastName")} />
        </label>

        <label className="fe-field">
          User category
          <CoreSelect
            value={form.userCategoryCode}
            onChange={(value) => setForm((prev) => ({ ...prev, userCategoryCode: value }))}
            options={USER_CATEGORY_OPTIONS}
          />
        </label>
      </div>

      <AccessPermissionsSection
        assignments={assignments}
        onAddAssignment={addAssignment}
        onTenantChange={changeTenant}
        onRolesChange={changeRoles}
        onRemoveAssignment={removeAssignment}
      />
      {fieldErrors.assignments && <span className="user-create-form__error">{fieldErrors.assignments}</span>}

      {createUser.isError && (
        <p className="user-list__error" role="alert">
          {createUser.error?.response?.data?.message || "Failed to create user."}
        </p>
      )}

      <div className="fe-modal__footer user-detail-form__footer">
        <CoreFormActions
          onCancel={onCancel}
          onConfirm={handleSave}
          confirmLabel="Create user"
          confirmLoading={createUser.isPending}
        />
      </div>
    </div>
  );
}
