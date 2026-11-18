import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { CoreButton } from "@thinh-17/fe-core";
import {
  getCurrencySettings,
  saveCurrencySettings,
} from "../api/proposition.api.js";
import { csv, errorMessage } from "../lib/proposition.js";
import { Field } from "./PropositionFields.jsx";
export function CurrencySettingsForm({ scope, onCancel, onSaved }) {
  const query = useQuery({
    queryKey: ["propositions", scope, "settings"],
    queryFn: ({ signal }) => getCurrencySettings(signal),
  });
  if (query.isPending) return <p role="status">Loading currency settings...</p>;
  if (query.isError)
    return (
      <p className="prop-error" role="alert">
        {errorMessage(query.error)}{" "}
        <button onClick={() => query.refetch()}>Retry</button>
        <button onClick={onCancel}>Back</button>
      </p>
    );
  return (
    <Editor
      key={query.data.revision ?? "new"}
      settings={query.data}
      onCancel={onCancel}
      onSaved={onSaved}
    />
  );
}
function Editor({ settings, onCancel, onSaved }) {
  const [available, setAvailable] = useState(
      settings.availableCurrencies.join(", "),
    ),
    [fallback, setFallback] = useState(settings.defaultCurrency);
  const mutation = useMutation({
    mutationFn: saveCurrencySettings,
    onSuccess: onSaved,
  });
  return (
    <form
      className="prop-form"
      onSubmit={(event) => {
        event.preventDefault();
        mutation.mutate({
          expectedRevision: settings.revision,
          availableCurrencies: csv(available).map((code) => code.toUpperCase()),
          defaultCurrency: fallback.toUpperCase(),
        });
      }}
    >
      <fieldset disabled={mutation.isPending}>
        <p className="prop-muted">
          Currency settings apply to this Enterprise's Proposition/Plan pricing.
          Existing approved Plan prices are preserved.
        </p>
        <Field
          label="Available currencies *"
          required
          placeholder="USD, VND, EUR"
          value={available}
          onChange={setAvailable}
        />
        <Field
          label="Default currency *"
          required
          maxLength={3}
          value={fallback}
          onChange={setFallback}
        />
      </fieldset>
      {mutation.isError && (
        <p role="alert" className="prop-error">
          {errorMessage(mutation.error)}
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
          Save currencies
        </CoreButton>
      </div>
    </form>
  );
}
