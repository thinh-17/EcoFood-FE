import { useState } from "react";
import { useNavigate } from "react-router-dom";

import { CoreFormActions, CoreMultiSelect, CorePageHeader, CoreSelect, CoreTabs } from "@thinh-17/fe-core";
import { FiInfo } from "react-icons/fi";

import { ROUTES } from "../../../../constants/routes.js";
import { useAllTenants } from "../../../tenant/hooks/useAllTenants.js";
import { useAllUsersForPicker } from "../../hooks/useAllUsersForPicker.js";
import { useCreateDataAccessRule } from "../../hooks/useCreateDataAccessRule.js";
import "./DataAccessRuleDetailPage.css";

const TABS = [
  { id: "configuration", label: "Rule Configuration" },
  { id: "users", label: "Users" },
];

// Hardcoded for now — no backend entity-type catalog exists yet (frontend-
// first, per explicit instruction). Swap for a real fetched list once one does.
const ENTITY_TYPE_OPTIONS = [
  { value: "Dashboard_bills", label: "Dashboard_bills" },
  { value: "Dashboard_Customer", label: "Dashboard_Customer" },
  { value: "Product", label: "Product" },
];

const INITIAL_FORM = {
  businessEntityId: "",
  ruleName: "",
  description: "",
  entityTypes: [],
  accessLevel: "LIMITED",
  limitedEntityIds: [],
};

function validate(form) {
  const errors = {};
  if (!form.businessEntityId) errors.businessEntityId = "Business Entity is required.";
  if (!form.ruleName.trim()) errors.ruleName = "Rule Name is required.";
  if (!form.description.trim()) errors.description = "Description is required.";
  if (form.accessLevel === "LIMITED" && form.limitedEntityIds.length === 0) {
    errors.limitedEntityIds = "Select at least one entity the users can access.";
  }
  return errors;
}

/**
 * "New Data Access Rule" page (see dar.jpeg) — a dedicated route (not a
 * modal), matching TenantOnboardingPage's own full-page pattern. Frontend
 * only: Save calls a stubbed createDataAccessRule endpoint that doesn't
 * exist on the backend yet (see useCreateDataAccessRule's API comment).
 *
 * businessEntityId is the TENANT this rule applies for; entityTypes is
 * which kinds of records within it the rule governs (e.g. Dashboard_bills,
 * Product). limitedEntityIds (shown only for Access Level = Limited Access)
 * reuses the same tenant list as a placeholder for "which specific entities
 * the users can access" — there's no finer-grained entity model in this
 * app yet, so tenant is the only real "entity" concept to scope by for now.
 */
