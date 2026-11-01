import "./TenantOnboardingPage.css";

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import { CoreFormActions, CorePageHeader } from "@thinh-17/fe-core";

import { COUNTRIES } from "../../../../constants/countries.js";
import { ROUTES } from "../../../../constants/routes.js";
import { getActor } from "../../../auth/lib/accessControl.js";
import { useCurrentRoles } from "../../../auth/hooks/useCurrentRoles.js";
import { useAuthStore } from "../../../auth/store/authStore.js";
import { useDomainAvailability } from "../../hooks/useDomainAvailability.js";
import { useMasterTenants } from "../../hooks/useMasterTenants.js";
import { useRootTenant } from "../../hooks/useRootTenant.js";
import { useTenantOnboarding } from "../../hooks/useTenantOnboarding.js";
import { getRootDomain } from "../../lib/rootDomain.js";

const PARTNER_TYPES = [
  { value: "ENTERPRISE", label: "Enterprise" },
  { value: "REGIONAL_ENTERPRISE", label: "Regional Enterprise" },
  { value: "BRAND", label: "Brand" },
  { value: "ECOSYSTEM_PARTNER", label: "Ecosystem Partner" },
];

const TENANT_TYPES = [
  { value: "MASTER_TENANT", label: "Master Tenant" },
  { value: "SUB_TENANT", label: "Sub-tenant (belongs to a Master Tenant)" },
];

// Enterprise/Regional Enterprise tenants are always onboarded as the
// top-level hub for their own realm — their Enterprise-level hierarchy
// (relatedEnterpriseId/BELONGTO-OWN) is what expresses "belongs to a
// bigger enterprise", not the tenant-level Master/Sub-tenant relationship.
// Only Brand/Ecosystem Partner tenants attach as a sub-tenant of a Master.
const FORCED_MASTER_TENANT_TYPES = new Set(["ENTERPRISE", "REGIONAL_ENTERPRISE"]);

// An ENTERPRISE or MASTER actor only ever onboards tenants *underneath
// itself* — neither ever sets up a sibling top-level tenant — so for them
// the Tenant Relationship choice isn't a choice at all: the new tenant is
// always a sub-tenant of their OWN tenant. This only applies when the new
// tenant's own partnerType doesn't already force MASTER_TENANT (§above) —
// an Enterprise actor onboarding another Enterprise/Regional Enterprise
// still gets that one treated as its own top-level hub (MASTER actors can't
// even select those partner types to begin with — see restrictedPartnerTypes).
function actorForcesSubTenant(form, currentActor) {
  return (
    !FORCED_MASTER_TENANT_TYPES.has(form.partnerTypeCode) &&
    (currentActor === "ENTERPRISE" || currentActor === "MASTER")
  );
}

function resolveEffectiveTenantType(form, currentActor) {
  if (FORCED_MASTER_TENANT_TYPES.has(form.partnerTypeCode)) return "MASTER_TENANT";
  if (actorForcesSubTenant(form, currentActor)) return "SUB_TENANT";
  return form.tenantType;
}

function resolveEffectiveMasterTenantId(form, currentActor, currentTenantId) {
  return actorForcesSubTenant(form, currentActor) ? currentTenantId : form.masterTenantId;
}

// An ENTERPRISE actor onboarding a REGIONAL_ENTERPRISE always attaches it
// to their OWN enterprise — same "no real choice" reasoning as
// actorForcesSubTenant, just one level up (Enterprise hierarchy rather than
// tenant hierarchy). relatedEnterpriseId is a TENANT id (same id space as
// masterTenantId/partyRelationships) — the backend resolves it to the
// actual Enterprise id itself.
function regionalEnterpriseAutoLinksToActor(form, currentActor) {
  return form.partnerTypeCode === "REGIONAL_ENTERPRISE" && currentActor === "ENTERPRISE";
}

function resolveEffectiveRelatedEnterpriseId(form, currentActor, currentTenantId) {
  return regionalEnterpriseAutoLinksToActor(form, currentActor)
    ? currentTenantId
    : form.relatedEnterpriseId;
}

