import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { CoreButton } from "@thinh-17/fe-core";
import {
  getCurrencySettings,
  saveCurrencySettings,
} from "../api/proposition.api.js";
import { errorMessage } from "../lib/proposition.js";
import { CurrencySelect } from "../../../components/CurrencySelect.jsx";
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
  const [fallback, setFallback] = useState(settings.defaultCurrency);
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
          availableCurrencies: settings.availableCurrencies,
          defaultCurrency: fallback,
        });
      }}
    >
      <fieldset disabled={mutation.isPending}>
        <p className="prop-muted">
          Choose the default currency for new Propositions. Each Proposition and Plan
          can select its own currency. Existing Propositions and Plans are not changed.
        </p>
        <label>Default Proposition currency *
          <CurrencySelect required value={fallback} onChange={setFallback} />
        </label>
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