export function DataAccessRuleDetailPage() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("configuration");
  const [form, setForm] = useState(INITIAL_FORM);
  const [userIds, setUserIds] = useState([]);
  const [fieldErrors, setFieldErrors] = useState({});

  const { data: tenants, isLoading: isTenantsLoading } = useAllTenants();
  const { data: users, isLoading: isUsersLoading } = useAllUsersForPicker();
  const createRule = useCreateDataAccessRule();

  const tenantOptions = (tenants ?? []).map((tenant) => ({
    value: tenant.id,
    label: `${tenant.tenantName} (${tenant.realm})`,
  }));
  const userOptions = (users ?? []).map((user) => ({
    value: user.id,
    label: `${user.firstName} ${user.lastName} (${user.email})`,
  }));

  // The "Limited Access" Entities picker should list actual records of
  // whichever Entity Type(s) are selected above (e.g. specific
  // Dashboard_bills rows) — there's no backend endpoint for entity records
  // yet, so this stays empty rather than reusing an unrelated list like
  // tenants. form.entityTypes is already threaded through so wiring the
  // real fetch later only needs to fill this in.
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
      businessEntityId: form.businessEntityId,
      ruleName: form.ruleName.trim(),
      description: form.description.trim(),
      entityTypes: form.entityTypes,
      accessLevel: form.accessLevel,
      limitedEntityIds: form.accessLevel === "LIMITED" ? form.limitedEntityIds : [],
      userIds,
    };

    createRule.mutate(payload, { onSuccess: () => navigate(ROUTES.DATA_ACCESS_RULES) });
  }

  return (
    <div className="eco-module-page dar-page">
      <CorePageHeader eyebrow="EcoFood Platform" title="New Data Access Rule" />

      <CoreTabs tabs={TABS} activeId={activeTab} onChange={setActiveTab} />

      {activeTab === "configuration" && (
        <div className="dar-tab-content">
          <div className="dar-banner">
            <FiInfo aria-hidden="true" />
            <p>Create Data Access Rules to define what transaction data is accessible and which users are allowed to access it.</p>
          </div>

          <section className="dar-section">
            <h2 className="dar-section__title">Business Entity Selection</h2>

            <label className="fe-field">
              Business Entity
              <CoreSelect
                value={form.businessEntityId}
                onChange={updateField("businessEntityId")}
                options={tenantOptions}
                placeholder={isTenantsLoading ? "Loading tenants..." : "Select a tenant..."}
                disabled={isTenantsLoading}
              />
              {fieldErrors.businessEntityId && (
                <span className="dar-error">{fieldErrors.businessEntityId}</span>
              )}
            </label>
          </section>

          <section className="dar-section">
            <h2 className="dar-section__title">Rule Information</h2>

            <label className="fe-field">
              Rule Name*
              <input
                className="fe-input"
                value={form.ruleName}
                onChange={(event) => updateField("ruleName")(event.target.value)}
              />
              {fieldErrors.ruleName && <span className="dar-error">{fieldErrors.ruleName}</span>}
            </label>

            <label className="fe-field">
              Description*
              <input
                className="fe-input"
                value={form.description}
                onChange={(event) => updateField("description")(event.target.value)}
              />
              {fieldErrors.description && <span className="dar-error">{fieldErrors.description}</span>}
            </label>

            <label className="fe-field">
              Entity Type
              <CoreMultiSelect
                selected={form.entityTypes}
                onChange={updateField("entityTypes")}
                options={ENTITY_TYPE_OPTIONS}
                placeholder="Select entity types..."
                searchPlaceholder="Search entity types..."
              />
            </label>
          </section>

          <section className="dar-section">
            <h2 className="dar-section__title">Access Level *</h2>

            <label className="dar-radio-option">
              <input
                type="radio"
                name="accessLevel"
                checked={form.accessLevel === "LIMITED"}
                onChange={() => updateField("accessLevel")("LIMITED")}
              />
              <span>
                <strong>Limited Access</strong>
                <span className="dar-radio-option__hint">
                  You will be able to select the Entities which the users can access. <FiInfo aria-hidden="true" />
                </span>
              </span>
            </label>

            {form.accessLevel === "LIMITED" && (
              <label className="fe-field dar-limited-entities">
                Entities
                <CoreMultiSelect
                  selected={form.limitedEntityIds}
                  onChange={updateField("limitedEntityIds")}
                  options={entityOptionsByType}
                  placeholder="Select entities..."
                  searchPlaceholder="Search entities..."
                />
                {fieldErrors.limitedEntityIds && (
                  <span className="dar-error">{fieldErrors.limitedEntityIds}</span>
                )}
              </label>
            )}

            <label className="dar-radio-option">
              <input
                type="radio"
                name="accessLevel"
                checked={form.accessLevel === "FULL"}
                onChange={() => updateField("accessLevel")("FULL")}
              />
              <span>
                <strong>Full Access</strong>
                <span className="dar-radio-option__hint">No further scoping — the users will see every entity.</span>
              </span>
            </label>
          </section>
        </div>
      )}

      {activeTab === "users" && (
        <div className="dar-tab-content">
          <section className="dar-section">
            <h2 className="dar-section__title">Users</h2>
            <p className="dar-section__description">Choose the users who will have this Data Access Rule.</p>

            <label className="fe-field">
              Users
              <CoreMultiSelect
                selected={userIds}
                onChange={setUserIds}
                options={userOptions}
                placeholder={isUsersLoading ? "Loading users..." : "Select users..."}
                searchPlaceholder="Search users..."
                disabled={isUsersLoading}
              />
            </label>
          </section>
        </div>
      )}

      {createRule.isError && (
        <p className="dar-error" role="alert">
          {createRule.error?.response?.data?.message || "Failed to save the data access rule."}
        </p>
      )}

      <div className="dar-actions">
        <CoreFormActions
          onCancel={() => navigate(ROUTES.DATA_ACCESS_RULES)}
          onConfirm={handleSave}
          confirmLabel="Save"
          confirmLoading={createRule.isPending}
        />
      </div>
    </div>
  );
}