const INITIAL_FORM = {
  tenantName: "",
  email: "",
  firstName: "",
  lastName: "",
  domainSubdomain: "",
  partnerTypeCode: "ENTERPRISE",
  partnerTypeDescription: "",
  relatedEnterpriseId: "",
  tenantType: "MASTER_TENANT",
  masterTenantId: "",
  contactPartyName: "",
  contactPartyLastName: "",
  contactDepartment: "",
  addressLine1: "",
  addressLine2: "",
  isoCityCode: "",
  isoCountryCode: "",
  postalCode: "",
  phoneNumber: "",
  emailAddress: "",
};

// Every tenant's domain — Enterprise, Regional Enterprise, Master, or
// Sub-tenant alike — is a subdomain within this platform, rooted at the ECO
// tenant's own domain (see useRootTenant): below an existing master
// tenant's own domain, e.g. "master-tenant-sub.ecofood.com/sub-tenant-
// domain", when this tenant is a sub-tenant of one; otherwise a plain
// "<subdomain>.<rootDomain>", where rootDomain is the ECO tenant's domainUrl.
function buildDomainUrl(form, effectiveTenantType, selectedMasterTenant, rootDomain) {
  const value = form.domainSubdomain.trim();
  if (!value) return undefined;

  if (effectiveTenantType === "SUB_TENANT" && selectedMasterTenant?.domainUrl) {
    return `${selectedMasterTenant.domainUrl}/${value}`;
  }

  return `${value}.${rootDomain}`;
}

function buildPayload(form, currentActor, currentTenantId, selectedMasterTenant, rootDomain) {
  const isRegionalEnterprise = form.partnerTypeCode === "REGIONAL_ENTERPRISE";
  const tenantType = resolveEffectiveTenantType(form, currentActor);
  const masterTenantId = resolveEffectiveMasterTenantId(form, currentActor, currentTenantId);
  const relatedEnterpriseId = resolveEffectiveRelatedEnterpriseId(form, currentActor, currentTenantId);

  // No separate "username" box in the UI anymore — a mismatched
  // username/email pair caused real onboarding confusion, so the username
  // sent to the backend is always just a copy of the email.
  const email = form.email.trim();

  return {
    tenantName: form.tenantName.trim(),
    username: email,
    email,
    firstName: form.firstName.trim() || undefined,
    lastName: form.lastName.trim() || undefined,
    domainUrl: buildDomainUrl(form, tenantType, selectedMasterTenant, rootDomain),
    partnerTypeCode: form.partnerTypeCode,
    partnerTypeDescription: form.partnerTypeDescription.trim() || undefined,
    relatedEnterpriseId:
      isRegionalEnterprise && relatedEnterpriseId?.trim()
        ? relatedEnterpriseId.trim()
        : undefined,
    tenantType,
    // Choosing a master tenant makes THIS tenant a sub-tenant of it — per
    // RelationshipTypeEnum, relationshipTypeCode=MASTER_TENANT on this
    // tenant's own relationship list means "belongs to master tenant X",
    // not "is the master of X" (that would be relationshipTypeCode=SUB_TENANT).
    partyRelationships:
      tenantType === "SUB_TENANT" && masterTenantId
        ? [{ toTenantId: masterTenantId, relationshipTypeCode: "MASTER_TENANT" }]
        : [],
    contact: {
      contactPartyName: form.contactPartyName.trim(),
      contactPartyLastName: form.contactPartyLastName.trim(),
      contactDepartment: form.contactDepartment.trim() || undefined,
      communications: [
        {
          communicationChannelName: "PRIMARY",
          preferred: true,
          communicationDetails: [
            {
              locationType: "OFFICE",
              preferred: true,
              addressLine1: form.addressLine1.trim() || undefined,
              addressLine2: form.addressLine2.trim() || undefined,
              isoCityCode: form.isoCityCode.trim() || undefined,
              isoCountryCode: form.isoCountryCode.trim() || undefined,
              postalCode: form.postalCode.trim() || undefined,
              phoneNumber: form.phoneNumber.trim() || undefined,
              emailAddress: form.emailAddress.trim() || undefined,
            },
          ],
        },
      ],
    },
  };
}

