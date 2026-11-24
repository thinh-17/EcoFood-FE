import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { CoreButton } from "@thinh-17/fe-core";
import {
  FiCheckCircle,
  FiChevronDown,
  FiClock,
  FiPlus,
  FiArrowRight,
} from "react-icons/fi";
import { errorMessage, showDate } from "../../proposition/lib/proposition.js";
import {
  defaultSchema,
  groupFields,
  replaceGroup,
  samplePayload,
  configurationForSave,
} from "../lib/planSale.js";
import { savePlanSale, planSaleAction } from "../api/planSale.api.js";
import { SaleSchemaBuilder } from "./SaleSchemaBuilder.jsx";

const SECTIONS = [
  "General information",
  "Customer",
  "Sale / Plan",
  "Additional information",
  "Post-workflow",
  "Preview",
];
const WORKFLOWS = [
  ["CREATE_OR_LINK_CUSTOMER", "Create or link Customer"],
  ["SEND_EMAIL_NOTIFICATION", "Send email notification"],
];

export function PlanSaleEditor({ row, proposition, plan, onSaved, onReload }) {
  const draftVersion = row?.versions.find((v) => v.status === "DRAFT");
  const [selected, setSelected] = useState(
    draftVersion?.version ?? row?.activeVersion,
  );
  const viewing = row?.versions.find((v) => v.version === selected);
  const [configuration, setConfiguration] = useState(
    configurationForSave(
      draftVersion?.configuration ??
        viewing?.configuration ?? {
          name: `${plan.name} sales`,
          description: "",
          maxItems: 1000,
          payloadSchema: defaultSchema(),
          postWorkflows: [],
        },
    ),
  );
  const [step, setStep] = useState(0),
    [dirty, setDirty] = useState(false),
    [validation, setValidation] = useState(null),
    [confirm, setConfirm] = useState(false);
  const editable = !row || viewing?.status === "DRAFT";
  const config = editable ? configuration : viewing.configuration;
  const currency = plan.costing?.currency ?? proposition.definition.currency;
  const set = (key, value) => {
    setConfiguration((c) => ({ ...c, [key]: value }));
    setDirty(true);
    setValidation(null);
    setConfirm(false);
  };
  const mutation = useMutation({
    mutationFn: (action) =>
      action === "save"
        ? savePlanSale(proposition.id, plan.id, row, configuration)
        : planSaleAction(proposition.id, plan.id, action, row.revision),
    onSuccess: (result, action) => {
      if (action === "validate") setValidation(result);
      else onSaved(result);
    },
  });
  const section = (index, children, detail) => (
    <details
      className="sale-section"
      data-sale-step={index}
      open={step === index}
    >
      <summary
        onClick={(event) => {
          event.preventDefault();
          setStep(step === index ? -1 : index);
        }}
      >
        <span>{SECTIONS[index]}</span>
        <span className="sale-section-meta">
          {detail}
          <FiChevronDown aria-hidden="true" />
        </span>
      </summary>
      <div className="sale-section-body">{children}</div>
    </details>
  );
  const schemaSection = (group, description) => (
    <>
      <p className="sale-section-description">{description}</p>
      <fieldset disabled={!editable || mutation.isPending}>
        <SaleSchemaBuilder
          fields={groupFields(config.payloadSchema, group)}
          onChange={(fields) =>
            set(
              "payloadSchema",
              replaceGroup(config.payloadSchema, group, fields),
            )
          }
          disabled={!editable || mutation.isPending}
          allowAdd={false}
        />
        {group !== "sale" &&
          !groupFields(config.payloadSchema, group).some(
            (f) =>
              f.name === (group === "customer" ? "customer" : "additionalInfo"),
          ) &&
          editable && (
            <button
              type="button"
              className="sale-add"
              disabled={mutation.isPending}
              onClick={() =>
                set(
                  "payloadSchema",
                  replaceGroup(config.payloadSchema, group, [
                    ...groupFields(config.payloadSchema, group),
                    {
                      name:
                        group === "customer" ? "customer" : "additionalInfo",
                      type: "OBJECT",
                      required: false,
                      fields: [],
                    },
                  ]),
                )
              }
            >
              <FiPlus /> Add{" "}
              {group === "customer"
                ? "customer information"
                : "additional information"}
            </button>
          )}
      </fieldset>
    </>
  );
  return (
    <div className="sale-editor">
      {row?.activeVersion && <div className="sale-notice"><strong>Sale API · Active v{row.activeVersion}</strong><p><code style={{ overflowWrap: "anywhere" }}>POST /api/v1/sales/{row.id}/transactions</code></p><p className="sale-muted">Send the Payload JSON with an authenticated Tenant token that has TRANSACTION_SUBMIT permission.</p></div>}
      {!plan.active && (
        <p className="sale-notice">
          Save a Draft now. Activation requires an approved, effective
          Proposition and Plan.
        </p>
      )}
      {row && (
        <div
          className="sale-version-tabs"
          aria-label="Sale configuration versions"
        >
          {row.versions.map((v) => (
            <button
              type="button"
              key={v.version}
              aria-pressed={selected === v.version}
              onClick={() => {
                setSelected(v.version);
                setStep(0);
                setConfirm(false);
                setValidation(null);
              }}
            >
              v{v.version} · {v.status}
            </button>
          ))}
        </div>
      )}
      {!editable && (
        <p className="sale-notice">
          This version is read-only.{" "}
          {draftVersion
            ? "Select the Draft version to edit."
            : "Create a new Draft version to change the configuration."}
        </p>
      )}
      <form
        noValidate
        key={selected ?? "new"}
        onSubmit={(event) => {
          event.preventDefault();
          const invalid = event.currentTarget.querySelector(
            "input:invalid, select:invalid, textarea:invalid",
          );
          if (invalid) {
            const panel = invalid.closest("[data-sale-step]");
            if (panel) {
              panel.open = true;
              setStep(Number(panel.dataset.saleStep));
            }
            invalid.focus();
            invalid.reportValidity();
            return;
          }
          mutation.mutate("save");
        }}
      >
        {section(
          0,
          <fieldset disabled={!editable || mutation.isPending}>
            <dl className="sale-context">
              <div>
                <dt>Proposition</dt>
                <dd>{proposition.definition.name}</dd>
              </div>
              <div>
                <dt>Plan</dt>
                <dd>
                  {plan.name} · v{plan.version}
                </dd>
              </div>
              <div>
                <dt>Currency</dt>
                <dd>{currency}</dd>
              </div>
            </dl>
            <div className="sale-form-grid">
              <label>
                Orchestrator name
                <input
                  required
                  maxLength={200}
                  value={config.name}
                  onChange={(e) => set("name", e.target.value)}
                />
              </label>
              <label>
                Maximum invoice items
                <input
                  required
                  type="number"
                  min={1}
                  max={1000}
                  value={config.maxItems}
                  onChange={(e) => set("maxItems", Number(e.target.value))}
                />
              </label>
              <label className="sale-wide">
                Description
                <textarea
                  maxLength={2000}
                  value={config.description ?? ""}
                  onChange={(e) => set("description", e.target.value)}
                />
              </label>
            </div>
          </fieldset>,
        )}
        {section(
          1,
          schemaSection(
            "customer",
            "Define customer information as an object, including names, email and contact fields.",
          ),
          `${groupFields(config.payloadSchema, "customer").length} groups / fields`,
        )}
        {section(
          2,
          <>
            <dl className="sale-context">
              <div>
                <dt>Plan</dt>
                <dd>{plan.name}</dd>
              </div>
              <div>
                <dt>Currency</dt>
                <dd>{currency}</dd>
              </div>
            </dl>
            {schemaSection(
              "sale",
              "Configure invoice data and line items. Standard transaction fields remain required.",
            )}
          </>,
          "Invoice & items",
        )}
        {section(
          3,
          schemaSection(
            "additional",
            "Add custom information using nested objects or arrays. Existing custom fields are preserved.",
          ),
          `${groupFields(config.payloadSchema, "additional").length} groups / fields`,
        )}
        {section(
          4,
          <fieldset disabled={!editable || mutation.isPending}>
            {WORKFLOWS.map(([type, label]) => (
              <label className="sale-workflow" key={type}>
                <input
                  type="checkbox"
                  checked={config.postWorkflows.includes(type)}
                  onChange={(e) =>
                    set(
                      "postWorkflows",
                      e.target.checked
                        ? [...config.postWorkflows, type]
                        : config.postWorkflows.filter((v) => v !== type),
                    )
                  }
                />
                {label}
              </label>
            ))}
            <p className="sale-muted">
              Enabled actions are saved with this version for execution after a
              successful transaction. Execution requires the transaction
              services to be available.
            </p>
          </fieldset>,
          `${config.postWorkflows.length} enabled`,
        )}
        {section(5, <SaleJsonPreview config={config} currency={currency} />)}
        <div className="sale-footer">
          <div className="sale-actions">
            {editable && (
              <CoreButton type="submit" loading={mutation.isPending}>
                Save Sale Draft
              </CoreButton>
            )}
            {row && editable && (
              <>
                <CoreButton
                  type="button"
                  variant="secondary"
                  disabled={dirty || mutation.isPending}
                  onClick={() => mutation.mutate("validate")}
                >
                  <FiCheckCircle /> Validate saved Draft
                </CoreButton>
                <CoreButton
                  type="button"
                  disabled={dirty || !plan.active || mutation.isPending}
                  onClick={() => setConfirm(true)}
                >
                  Activate saved Draft
                </CoreButton>
              </>
            )}
            {row && !draftVersion && (
              <CoreButton
                type="button"
                disabled={mutation.isPending}
                onClick={() => mutation.mutate("versions")}
              >
                <FiPlus /> New Sale version
              </CoreButton>
            )}
          </div>
          {step < SECTIONS.length - 1 && (
            <CoreButton
              type="button"
              disabled={mutation.isPending}
              onClick={(event) => {
                const next = Math.max(0, step + 1);
                const panel = event.currentTarget.form?.querySelector(
                  `[data-sale-step="${next}"]`,
                );
                setStep(next);
                requestAnimationFrame(() =>
                  panel?.scrollIntoView({ behavior: "smooth", block: "start" }),
                );
              }}
            >
              Next <FiArrowRight />
            </CoreButton>
          )}
        </div>
        {dirty && row && (
          <p className="sale-muted">
            Save your changes before validation or activation.
          </p>
        )}
      </form>
      {validation && (
        <div
          className={validation.valid ? "sale-notice" : "sale-error"}
          role={validation.valid ? "status" : "alert"}
        >
          {validation.valid ? (
            "This Plan's Sale configuration is valid."
          ) : (
            <ul>
              {validation.errors.map((message, i) => (
                <li key={i}>{message}</li>
              ))}
            </ul>
          )}
        </div>
      )}
      {confirm && (
        <div className="sale-confirm">
          <p>
            Activate Sale v{draftVersion.version} for{" "}
            <strong>{plan.name}</strong>? The previous Sale version will be
            archived.
          </p>
          <div className="sale-actions">
            <CoreButton
              disabled={mutation.isPending}
              onClick={() => mutation.mutate("activate")}
            >
              Confirm Sale activation
            </CoreButton>
            <CoreButton variant="secondary" onClick={() => setConfirm(false)}>
              Cancel
            </CoreButton>
          </div>
        </div>
      )}
      {mutation.isError && (
        <p role="alert" className="sale-error">
          {errorMessage(mutation.error)}{" "}
          {mutation.error?.response?.status === 409 && (
            <button onClick={onReload}>Reload latest configuration</button>
          )}
        </p>
      )}
      {row && <SaleHistory row={row} />}
    </div>
  );
}
function SaleJsonPreview({ config, currency }) {
  const [mode, setMode] = useState("payload");
  const data =
    mode === "payload"
      ? samplePayload(config.payloadSchema, currency)
      : config.payloadSchema;
  return (
    <div className="sale-preview">
      <div className="sale-preview-tabs" aria-label="JSON preview mode">
        <button
          type="button"
          aria-pressed={mode === "payload"}
          onClick={() => setMode("payload")}
        >
          Payload JSON
        </button>
        <button
          type="button"
          aria-pressed={mode === "schema"}
          onClick={() => setMode("schema")}
        >
          Schema JSON
        </button>
      </div>
      <p className="sale-muted">
        {mode === "payload"
          ? "Example values follow the configured fields and defaults. This preview does not submit a transaction."
          : "The schema saved with this Sale version."}
      </p>
      <pre
        aria-label={
          mode === "payload" ? "Payload JSON preview" : "Schema JSON preview"
        }
      >
        <code>{JSON.stringify(data, null, 2)}</code>
      </pre>
    </div>
  );
}
function SaleHistory({ row }) {
  return (
    <details className="sale-history">
      <summary>
        <FiClock /> Sale version history & audit
      </summary>
      <div className="sale-table-scroll">
        <table>
          <thead>
            <tr>
              <th>Version</th>
              <th>Status</th>
              <th>Created</th>
              <th>Created by</th>
              <th>Activated</th>
              <th>Activated by</th>
            </tr>
          </thead>
          <tbody>
            {row.versions.map((v) => (
              <tr key={v.version}>
                <td>v{v.version}</td>
                <td>{v.status}</td>
                <td>{showDate(v.createdAt)}</td>
                <td>{v.createdBy}</td>
                <td>{showDate(v.activatedAt)}</td>
                <td>{v.activatedBy ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <ul>
        {row.audit.map((a, i) => (
          <li key={i}>
            {a.action} · v{a.version} · {showDate(a.at)} · {a.actor}
          </li>
        ))}
      </ul>
    </details>
  );
}
