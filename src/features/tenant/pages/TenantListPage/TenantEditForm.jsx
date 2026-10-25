import { useState } from "react";

import { CoreFormActions, CoreTabs } from "@thinh-17/fe-core";

import { useUpdateTenant } from "../../hooks/useUpdateTenant.js";

const TABS = [
  { id: "basic", label: "Basic Information" },
  { id: "configuration", label: "Configuration" },
  { id: "contact", label: "Contact" },
];

const EMPTY_COMMUNICATION_DETAIL = {
  addressLine1: "",
  addressLine2: "",
  isoCityCode: "",
  isoCountryCode: "",
  postalCode: "",
  phoneNumber: "",
  emailAddress: "",
};

// Onboarding always creates exactly one Communication with one
// CommunicationDetail (see TenantOnboardingPage's Contact Information
// section) — seeding falls back to that single-entry shape when a tenant
// has none yet, so there's always at least one editable row.
function seedContact(contact) {
  const communications = contact?.communications?.length
    ? contact.communications
    : [{ communicationChannelName: "", communicationDetails: [EMPTY_COMMUNICATION_DETAIL] }];

  return {
    contactPartyName: contact?.contactPartyName ?? "",
    contactPartyLastName: contact?.contactPartyLastName ?? "",
    contactDepartment: contact?.contactDepartment ?? "",
    contactDesignation: contact?.contactDesignation ?? "",
    communications: communications.map((communication) => ({
      communicationChannelName: communication.communicationChannelName ?? "",
      communicationDetails: (communication.communicationDetails?.length
        ? communication.communicationDetails
        : [EMPTY_COMMUNICATION_DETAIL]
      ).map((detail) => ({
        addressLine1: detail.addressLine1 ?? "",
        addressLine2: detail.addressLine2 ?? "",
        isoCityCode: detail.isoCityCode ?? "",
        isoCountryCode: detail.isoCountryCode ?? "",
        postalCode: detail.postalCode ?? "",
        phoneNumber: detail.phoneNumber ?? "",
        emailAddress: detail.emailAddress ?? "",
      })),
    })),
  };
}

/**
 * Edit form content for the tenant detail popup — mirrors DCMP's own
 * "Edit Tenant" dialog layout (tabs, label-above-input fields, a disabled
 * field for anything not editable post-onboarding). Keyed by tenant.id at
 * the call site so it remounts (and re-seeds its draft state) fresh every
 * time a different tenant is opened, rather than fighting stale state via
 * effects.
 *
 * "Brand Customization" (DCMP's third tab — footer/logo/favicon) is
 * intentionally omitted: this project's tenant model has no such fields.
 *
 * Owns its own Save/Cancel footer (rather than TenantListPage passing one
 * into CoreModal's `footer` prop) because it's the one holding the draft
 * state PUT /api/v1/tenants/{id} needs to submit — only tenantName + contact
 * are sent, matching TenantUpdateRequest's own narrow shape; Realm/Client
 * ID/Partner Type/Tenant Type/Domain stay disabled and are never submitted.
 */
