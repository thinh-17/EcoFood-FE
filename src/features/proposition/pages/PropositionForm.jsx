import { useState } from "react";
import { CurrencySelect } from "../../../components/CurrencySelect.jsx";
import { keepPreviousData, useMutation, useQuery } from "@tanstack/react-query";
import { CoreButton, CoreMultiSelect, CoreSelect } from "@thinh-17/fe-core";
import { useDebouncedValue } from "../../../hooks/useDebouncedValue.js";
import { useTouched } from "../../../hooks/useTouched.js";
import {
  approvedProcesses,
  createProposition,
  updateProposition,
  propositionTenantDirectory,
} from "../api/proposition.api.js";
import {
  errorMessage,
  propositionFormState,
  propositionPayload,
  isDistributionPartner,
  partnerCountries,
  money,
} from "../lib/proposition.js";
import {
  quarterlyRevenueRows,
  quarterlyRevenueTotal,
} from "../lib/quarterlyMetrics.js";
import { Field, MetricsEditor } from "./PropositionFields.jsx";

const PROPOSITION_STEPS = ["General Information", "Business Targets", "Submit"];
const STEP_DESCRIPTIONS = [
  "Choose the approved product version, name the Proposition and select its Distribution Sub-Tenants and effective period.",
  "Enter expected revenue and profit shares, plus any per-partner indicators.",
  "Review everything before saving this Draft Proposition.",
];

