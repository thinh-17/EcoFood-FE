import { ENTITY_TYPE_OPTIONS } from "../../lib/entityTypes.js";
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


const INITIAL_FORM = {
  businessEntityId: "",
  ruleName: "",
  description: "",
  accessEntityTypes: [],
};

function validate(form) {
  const errors = {};
  if (!form.businessEntityId) errors.businessEntityId = "Business Entity is required.";
  if (!form.ruleName.trim()) errors.ruleName = "Rule Name is required.";
  if (!form.description.trim()) errors.description = "Description is required.";
  if (!form.accessEntityTypes.length) errors.accessEntityTypes = "Select at least one dashboard.";
  return errors;
}

/**
 * "New Data Access Rule" page (see dar.jpeg) — a dedicated route (not a
 * modal), matching TenantOnboardingPage's own full-page pattern. Save calls
 * POST /api/v1/data-access-rules (DataAccessRuleController.create), which
 * writes a Group (groupType=ACCESS_CONTROL_GROUP) + its GroupEntity child +
 * an update to each selected user's own UserGroupEntity.
 *
 * Access Level is fixed to Full Access while Limited Access is unavailable.
 */
export function DataAccessRuleDetailPage() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("configuration");
  const [form, setForm] = useState(INITIAL_FORM);
  const [userIds, setUserIds] = useState([]);
  const [fieldErrors, setFieldErrors] = useState({});

  const { data: tenants, isLoading: isTenantsLoading } = useAllTenants();
  const { data: users, isLoading: isUsersLoading } = useAllUsersForPicker(form.businessEntityId);
  const createRule = useCreateDataAccessRule();

  const tenantOptions = (tenants ?? []).map((tenant) => ({
    value: tenant.id,
    label: `${tenant.tenantName} (${tenant.realm})`,
  }));
  const userOptions = (users ?? []).map((user) => ({
    value: user.id,
    label: `${user.firstName} ${user.lastName} (${user.email})`,
  }));


  function updateField(field) {
    return (value) => {
      if (field === "businessEntityId") setUserIds([]);
      setForm((prev) => ({ ...prev, [field]: value }));
    };
  }

  function handleNext() {
    const errors = validate(form);
    setFieldErrors(errors);
    if (Object.keys(errors).length === 0) setActiveTab("users");
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
      accessEntityTypes: form.accessEntityTypes,
      accessLevel: "FULL_ACCESS",
      limitedEntityIds: [],
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
                selected={form.accessEntityTypes}
                onChange={updateField("accessEntityTypes")}
                options={ENTITY_TYPE_OPTIONS}
                placeholder="Select dashboard types..."
              />
              {fieldErrors.accessEntityTypes && <span className="dar-error">{fieldErrors.accessEntityTypes}</span>}
            </label>
          </section>

          <section className="dar-section">
            <h2 className="dar-section__title">Access Level *</h2>

            <label className="dar-radio-option">
              <input
                type="radio"
                name="accessLevel"
                checked={false}
                disabled
              />
              <span>
                <strong>Limited Access</strong>
                <span className="dar-radio-option__hint">
                  Temporarily unavailable.
                </span>
              </span>
            </label>

            <label className="dar-radio-option">
              <input
                type="radio"
                name="accessLevel"
                checked
                disabled
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
          onConfirm={activeTab === "configuration" ? handleNext : handleSave}
          confirmLabel={activeTab === "configuration" ? "Next" : "Save"}
          confirmLoading={activeTab === "users" && createRule.isPending}
        />
      </div>
    </div>
  );
}