function validate(form, currentActor, domainAvailability) {
  const errors = {};

  if (!form.domainSubdomain.trim()) {
    errors.domainSubdomain = "Domain is required.";
  } else if (domainAvailability?.data?.available === false) {
    errors.domainSubdomain = "This domain is already taken.";
  }

  if (!form.tenantName.trim()) errors.tenantName = "Tenant name is required.";
  if (!form.email.trim()) {
    errors.email = "Email is required.";
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
    errors.email = "Invalid email address.";
  }
  if (!form.partnerTypeCode) errors.partnerTypeCode = "Partner type is required.";

  // A forced sub-tenant (Enterprise actor) always resolves its own tenant
  // as the master — only an explicit user choice can leave it unpicked.
  const isUnresolvedSubTenantChoice =
    !FORCED_MASTER_TENANT_TYPES.has(form.partnerTypeCode) &&
    !actorForcesSubTenant(form, currentActor) &&
    form.tenantType === "SUB_TENANT";
  if (isUnresolvedSubTenantChoice && !form.masterTenantId) {
    errors.masterTenantId = "Master Tenant is required.";
  }

  if (!form.contactPartyName.trim()) {
    errors.contactPartyName = "Contact first name is required.";
  }
  if (!form.contactPartyLastName.trim()) {
    errors.contactPartyLastName = "Contact last name is required.";
  }

  return errors;
}