export function TenantEditForm({ tenant, onCancel, onSaved }) {
  const [activeTab, setActiveTab] = useState("basic");
  const [form, setForm] = useState({
    tenantName: tenant.tenantName ?? "",
    contact: seedContact(tenant.contact),
  });

  const updateTenant = useUpdateTenant();

  function handleChange(field) {
    return (event) => setForm((previous) => ({ ...previous, [field]: event.target.value }));
  }

  function handleContactFieldChange(field) {
    return (event) =>
      setForm((previous) => ({
        ...previous,
        contact: { ...previous.contact, [field]: event.target.value },
      }));
  }

  function handleContactDetailChange(communicationIndex, detailIndex, field) {
    return (event) => {
      const value = event.target.value;
      setForm((previous) => ({
        ...previous,
        contact: {
          ...previous.contact,
          communications: previous.contact.communications.map((communication, cIndex) => {
            if (cIndex !== communicationIndex) return communication;
            return {
              ...communication,
              communicationDetails: communication.communicationDetails.map((detail, dIndex) =>
                dIndex !== detailIndex ? detail : { ...detail, [field]: value },
              ),
            };
          }),
        },
      }));
    };
  }

  function handleSave() {
    updateTenant.mutate(
      { id: tenant.id, payload: { tenantName: form.tenantName, contact: form.contact } },
      { onSuccess: onSaved },
    );
  }

  return (
    <div>
      <CoreTabs tabs={TABS} activeId={activeTab} onChange={setActiveTab} />

      {activeTab === "basic" && (
        <div className="fe-field__grid">
          <label className="fe-field">
            Tenant Name*
            <input className="fe-input" value={form.tenantName} onChange={handleChange("tenantName")} />
          </label>

          <label className="fe-field">
            Partner Type
            <input className="fe-input" value={tenant.partnerTypeCode || ""} disabled />
          </label>

          <label className="fe-field">
            Tenant Type
            <input className="fe-input" value={tenant.tenantType || ""} disabled />
          </label>
        </div>
      )}

      {activeTab === "configuration" && (
        <div className="fe-field__grid">
          <label className="fe-field">
            Domain
            <input className="fe-input" value={tenant.domainUrl || ""} disabled />
          </label>

          <label className="fe-field">
            Realm
            <input className="fe-input" value={tenant.realm || ""} disabled />
          </label>

          <label className="fe-field">
            Client ID
            <input className="fe-input" value={tenant.clientId || ""} disabled />
          </label>
        </div>
      )}

      {activeTab === "contact" && (
        <ContactTab
          contact={form.contact}
          onFieldChange={handleContactFieldChange}
          onDetailChange={handleContactDetailChange}
        />
      )}

      {updateTenant.isError && (
        <p className="tenant-list__error" role="alert">
          {updateTenant.error?.response?.data?.message || "Failed to save tenant."}
        </p>
      )}

      <div className="fe-modal__footer tenant-edit-form__footer">
        <CoreFormActions
          onCancel={onCancel}
          onConfirm={handleSave}
          confirmLoading={updateTenant.isPending}
        />
      </div>
    </div>
  );
}

/**
 * Field labels match TenantOnboardingPage's own Contact Information section
 * wording for consistency. Editable (unlike Configuration's disabled
 * fields) — see TenantEditForm's own javadoc on why Save still can't
 * persist any of it yet.
 */
function ContactTab({ contact, onFieldChange, onDetailChange }) {
  return (
    <div>
      <div className="fe-field__grid">
        <label className="fe-field">
          Contact first name
          <input
            className="fe-input"
            value={contact.contactPartyName}
            onChange={onFieldChange("contactPartyName")}
          />
        </label>

        <label className="fe-field">
          Contact last name
          <input
            className="fe-input"
            value={contact.contactPartyLastName}
            onChange={onFieldChange("contactPartyLastName")}
          />
        </label>

        <label className="fe-field">
          Department
          <input
            className="fe-input"
            value={contact.contactDepartment}
            onChange={onFieldChange("contactDepartment")}
          />
        </label>

        <label className="fe-field">
          Designation
          <input
            className="fe-input"
            value={contact.contactDesignation}
            onChange={onFieldChange("contactDesignation")}
          />
        </label>
      </div>

      {contact.communications.map((communication, communicationIndex) =>
        communication.communicationDetails.map((detail, detailIndex) => (
          <div
            className="fe-field__grid tenant-edit-form__contact-detail"
            key={`${communicationIndex}-${detailIndex}`}
          >
            <label className="fe-field">
              Address line 1
              <input
                className="fe-input"
                value={detail.addressLine1}
                onChange={onDetailChange(communicationIndex, detailIndex, "addressLine1")}
              />
            </label>

            <label className="fe-field">
              Address line 2
              <input
                className="fe-input"
                value={detail.addressLine2}
                onChange={onDetailChange(communicationIndex, detailIndex, "addressLine2")}
              />
            </label>

            <label className="fe-field">
              City (ISO code)
              <input
                className="fe-input"
                value={detail.isoCityCode}
                onChange={onDetailChange(communicationIndex, detailIndex, "isoCityCode")}
              />
            </label>

            <label className="fe-field">
              Country (ISO code)
              <input
                className="fe-input"
                value={detail.isoCountryCode}
                onChange={onDetailChange(communicationIndex, detailIndex, "isoCountryCode")}
              />
            </label>

            <label className="fe-field">
              Postal code
              <input
                className="fe-input"
                value={detail.postalCode}
                onChange={onDetailChange(communicationIndex, detailIndex, "postalCode")}
              />
            </label>

            <label className="fe-field">
              Phone number
              <input
                className="fe-input"
                value={detail.phoneNumber}
                onChange={onDetailChange(communicationIndex, detailIndex, "phoneNumber")}
              />
            </label>

            <label className="fe-field">
              Contact email
              <input
                className="fe-input"
                type="email"
                value={detail.emailAddress}
                onChange={onDetailChange(communicationIndex, detailIndex, "emailAddress")}
              />
            </label>
          </div>
        )),
      )}
    </div>
  );
}
