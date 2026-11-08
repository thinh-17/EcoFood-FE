import { useState } from "react";

import { CoreFormActions, CoreMultiSelect, CoreSelect, CoreTabs } from "@thinh-17/fe-core";

import { useAllUsersForPicker } from "../../hooks/useAllUsersForPicker.js";
import { useUpdateDataAccessRule } from "../../hooks/useUpdateDataAccessRule.js";

const TABS = [
  { id: "configuration", label: "Rule Configuration" },
  { id: "users", label: "Users" },
];

// Same hardcoded list as DataAccessRuleDetailPage's create form — no
// backend entity-type catalog exists yet.
const ENTITY_TYPE_OPTIONS = [
  { value: "Dashboard_bills", label: "Dashboard_bills" },
  { value: "Dashboard_Customer", label: "Dashboard_Customer" },
  { value: "Product", label: "Product" },
];

function validate(form) {
  const errors = {};
  if (!form.ruleName.trim()) errors.ruleName = "Rule Name is required.";
  if (!form.description.trim()) errors.description = "Description is required.";
  if (form.accessLevel === "LIMITED_ACCESS" && form.limitedEntityIds.length === 0) {
    errors.limitedEntityIds = "Select at least one entity the users can access.";
  }
  return errors;
}

/**
 * "Edit Data Access Rule" modal content — same concept as TenantEditForm/
 * UserDetailForm: owns its own Save/Cancel footer, seeded from the row-click
 * GET /api/v1/data-access-rules/{id} response. businessEntityId/Name is
 * shown but never editable (matches the backend's UpdateDataAccessRuleRequest,
 * which has no such field). Every other field is disabled, and Save is
 * hidden, unless rule.editable is true — only the rule's own creator may
 * edit it (server-enforced too; this is just matching UI to that rule).
 */
export function DataAccessRuleDetailForm({ rule, onCancel, onSaved }) {
  const [activeTab, setActiveTab] = useState("configuration");
  const [form, setForm] = useState({
    ruleName: rule.ruleName ?? "",
    description: rule.description ?? "",
    accessEntityType: rule.accessEntityType ?? "",
    accessLevel: rule.accessLevel ?? "LIMITED_ACCESS",
    limitedEntityIds: rule.limitedEntityIds ?? [],
  });
  const [userIds, setUserIds] = useState(rule.userIds ?? []);
  const [fieldErrors, setFieldErrors] = useState({});

  const { data: users, isLoading: isUsersLoading } = useAllUsersForPicker();
  const updateRule = useUpdateDataAccessRule();

  const userOptions = (users ?? []).map((user) => ({
    value: user.id,
    label: `${user.firstName} ${user.lastName} (${user.email})`,
  }));

  // Same placeholder-until-a-real-entity-record-endpoint-exists gap as the
  // create form — see DataAccessRuleDetailPage.jsx's own comment on this.
  const entityOptionsByType = [];

  function updateField(field) {
    return (value) => setForm((prev) => ({ ...prev, [field]: value }));
  }

  function handleSave() {
    const errors = validate(form);
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) {
      setActiveTab("configuration");
      return;
    }

    const payload = {
      ruleName: form.ruleName.trim(),
      description: form.description.trim(),
      accessEntityType: form.accessEntityType || undefined,
      accessLevel: form.accessLevel,
      limitedEntityIds: form.accessLevel === "LIMITED_ACCESS" ? form.limitedEntityIds : [],
      userIds,
    };

    updateRule.mutate({ id: rule.id, payload }, { onSuccess: onSaved });
  }

  return (
    <div>
      <CoreTabs tabs={TABS} activeId={activeTab} onChange={setActiveTab} />

      {!rule.editable && (
        <p className="dar-error" role="alert" style={{ marginTop: 12 }}>
          Only the creator of this rule can edit it — fields are shown read-only.
        </p>
      )}

      {activeTab === "configuration" && (
        <div className="fe-field__grid" style={{ marginTop: 16 }}>
          <label className="fe-field">
            Business Entity
            <input className="fe-input" value={rule.businessEntityName || ""} disabled />
          </label>

          <label className="fe-field">
            Rule Name*
            <input
              className="fe-input"
              value={form.ruleName}
              onChange={(event) => updateField("ruleName")(event.target.value)}
              disabled={!rule.editable}
            />
            {fieldErrors.ruleName && <span className="dar-error">{fieldErrors.ruleName}</span>}
          </label>

          <label className="fe-field">
            Description*
            <input
              className="fe-input"
              value={form.description}
              onChange={(event) => updateField("description")(event.target.value)}
              disabled={!rule.editable}
            />
            {fieldErrors.description && <span className="dar-error">{fieldErrors.description}</span>}
          </label>

          <label className="fe-field">
            Entity Type
            <CoreSelect
              value={form.accessEntityType}
              onChange={updateField("accessEntityType")}
              options={ENTITY_TYPE_OPTIONS}
              placeholder="Select an entity type..."
              disabled={!rule.editable}
            />
          </label>

          <label className="fe-field">
            Access Level
            <div className="fe-radio-group">
              <label>
                <input
                  type="radio"
                  name="accessLevel"
                  checked={form.accessLevel === "LIMITED_ACCESS"}
                  onChange={() => updateField("accessLevel")("LIMITED_ACCESS")}
                  disabled={!rule.editable}
                />
                Limited Access
              </label>
              <label>
                <input
                  type="radio"
                  name="accessLevel"
                  checked={form.accessLevel === "FULL_ACCESS"}
                  onChange={() => updateField("accessLevel")("FULL_ACCESS")}
                  disabled={!rule.editable}
                />
                Full Access
              </label>
            </div>
          </label>

          {form.accessLevel === "LIMITED_ACCESS" && (
            <label className="fe-field">
              Entities
              <CoreMultiSelect
                selected={form.limitedEntityIds}
                onChange={updateField("limitedEntityIds")}
                options={entityOptionsByType}
                placeholder="Select entities..."
                searchPlaceholder="Search entities..."
                disabled={!rule.editable}
              />
              {fieldErrors.limitedEntityIds && (
                <span className="dar-error">{fieldErrors.limitedEntityIds}</span>
              )}
            </label>
          )}
        </div>
      )}

      {activeTab === "users" && (
        <div style={{ marginTop: 16 }}>
          <label className="fe-field">
            Users
            <CoreMultiSelect
              selected={userIds}
              onChange={setUserIds}
              options={userOptions}
              placeholder={isUsersLoading ? "Loading users..." : "Select users..."}
              searchPlaceholder="Search users..."
              disabled={isUsersLoading || !rule.editable}
            />
          </label>
        </div>
      )}

      {updateRule.isError && (
        <p className="dar-error" role="alert">
          {updateRule.error?.response?.data?.message || "Failed to save the data access rule."}
        </p>
      )}

      <div className="fe-modal__footer dar-detail-form__footer">
        <CoreFormActions
          onCancel={onCancel}
          onConfirm={handleSave}
          confirmLabel="Save"
          confirmDisabled={!rule.editable}
          confirmLoading={updateRule.isPending}
        />
      </div>
    </div>
  );
}