export function TenantOnboardingPage() {
  const navigate = useNavigate();
  const onboardTenant = useTenantOnboarding();

  const [form, setForm] = useState(INITIAL_FORM);
  const [fieldErrors, setFieldErrors] = useState({});
  const [notice, setNotice] = useState(null);
  const [submitError, setSubmitError] = useState(null);

  const isRegionalEnterprise = form.partnerTypeCode === "REGIONAL_ENTERPRISE";
  const isEnterpriseFamily = FORCED_MASTER_TENANT_TYPES.has(form.partnerTypeCode);

  const roles = useCurrentRoles();
  const currentActor = getActor(roles);
  const currentTenantId = useAuthStore((s) => s.tenantId);

  // Hidden entirely when the new tenant's own partnerType already forces
  // MASTER_TENANT, OR when the person onboarding is an ENTERPRISE actor —
  // they never get a choice, their new tenant is always a sub-tenant of
  // their own tenant (see actorForcesSubTenant above).
  const showTenantRelationshipSection =
    !isEnterpriseFamily && !actorForcesSubTenant(form, currentActor);
  const effectiveTenantType = resolveEffectiveTenantType(form, currentActor);
  const effectiveMasterTenantId = resolveEffectiveMasterTenantId(form, currentActor, currentTenantId);
  const isSubTenant = effectiveTenantType === "SUB_TENANT";
  const autoRelatedEnterprise = regionalEnterpriseAutoLinksToActor(form, currentActor);

  // The ECO tenant's own domainUrl is the real base every other tenant's
  // domain is a subdomain of — only falls back to the window-location guess
  // while that lookup is loading/erroring (e.g. platform not bootstrapped
  // yet), so the preview never just breaks.
  const rootTenant = useRootTenant();
  const rootDomain = rootTenant.data?.domainUrl ?? getRootDomain();

  // Doubles as: (a) the Master Tenant picker's data, (b) the "belongs to"
  // picker's data below (a REGIONAL_ENTERPRISE's BELONGTO relation can only
  // target a tenant that is BOTH partnerTypeCode=ENTERPRISE AND already has
  // its own enterpriseId — the latter is what resolveRelatedEnterpriseId on
  // the backend actually needs to exist), and (c) the lookup for the
  // current user's OWN tenant — its partnerTypeCode (to know if they're a
  // plain ENTERPRISE) and domainUrl (to compose a sub-tenant's/regional-
  // enterprise's full domain).
  const masterTenants = useMasterTenants(isSubTenant || isRegionalEnterprise || currentActor === "ENTERPRISE");
  const myTenant = (masterTenants.data ?? []).find((tenant) => tenant.id === currentTenantId);
  const eligibleParentEnterpriseTenants = (masterTenants.data ?? []).filter(
    (tenant) => tenant.partnerTypeCode === "ENTERPRISE" && tenant.enterpriseId
  );

  const isPlainEnterpriseActor = currentActor === "ENTERPRISE" && myTenant?.partnerTypeCode === "ENTERPRISE";
  const isRegionalEnterpriseActor =
    currentActor === "ENTERPRISE" && myTenant?.partnerTypeCode === "REGIONAL_ENTERPRISE";
  // A plain ENTERPRISE can never onboard another top-level ENTERPRISE —
  // only its own Regional Enterprises, Brands and Ecosystem Partners
  // underneath it. A REGIONAL_ENTERPRISE is already one level down from
  // that, so it can't onboard either an ENTERPRISE (its own parent's tier)
  // or another REGIONAL_ENTERPRISE (a sibling branch — those only ever
  // attach directly to the top-level Enterprise, not to another region) —
  // only Brands/Ecosystem Partners underneath it. A MASTER actor can never
  // onboard any Enterprise-family tenant at all — it has no enterprise
  // hierarchy of its own to extend.
  const restrictedPartnerTypes =
    currentActor === "MASTER" || isRegionalEnterpriseActor
      ? new Set(["ENTERPRISE", "REGIONAL_ENTERPRISE"])
      : isPlainEnterpriseActor
        ? new Set(["ENTERPRISE"])
        : new Set();
  const availablePartnerTypes = PARTNER_TYPES.filter(
    (option) => !restrictedPartnerTypes.has(option.value)
  );

  const selectedMasterTenant = (masterTenants.data ?? []).find(
    (tenant) => tenant.id === effectiveMasterTenantId
  );

  // The live availability check always runs against the FULL computed
  // domain (the live-preview value), never the raw subdomain box the user
  // typed — same as DCMP's own live domain-availability validation.
  const fullDomainUrl = buildDomainUrl(form, effectiveTenantType, selectedMasterTenant, rootDomain);
  const domainAvailability = useDomainAvailability(fullDomainUrl);

  // The default/stale selection can become invalid once we learn who the
  // current actor is (e.g. a plain ENTERPRISE can't pick "Enterprise"; a
  // MASTER can't pick either Enterprise-family option) — fall back to the
  // next available option instead of submitting a value the dropdown no
  // longer even shows.
  useEffect(() => {
    if (restrictedPartnerTypes.has(form.partnerTypeCode)) {
      updatePartnerType({ target: { value: availablePartnerTypes[0]?.value ?? "BRAND" } });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentActor, isPlainEnterpriseActor, isRegionalEnterpriseActor]);

  const updateField = (name) => (event) => {
    const { value } = event.target;
    setForm((previous) => ({ ...previous, [name]: value }));
  };

  const updatePartnerType = (event) => {
    const { value } = event.target;
    setForm((previous) => ({
      ...previous,
      partnerTypeCode: value,
      tenantType: FORCED_MASTER_TENANT_TYPES.has(value) ? "MASTER_TENANT" : previous.tenantType,
      masterTenantId: FORCED_MASTER_TENANT_TYPES.has(value) ? "" : previous.masterTenantId,
      relatedEnterpriseId: value === "REGIONAL_ENTERPRISE" ? previous.relatedEnterpriseId : "",
    }));
  };

  const updateTenantType = (event) => {
    const { value } = event.target;
    setForm((previous) => ({
      ...previous,
      tenantType: value,
      masterTenantId: value === "SUB_TENANT" ? previous.masterTenantId : "",
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    const errors = validate(form, currentActor, domainAvailability);
    setFieldErrors(errors);
    setSubmitError(null);
    setNotice(null);

    if (Object.keys(errors).length > 0) return;

    try {
      const result = await onboardTenant.mutateAsync(
        buildPayload(form, currentActor, currentTenantId, selectedMasterTenant, rootDomain)
      );
      setNotice(
        `Tenant "${result?.tenantName ?? form.tenantName}" was created successfully.`
      );
      setForm(INITIAL_FORM);
    } catch (error) {
      setSubmitError(
        error?.response?.data?.message ||
          error?.message ||
          "Could not create tenant. Please try again."
      );
    }
  };

  return (
    <div className="eco-module-page tob-page">
      <CorePageHeader
        eyebrow="EcoFood Platform"
        title="Tenant Onboarding"
        description="First step to enter the ecosystem - become a tenant in our platform"
      />

      {notice && (
        <p className="tob-notice" role="status">
          {notice}
        </p>
      )}
      {submitError && (
        <p className="tob-error" role="alert">
          {submitError}
        </p>
      )}

      <form className="tob-form" onSubmit={handleSubmit} noValidate>
        {showTenantRelationshipSection && (
          <section className="tob-section">
            <h2 className="tob-section__title">Tenant Relationship</h2>
            <p className="tob-section__hint">
              Choose Sub-tenant if this tenant belongs to an existing Master Tenant.
            </p>

            <div className="tob-grid">
              <label className="tob-field">
                <span>Tenant type *</span>
                <select value={form.tenantType} onChange={updateTenantType}>
                  {TENANT_TYPES.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>

              {isSubTenant && (
                <label className="tob-field">
                  <span>Master Tenant *</span>
                  <select
                    value={form.masterTenantId}
                    onChange={updateField("masterTenantId")}
                    disabled={masterTenants.isLoading}
                  >
                    <option value="">
                      {masterTenants.isLoading
                        ? "Loading list..."
                        : masterTenants.isError
                          ? "Failed to load Master Tenants"
                          : "Select a Master Tenant"}
                    </option>

                    {(masterTenants.data ?? []).map((tenant) => (
                      <option key={tenant.id} value={tenant.id}>
                        {tenant.tenantName}
                      </option>
                    ))}
                  </select>
                  {fieldErrors.masterTenantId && (
                    <span className="tob-field__error">{fieldErrors.masterTenantId}</span>
                  )}
                </label>
              )}
            </div>
          </section>
        )}

        <section className="tob-section">
          <h2 className="tob-section__title">Tenant Information</h2>

          <div className="tob-grid">
            <label className="tob-field">
              <span>Tenant name *</span>
              <input
                type="text"
                value={form.tenantName}
                onChange={updateField("tenantName")}
                placeholder="e.g. Green Valley F&B"
              />
              {fieldErrors.tenantName && (
                <span className="tob-field__error">{fieldErrors.tenantName}</span>
              )}
            </label>

            <label className="tob-field">
              <span>{isSubTenant ? "Domain path *" : "Subdomain *"}</span>
              <input
                type="text"
                value={form.domainSubdomain}
                onChange={updateField("domainSubdomain")}
                placeholder={isSubTenant ? "sub-tenant-domain" : "gamma"}
              />
              <span className="tob-domain-preview">
                {isSubTenant
                  ? selectedMasterTenant?.domainUrl
                    ? `${selectedMasterTenant.domainUrl}/${form.domainSubdomain.trim() || "sub-tenant-domain"}`
                    : actorForcesSubTenant(form, currentActor)
                      ? "Your own tenant has no domain set yet — set one before onboarding sub-tenants."
                      : "Select a Master Tenant with a domain to preview the full URL."
                  : `${form.domainSubdomain.trim() || "your-subdomain"}.${rootDomain}`}
              </span>
              {fullDomainUrl && (
                <span
                  className={
                    domainAvailability.isFetching
                      ? "tob-domain-status tob-domain-status--checking"
                      : domainAvailability.data?.available === false
                        ? "tob-domain-status tob-domain-status--taken"
                        : domainAvailability.data?.available === true
                          ? "tob-domain-status tob-domain-status--available"
                          : ""
                  }
                >
                  {domainAvailability.isFetching
                    ? "Checking availability..."
                    : domainAvailability.data?.available === false
                      ? "This domain is already taken."
                      : domainAvailability.data?.available === true
                        ? "This domain is available."
                        : null}
                </span>
              )}
              {fieldErrors.domainSubdomain && (
                <span className="tob-field__error">{fieldErrors.domainSubdomain}</span>
              )}
            </label>

            <label className="tob-field">
              <span>Partner type *</span>
              <select
                value={form.partnerTypeCode}
                onChange={updatePartnerType}
              >
                {availablePartnerTypes.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="tob-field">
              <span>Partner type description</span>
              <input
                type="text"
                value={form.partnerTypeDescription}
                onChange={updateField("partnerTypeDescription")}
              />
            </label>

            {isRegionalEnterprise && (
              <label className="tob-field">
                <span>This regional enterprise BELONG TO:</span>
                {autoRelatedEnterprise ? (
                  <p className="tob-section__hint">
                    Automatically linked to your own enterprise
                    {myTenant?.tenantName ? ` (${myTenant.tenantName})` : ""}.
                  </p>
                ) : (
                  <select
                    value={form.relatedEnterpriseId}
                    onChange={updateField("relatedEnterpriseId")}
                    disabled={masterTenants.isLoading}
                  >
                    <option value="">
                      {masterTenants.isLoading
                        ? "Loading list..."
                        : masterTenants.isError
                          ? "Failed to load enterprises"
                          : "Select an enterprise"}
                    </option>

                    {eligibleParentEnterpriseTenants.map((tenant) => (
                      <option key={tenant.id} value={tenant.id}>
                        {tenant.tenantName}
                      </option>
                    ))}
                  </select>
                )}
              </label>
            )}
          </div>
        </section>

        <section className="tob-section">
          <h2 className="tob-section__title">First Admin Account</h2>

          <div className="tob-grid">
            <label className="tob-field">
              <span>Email *</span>
              <input
                type="email"
                value={form.email}
                onChange={updateField("email")}
              />
              {fieldErrors.email && (
                <span className="tob-field__error">{fieldErrors.email}</span>
              )}
            </label>

            <label className="tob-field">
              <span>First name</span>
              <input
                type="text"
                value={form.firstName}
                onChange={updateField("firstName")}
              />
            </label>

            <label className="tob-field">
              <span>Last name</span>
              <input
                type="text"
                value={form.lastName}
                onChange={updateField("lastName")}
              />
            </label>
          </div>
        </section>

        <section className="tob-section">
          <h2 className="tob-section__title">Contact Information</h2>

          <div className="tob-grid">
              <label className="tob-field">
                <span>Contact first name *</span>
                <input
                  type="text"
                  value={form.contactPartyName}
                  onChange={updateField("contactPartyName")}
                />
                {fieldErrors.contactPartyName && (
                  <span className="tob-field__error">
                    {fieldErrors.contactPartyName}
                  </span>
                )}
              </label>

              <label className="tob-field">
                <span>Contact last name *</span>
                <input
                  type="text"
                  value={form.contactPartyLastName}
                  onChange={updateField("contactPartyLastName")}
                />
                {fieldErrors.contactPartyLastName && (
                  <span className="tob-field__error">
                    {fieldErrors.contactPartyLastName}
                  </span>
                )}
              </label>

              <label className="tob-field">
                <span>Department</span>
                <input
                  type="text"
                  value={form.contactDepartment}
                  onChange={updateField("contactDepartment")}
                />
              </label>

              <label className="tob-field">
                <span>Address line 1</span>
                <input
                  type="text"
                  value={form.addressLine1}
                  onChange={updateField("addressLine1")}
                />
              </label>

              <label className="tob-field">
                <span>Address line 2</span>
                <input
                  type="text"
                  value={form.addressLine2}
                  onChange={updateField("addressLine2")}
                />
              </label>

              <label className="tob-field">
                <span>City (ISO code)</span>
                <input
                  type="text"
                  value={form.isoCityCode}
                  onChange={updateField("isoCityCode")}
                />
              </label>

              <label className="tob-field">
                <span>Country</span>
                <select
                  value={form.isoCountryCode}
                  onChange={updateField("isoCountryCode")}
                >
                  <option value="">Select a country</option>
                  {COUNTRIES.map((country) => (
                    <option key={country.code} value={country.code}>
                      {country.name}
                    </option>
                  ))}
                </select>
              </label>

              <label className="tob-field">
                <span>Postal code</span>
                <input
                  type="text"
                  value={form.postalCode}
                  onChange={updateField("postalCode")}
                />
              </label>

              <label className="tob-field">
                <span>Phone number</span>
                <input
                  type="text"
                  value={form.phoneNumber}
                  onChange={updateField("phoneNumber")}
                />
              </label>

              <label className="tob-field">
                <span>Contact email</span>
                <input
                  type="email"
                  value={form.emailAddress}
                  onChange={updateField("emailAddress")}
                />
              </label>
          </div>
        </section>

        <div className="tob-actions">
          <CoreFormActions
            cancelVariant="ghost"
            onCancel={() => navigate(ROUTES.TENANT)}
            confirmLabel="Create tenant"
            confirmType="submit"
            confirmLoading={onboardTenant.isPending}
          />
        </div>
      </form>
    </div>
  );
}