export function PropositionForm({
  proposition,
  presetSource,
  options,
  onCancel,
  onSaved,
}) {
  const [form, setForm] = useState(() => {
    const state = propositionFormState(proposition, options.defaultCurrency);
    return presetSource ? { ...state, source: presetSource } : state;
  });
  const [step, setStep] = useState(0);
  const { touched, touch, touchAll } = useTouched();
  const [search, setSearch] = useState(""),
    [hasSearched, setHasSearched] = useState(false),
    [page, setPage] = useState(0),
    [validation, setValidation] = useState("");
  const term = useDebouncedValue(search, 400);
  const directory = useQuery({
    queryKey: ["propositions", options.scope, "tenant-directory"],
    queryFn: ({ signal }) => propositionTenantDirectory(signal),
  });
  const partners = (directory.data ?? [])
    .filter(isDistributionPartner)
    .map((t) => ({
      ...t,
      name: `${t.tenantName} (${t.partnerTypeCode}) · ${t.country || "Country missing"}`,
    }));
  const countries = partnerCountries(form.distributionPartnerIds, partners);
  const sources = useQuery({
    queryKey: [
      "propositions",
      options.scope,
      "sources",
      hasSearched ? term : null,
      page,
    ],
    queryFn: ({ signal }) =>
      approvedProcesses(
        { search: hasSearched ? term : undefined, page, size: 20 },
        signal,
      ),
    placeholderData: keepPreviousData,
    enabled: !proposition && !presetSource,
  });
  function handleSearchChange(event) {
    setSearch(event.target.value);
    setHasSearched(true);
    setPage(0);
  }
  const set = (key) => (value) =>
    setForm((previous) => ({ ...previous, [key]: value }));
  const mutation = useMutation({
    mutationFn: (body) =>
      proposition
        ? updateProposition(proposition.id, body)
        : createProposition(body),
    onSuccess: onSaved,
  });
  // Shared by "Next" (leaving step 0) and the final save — the same
  // Tenant Directory/country checks either way, just gating navigation vs.
  // gating the actual mutation.
  function validateGeneralInformation() {
    if (!proposition && !form.source)
      throw new Error("Select an approved ProductProcess.");
    if (!form.name.trim()) throw new Error("Proposition name is required.");
    if (!directory.isSuccess)
      throw new Error("Load the Tenant Directory before saving.");
    for (const id of form.distributionPartnerIds) {
      const tenant = partners.find((t) => t.id === id);
      if (!tenant)
        throw new Error(
          "A selected Sub-Tenant is no longer available in the Tenant Directory. Reload and select valid partners.",
        );
      if (!tenant.country)
        throw new Error(
          `Set the onboarding contact country for ${tenant.tenantName} in Tenant Directory.`,
        );
    }
    if (!form.distributionPartnerIds.length || !countries.length)
      throw new Error(
        "Select at least one distribution Sub-Tenant with an onboarding country.",
      );
  }
  function goNext() {
    if (step === 0) touchAll(["source", "name", "distributionPartnerIds"]);
    try {
      if (step === 0) validateGeneralInformation();
      setValidation("");
      setStep(step + 1);
    } catch (error) {
      setValidation(error.message);
    }
  }
  function save() {
    touchAll(["source", "name", "distributionPartnerIds"]);
    try {
      validateGeneralInformation();
      const body = propositionPayload(
        { ...form, regionIds: countries.join(", ") },
        proposition,
      );
      setValidation("");
      mutation.mutate(body);
    } catch (error) {
      setValidation(error.message);
    }
  }
  const partner = (index, patch) =>
    set("partnerMetrics")(
      form.partnerMetrics.map((item, i) =>
        i === index ? { ...item, ...patch } : item,
      ),
    );
  const partnerName = (id) =>
    options.distributionPartners.find((t) => t.id === id)?.name ?? id;
  const busy = mutation.isPending;
  const expectedRevenueTotal =
    quarterlyRevenueTotal(form.expectMetrics) ?? form.expectRevenue;
  return (
    <div className="prop-wizard">
      <aside className="prop-stepper" aria-label="Create Proposition steps">
        <ol>
          {PROPOSITION_STEPS.map((label, index) => (
            <li
              key={label}
              className={
                step === index ? "is-current" : step > index ? "is-complete" : ""
              }
            >
              <CoreButton
                variant="ghost"
                size="sm"
                className="prop-step-button"
                disabled={busy || index > step}
                aria-current={index === step ? "step" : undefined}
                onClick={() => {
                  setStep(index);
                  setValidation("");
                }}
              >
                <span>{index + 1}</span>
                {label}
              </CoreButton>
            </li>
          ))}
        </ol>
        <p>Define the Proposition, then save it as a Draft.</p>
      </aside>
      <div className="prop-wizard-content">
        <header className="prop-wizard-heading">
          <small>
            STEP {step + 1} OF {PROPOSITION_STEPS.length}
          </small>
          <h2>{PROPOSITION_STEPS[step]}</h2>
          <p>{STEP_DESCRIPTIONS[step]}</p>
        </header>
        <fieldset className="prop-wizard-fields" disabled={busy}>
          {step === 0 && (
            <>
              <h3>Approved product version</h3>
              {proposition ? (
                <p className="prop-source">
                  Product version {proposition.productVersion} ·{" "}
                  {proposition.productProcessId}
                </p>
              ) : presetSource ? (
                <p className="prop-source">
                  Product version {presetSource.productVersion} ·{" "}
                  {presetSource.name}
                </p>
              ) : (
                <>
                  <input
                    type="search"
                    className="fe-input prop-source-search"
                    placeholder="Search approved versions by name..."
                    aria-label="Search approved versions"
                    value={search}
                    onChange={handleSearchChange}
                  />
                  {sources.isError && (
                    <p role="alert" className="prop-error">
                      {errorMessage(sources.error)}{" "}
                      <CoreButton
                        variant="ghost"
                        size="sm"
                        onClick={() => sources.refetch()}
                      >
                        Retry
                      </CoreButton>
                    </p>
                  )}
                  <label
                    className={
                      touched.source && !form.source ? "fe-field-invalid" : ""
                    }
                  >
                    Approved ProductProcess *
                    <CoreSelect
                      disabled={sources.isPending || sources.isError}
                      value={form.source?.productProcessId ?? ""}
                      onChange={(value) =>
                        set("source")(
                          (sources.data?.content ?? []).find(
                            (row) => row.productProcessId === value,
                          ) ?? null,
                        )
                      }
                      onBlur={touch("source")}
                      options={[
                        {
                          value: "",
                          label: sources.isPending
                            ? "Loading versions..."
                            : "Select an approved product version",
                        },
                        ...(form.source &&
                        !sources.data?.content?.some(
                          (row) =>
                            row.productProcessId === form.source.productProcessId,
                        )
                          ? [
                              {
                                value: form.source.productProcessId,
                                label: form.source.name ?? form.source.productProcessId,
                              },
                            ]
                          : []),
                        ...(sources.data?.content ?? []).map((row) => ({
                          value: row.productProcessId,
                          label: `${row.name} · v${row.productVersion}`,
                        })),
                      ]}
                    />
                    {touched.source && !form.source && (
                      <span className="fe-field-error">
                        Approved ProductProcess is required.
                      </span>
                    )}
                  </label>
                  {sources.data?.totalPages > 1 && (
                    <div className="prop-actions">
                      <CoreButton
                        variant="secondary"
                        size="sm"
                        disabled={page === 0 || sources.isFetching}
                        onClick={() => setPage(page - 1)}
                      >
                        Previous versions
                      </CoreButton>
                      <span>
                        Page {page + 1} / {sources.data.totalPages}
                      </span>
                      <CoreButton
                        variant="secondary"
                        size="sm"
                        disabled={
                          page + 1 >= sources.data.totalPages || sources.isFetching
                        }
                        onClick={() => setPage(page + 1)}
                      >
                        More versions
                      </CoreButton>
                    </div>
                  )}
                  {sources.isSuccess && !sources.data?.content?.length && (
                    <p className="prop-muted">No approved product version found.</p>
                  )}
                </>
              )}
              <h2>Commercial definition</h2>
              <div className="prop-grid">
                <Field
                  required
                  label="Proposition name *"
                  value={form.name}
                  onChange={set("name")}
                  onBlur={touch("name")}
                  labelClassName={
                    touched.name && !form.name.trim() ? "fe-field-invalid" : ""
                  }
                  error={
                    touched.name &&
                    !form.name.trim() && (
                      <span className="fe-field-error">
                        Proposition name is required.
                      </span>
                    )
                  }
                />
                <label>
                  Currency *
                  <CurrencySelect required value={form.currency} onChange={set("currency")} />
                </label>
              </div>
              <label>
                Description
                <textarea
                  rows={3}
                  value={form.description}
                  onChange={(e) => set("description")(e.target.value)}
                />
              </label>
              <h2>Distribution Sub-Tenants</h2>
              <p className="prop-muted">
                Select Brand or Ecosystem Partner Sub-Tenants from your Enterprise
                Tenant Directory. Countries come from their onboarding contact
                addresses.
              </p>
              {directory.isPending && (
                <p role="status">Loading Tenant Directory...</p>
              )}
              {directory.isError && (
                <p role="alert" className="prop-error">
                  {errorMessage(directory.error)}{" "}
                  <CoreButton
                    variant="ghost"
                    size="sm"
                    onClick={() => directory.refetch()}
                  >
                    Retry
                  </CoreButton>
                </p>
              )}
              {directory.isSuccess && (
                <label
                  className={
                    touched.distributionPartnerIds &&
                    form.distributionPartnerIds.length === 0
                      ? "fe-field-invalid"
                      : ""
                  }
                >
                  Distribution partners *
                  <CoreMultiSelect
                    options={partners.map((t) => ({ value: t.id, label: t.name }))}
                    selected={form.distributionPartnerIds}
                    onChange={set("distributionPartnerIds")}
                    onBlur={touch("distributionPartnerIds")}
                    placeholder="Select distribution Sub-Tenants..."
                    searchPlaceholder="Search Sub-Tenants..."
                  />
                  {touched.distributionPartnerIds &&
                    form.distributionPartnerIds.length === 0 && (
                      <span className="fe-field-error">
                        Distribution partners is required.
                      </span>
                    )}
                </label>
              )}
              {form.distributionPartnerIds
                .filter(
                  (id) => directory.isSuccess && !partners.some((t) => t.id === id),
                )
                .map((id) => (
                  <label className="prop-check" key={id}>
                    <input
                      type="checkbox"
                      checked
                      onChange={() =>
                        set("distributionPartnerIds")(
                          form.distributionPartnerIds.filter((item) => item !== id),
                        )
                      }
                    />
                    Unavailable Sub-Tenant {id} (uncheck to remove)
                  </label>
                ))}
              <p className="prop-source">
                Countries of Sale:{" "}
                {countries.join(", ") ||
                  "Select Sub-Tenants with an onboarding country"}
              </p>
              <div className="prop-grid">
                <Field
                  label="Start date"
                  type="datetime-local"
                  value={form.startDate}
                  onChange={set("startDate")}
                />
                <Field
                  label="End date"
                  type="datetime-local"
                  value={form.endDate}
                  onChange={set("endDate")}
                />
              </div>
            </>
          )}
          {step === 1 && (
            <>
              <h2>Business targets</h2>
              <p className="prop-muted">
                Enter revenue by calendar quarter. The default period is 3 years
                (12 quarters) from the creation quarter. Use Edit to add another
                year later.
              </p>
              <MetricsEditor
                value={form.expectMetrics}
                onChange={set("expectMetrics")}
                currency={form.currency}
                canAddYear={Boolean(proposition)}
              />
              <p>
                Expected revenue total:{" "}
                <strong>{money(expectedRevenueTotal, form.currency)}</strong>
              </p>
              <div className="prop-grid">
                {["enterprise", "platform", "distribution"].map((kind) => (
                  <Field
                    key={kind}
                    label={`${kind === "distribution" ? "Partner" : kind} profit share (%)`}
                    type="number"
                    min="0"
                    max="100"
                    step="0.0001"
                    value={form[`${kind}ProfitShare`]}
                    onChange={set(`${kind}ProfitShare`)}
                  />
                ))}
              </div>
              <p className="prop-muted">Platform + Enterprise + Partner = 100%.</p>
              <h2>Partner indicators</h2>
              {form.partnerMetrics.map((item, index) => (
                <section className="prop-subcard" key={item.tenantId}>
                  <div className="prop-section-heading">
                    <strong>{partnerName(item.tenantId)}</strong>
                    <CoreButton
                      variant="secondary"
                      size="sm"
                      onClick={() =>
                        set("partnerMetrics")(
                          form.partnerMetrics.filter((_, i) => i !== index),
                        )
                      }
                    >
                      Remove indicators
                    </CoreButton>
                  </div>
                  <MetricsEditor
                    value={item.expectMetrics ?? []}
                    onChange={(value) => partner(index, { expectMetrics: value })}
                    currency={form.currency}
                    canAddYear={Boolean(proposition)}
                  />
                  <p>
                    Expected partner revenue total:{" "}
                    <strong>
                      {money(
                        quarterlyRevenueTotal(item.expectMetrics ?? []) ??
                          item.expectRevenue,
                        form.currency,
                      )}
                    </strong>
                  </p>
                </section>
              ))}
              {form.distributionPartnerIds
                .filter((id) => !form.partnerMetrics.some((m) => m.tenantId === id))
                .map((id) => (
                  <CoreButton
                    key={id}
                    variant="secondary"
                    size="sm"
                    onClick={() =>
                      set("partnerMetrics")([
                        ...form.partnerMetrics,
                        {
                          tenantId: id,
                          expectRevenue: "",
                          expectMetrics: quarterlyRevenueRows([], form.revenueStart),
                        },
                      ])
                    }
                  >
                    + Indicators: {partnerName(id)}
                  </CoreButton>
                ))}
            </>
          )}
          {step === 2 && (
            <>
              <h2>Review</h2>
              <dl className="prop-facts">
                <div>
                  <dt>Approved product version</dt>
                  <dd>
                    v
                    {proposition?.productVersion ??
                      presetSource?.productVersion ??
                      form.source?.productVersion ??
                      "—"}{" "}
                    ·{" "}
                    {proposition?.productProcessId ??
                      presetSource?.name ??
                      form.source?.name ??
                      "—"}
                  </dd>
                </div>
                <div>
                  <dt>Proposition name</dt>
                  <dd>{form.name || "—"}</dd>
                </div>
                <div>
                  <dt>Currency</dt>
                  <dd>{form.currency}</dd>
                </div>
                <div>
                  <dt>Distribution partners</dt>
                  <dd>
                    {form.distributionPartnerIds.map(partnerName).join(", ") || "—"}
                  </dd>
                </div>
                <div>
                  <dt>Countries of Sale</dt>
                  <dd>{countries.join(", ") || "—"}</dd>
                </div>
                <div>
                  <dt>Effective period</dt>
                  <dd>
                    {form.startDate || "—"} – {form.endDate || "—"}
                  </dd>
                </div>
                <div>
                  <dt>Expected revenue</dt>
                  <dd>{money(expectedRevenueTotal, form.currency)}</dd>
                </div>
                <div>
                  <dt>Partner indicators</dt>
                  <dd>
                    {form.partnerMetrics.length
                      ? form.partnerMetrics.map((m) => partnerName(m.tenantId)).join(", ")
                      : "None"}
                  </dd>
                </div>
              </dl>
              <p className="prop-muted">
                Saving creates a Draft Proposition. Submit it for review from the
                Proposition's own detail page once it's ready.
              </p>
            </>
          )}
        </fieldset>
        {validation && (
          <p className="prop-error" role="alert">
            {validation}
          </p>
        )}
        {mutation.isError && (
          <p className="prop-error" role="alert">
            {errorMessage(mutation.error)}
            {mutation.error?.response?.status === 409 &&
              " Close and reopen to load the latest revision."}
          </p>
        )}
        <footer className="prop-actions prop-wizard-actions">
          <CoreButton variant="secondary" disabled={busy} onClick={onCancel}>
            Cancel
          </CoreButton>
          {step > 0 && (
            <CoreButton
              variant="secondary"
              disabled={busy}
              onClick={() => {
                setStep(step - 1);
                setValidation("");
              }}
            >
              Back
            </CoreButton>
          )}
          {step < 2 ? (
            <CoreButton disabled={busy} onClick={goNext}>
              Next
            </CoreButton>
          ) : (
            <CoreButton loading={busy} onClick={save}>
              {proposition ? "Save changes" : "Create Draft Proposition"}
            </CoreButton>
          )}
        </footer>
      </div>
    </div>
  );
}
