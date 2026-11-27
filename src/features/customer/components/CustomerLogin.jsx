import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { CoreButton, CoreCard, CoreEmptyState } from "@thinh-17/fe-core";
import { FiLayers } from "react-icons/fi";
import { customerApi } from "../customer.api.js";
import { customerError } from "../customer.lib.js";
import { startCustomerAuth } from "../customerAuth.js";

export function CustomerLogin({ tenant, token = "", invoiceId = "" }) {
  const [error, setError] = useState("");
  const defaultTenant = useQuery({ queryKey: ["customer-default-tenant"], queryFn: customerApi.defaultTenant,
    enabled: !tenant, retry: false });
  const effectiveTenant = tenant || defaultTenant.data?.tenantId;
  const config = useQuery({ queryKey: ["customer-login", effectiveTenant],
    queryFn: () => customerApi.config(effectiveTenant), enabled: !!effectiveTenant, retry: false });
  async function begin(register) {
    try { setError(""); await startCustomerAuth(config.data, register, token, invoiceId); }
    catch (failure) { setError(customerError(failure)); }
  }
  if (!effectiveTenant) {
    if (defaultTenant.isFetching) return <p role="status">Loading sign-in configuration…</p>;
    return <CoreEmptyState icon={FiLayers} title="Tenant not specified"
      description={defaultTenant.error ? customerError(defaultTenant.error)
        : "Open the Customer Portal from your tenant domain, or from an invoice link, so we can identify the Tenant."} />;
  }
  return <CoreCard className="customer-panel">
    {config.isFetching && <p role="status">Loading sign-in configuration…</p>}
    {(config.error || error) && <p role="alert" className="customer-error">{error || customerError(config.error)}</p>}
    {config.data && <>
      <p>{token ? "Sign in as a Customer to confirm the invoice link and receive a confirmation email."
        : "Sign-in and email verification are handled by Keycloak."}</p>
      <div className="customer-actions">
        <CoreButton onClick={() => begin(false)}>Log in{token ? " & link invoice" : ""}</CoreButton>
        <CoreButton variant="secondary" disabled={!config.data.registrationEnabled} onClick={() => begin(true)}>Register as Customer</CoreButton>
      </div>
      {!config.data.registrationEnabled && <small>This tenant hasn&apos;t enabled new Customer registration.</small>}
    </>}
  </CoreCard>;
}
