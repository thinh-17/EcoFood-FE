import { useState } from "react";
import { keepPreviousData, useMutation, useQuery } from "@tanstack/react-query";
import { CoreButton } from "@thinh-17/fe-core";
import { useDebouncedValue } from "../../../hooks/useDebouncedValue.js";
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
import { ChoiceList, Field, MetricsEditor } from "./PropositionFields.jsx";
const OVERRIDES = [
  { id: "NAME", name: "Name" },
  { id: "DESCRIPTION", name: "Description" },
  { id: "IMAGE_URL", name: "Image URL" },
  { id: "RECIPE", name: "Product Process recipe" },
];
export function PropositionForm({ proposition, options, onCancel, onSaved }) {
  const [form, setForm] = useState(() =>
    propositionFormState(proposition, options.defaultCurrency),
  );
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
    enabled: !proposition,
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
  function submit(event) {
    event.preventDefault();
    try {
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
  return (
    <form className="prop-form" onSubmit={submit}>
      <fieldset disabled={mutation.isPending}>
        <h2>Approved product version</h2>
        {proposition ? (
          <p className="prop-source">
            Product version {proposition.productVersion} ·{" "}
            {proposition.productProcessId}
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
                <button type="button" onClick={() => sources.refetch()}>
                  Retry
                </button>
              </p>
            )}
            <label>
              Approved ProductProcess *
              <select
                required
                disabled={sources.isPending || sources.isError}
                value={form.source?.productProcessId ?? ""}
                onChange={(e) =>
                  set("source")(
                    (sources.data?.content ?? []).find(
                      (row) => row.productProcessId === e.target.value,
                    ) ?? null,
                  )
                }
              >
                <option value="">
                  {sources.isPending
                    ? "Loading versions..."
                    : "Select an approved product version"}
                </option>
                {form.source &&
                  !sources.data?.content?.some(
                    (row) =>
                      row.productProcessId === form.source.productProcessId,
                  ) && (
                    <option value={form.source.productProcessId}>
                      {form.source.name ?? form.source.productProcessId}
                    </option>
                  )}
                {(sources.data?.content ?? []).map((row) => (
                  <option
                    key={row.productProcessId}
                    value={row.productProcessId}
                  >
                    {row.name} · v{row.productVersion}
                  </option>
                ))}
              </select>
            </label>
            {sources.data?.totalPages > 1 && (
              <div className="prop-actions">
                <button
                  type="button"
                  disabled={page === 0 || sources.isFetching}
                  onClick={() => setPage(page - 1)}
                >
                  Previous versions
                </button>
                <span>
                  Page {page + 1} / {sources.data.totalPages}
                </span>
                <button
                  type="button"
                  disabled={
                    page + 1 >= sources.data.totalPages || sources.isFetching
                  }
                  onClick={() => setPage(page + 1)}
                >
                  More versions
                </button>
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
          />
          <label>
            Currency
            <select
              value={form.currency}
              onChange={(e) => set("currency")(e.target.value)}
            >
              {!options.availableCurrencies.includes(form.currency) && (
                <option>{form.currency}</option>
              )}
              {options.availableCurrencies.map((code) => (
                <option key={code}>{code}</option>
              ))}
            </select>
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
        <h3>Distribution Sub-Tenants</h3>
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
            <button type="button" onClick={() => directory.refetch()}>
              Retry
            </button>
          </p>
        )}
        {directory.isSuccess && (
          <ChoiceList
            label="Distribution partners *"
            items={partners}
            value={form.distributionPartnerIds}
            onChange={set("distributionPartnerIds")}
          />
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
        <ChoiceList
          label="Product fields Plans may customize"
          items={OVERRIDES}
          value={form.allowedOverrides}
          onChange={set("allowedOverrides")}
        />
        <h2>Business targets</h2>
        <p className="prop-muted">
          Enter revenue by calendar quarter. The default period is 3 years (12
          quarters) from the creation quarter. Use Edit to add another year
          later.
        </p>
        <MetricsEditor
          value={form.expectMetrics}
          onChange={set("expectMetrics")}
          currency={form.currency}
          canAddYear={Boolean(proposition)}
        />
        <p>
          Expected revenue total:{" "}
          <strong>
            {money(
              quarterlyRevenueTotal(form.expectMetrics) ?? form.expectRevenue,
              form.currency,
            )}
          </strong>
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
              <strong>
                {options.distributionPartners.find(
                  (t) => t.id === item.tenantId,
                )?.name ?? item.tenantId}
              </strong>
              <button
                type="button"
                onClick={() =>
                  set("partnerMetrics")(
                    form.partnerMetrics.filter((_, i) => i !== index),
                  )
                }
              >
                Remove indicators
              </button>
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
            <button
              type="button"
              key={id}
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
              + Indicators:{" "}
              {options.distributionPartners.find((t) => t.id === id)?.name ??
                id}
            </button>
          ))}
      </fieldset>
      {(validation || mutation.isError) && (
        <p className="prop-error" role="alert">
          {validation || errorMessage(mutation.error)}
          {mutation.error?.response?.status === 409 &&
            " Close and reopen to load the latest revision."}
        </p>
      )}
      <div className="prop-actions">
        <CoreButton
          variant="secondary"
          disabled={mutation.isPending}
          onClick={onCancel}
        >
          Cancel
        </CoreButton>
        <CoreButton type="submit" loading={mutation.isPending}>
          {proposition ? "Save changes" : "Create Draft Proposition"}
        </CoreButton>
      </div>
    </form>
  );
}
