import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { CoreButton, CoreCard, CoreEmptyState, CorePageHeader, CoreTable } from "@thinh-17/fe-core";
import { FiFileText, FiUser, FiLink, FiLayers } from "react-icons/fi";
import { useAuthStore } from "../auth/store/authStore.js";
import { customerApi as api } from "./customer.api.js";
import { startCustomerAuth, finishCustomerAuth } from "./customerAuth.js";
import { customerMoney, customerError, receiptToken, customerInvoicePath } from "./customer.lib.js";
import "./CustomerPages.css";

export function CustomerLoginPage() {
  const [params] = useSearchParams();
  const tenant = useAuthStore((s) => s.tenantId);
  return (
    <main className="eco-module-page customer-page">
      <CorePageHeader
        eyebrow="EcoFood Platform / Customer"
        title="Customer Login"
        description="Sign in or register through Keycloak."
      />
      <CustomerLogin tenant={params.get("tenant") || tenant} />
    </main>
  );
}

function CustomerLogin({ tenant, token = "", invoiceId = "" }) {
  const [error, setError] = useState("");
  // The external-customer QR's loginUrl carries no ?tenant= (every such
  // Customer is created under the same onboarding Tenant) — resolve it here
  // instead, rather than making the caller know about that convention.
  const defaultTenant = useQuery({
    queryKey: ["customer-default-tenant"],
    queryFn: api.defaultTenant,
    enabled: !tenant,
    retry: false,
  });
  const effectiveTenant = tenant || defaultTenant.data?.tenantId;
  const config = useQuery({
    queryKey: ["customer-login", effectiveTenant],
    queryFn: () => api.config(effectiveTenant),
    enabled: !!effectiveTenant,
    retry: false,
  });

  async function begin(register) {
    try {
      setError("");
      await startCustomerAuth(config.data, register, token, invoiceId);
    } catch (e) {
      setError(customerError(e));
    }
  }

  if (!effectiveTenant) {
    if (defaultTenant.isFetching) {
      return <p role="status">Loading sign-in configuration…</p>;
    }
    return (
      <CoreEmptyState
        icon={FiLayers}
        title="Tenant not specified"
        description={
          defaultTenant.error
            ? customerError(defaultTenant.error)
            : "Open the Customer Portal from your tenant domain, or from an invoice link, so we can identify the Tenant."
        }
      />
    );
  }

  return (
    <CoreCard className="customer-panel">
      {config.isFetching && <p role="status">Loading sign-in configuration…</p>}
      {(config.error || error) && (
        <p role="alert" className="customer-error">
          {error || customerError(config.error)}
        </p>
      )}
      {config.data && (
        <>
          <p>
            {token
              ? "Sign in as a Customer to confirm the invoice link and receive a confirmation email."
              : "Sign-in and email verification are handled by Keycloak."}
          </p>
          <div className="customer-actions">
            <CoreButton onClick={() => begin(false)}>
              Log in{token ? " & link invoice" : ""}
            </CoreButton>
            <CoreButton
              variant="secondary"
              disabled={!config.data.registrationEnabled}
              onClick={() => begin(true)}
            >
              Register as Customer
            </CoreButton>
          </div>
          {!config.data.registrationEnabled && (
            <small>This tenant hasn&apos;t enabled new Customer registration.</small>
          )}
        </>
      )}
    </CoreCard>
  );
}

export function CustomerCallbackPage() {
  const started = useRef(false);
  const navigate = useNavigate();
  const [error, setError] = useState("");
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    const params = new URLSearchParams(window.location.search);
    window.history.replaceState({}, "", window.location.pathname);
    finishCustomerAuth(params)
      .then((path) => navigate(path, { replace: true }))
      .catch((e) => setError(customerError(e)));
  }, [navigate]);
  return (
    <main className="eco-module-page customer-page">
      {error ? (
        <>
          <p role="alert" className="customer-error">
            {error}
          </p>
          <Link to="/customer/login">Log in again</Link>
        </>
      ) : (
        <p role="status">Verifying your Customer sign-in and linking the invoice if requested…</p>
      )}
    </main>
  );
}

export function ReceiptPage() {
  const cache = useQueryClient();
  const [token, setToken] = useState(() => receiptToken(window.location.hash));
  const [pasted, setPasted] = useState("");
  const [receipt, setReceipt] = useState(null);
  const [error, setError] = useState(() =>
    token ? "" : "This invoice link is missing a valid verification code.",
  );
  const [busy, setBusy] = useState(false);
  const bearer = useAuthStore((s) => s.internalAccessToken);
  const navigate = useNavigate();
  const profile = useQuery({
    queryKey: ["customer", bearer, "profile"],
    queryFn: api.profile,
    enabled: !!bearer,
    retry: false,
  });
  useEffect(() => {
    window.history.replaceState({}, "", window.location.pathname + window.location.search);
    if (!token) return;
    let active = true;
    api
      .receipt(token)
      .then((data) => {
        if (active) setReceipt(data);
      })
      .catch(() => {
        if (active)
          setError("This invoice isn't available: the link may have expired, been revoked, or already been linked.");
      });
    return () => {
      active = false;
    };
  }, [token]);

  async function claim() {
    setBusy(true);
    setError("");
    try {
      const result = await api.claim(token);
      await cache.invalidateQueries({ queryKey: ["customer", bearer, "invoices"] });
      navigate(customerInvoicePath(result.invoice.id, receipt.login.tenantId), { replace: true });
    } catch (e) {
      setError(customerError(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="eco-module-page customer-page">
      <CorePageHeader
        eyebrow="EcoFood Platform / Customer"
        title="E-Invoice"
        description="View it instantly; link it to your account to keep it in your history and receive an email copy."
      />
      {!token && (
        <CoreCard className="customer-panel customer-profile">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              let value = /^[A-Za-z0-9_-]{43}$/.test(pasted.trim()) ? pasted.trim() : "";
              if (!value) {
                try {
                  value = receiptToken(new URL(pasted.trim(), window.location.origin).hash);
                } catch {
                  /* Show validation error below. */
                }
              }
              if (value) {
                setError("");
                setToken(value);
                setPasted("");
              } else setError("Invalid receipt link or code.");
            }}
          >
            <label>
              Link or code from the invoice QR
              <input
                className="fe-input"
                required
                maxLength={2048}
                autoComplete="off"
                spellCheck={false}
                value={pasted}
                onChange={(e) => setPasted(e.target.value)}
              />
            </label>
            <CoreButton type="submit">View invoice</CoreButton>
          </form>
        </CoreCard>
      )}
      {error && (
        <p role="alert" className="customer-error">
          {error}
        </p>
      )}
      {!receipt && !error && <p role="status">Loading invoice…</p>}
      {receipt && (
        <>
          <InvoiceContent invoice={receipt} />
          {profile.data?.tenantId === receipt.login.tenantId ? (
            <CoreCard className="customer-panel">
              <p>Link this invoice to your account ({profile.data.email}) and send a confirmation email.</p>
              <CoreButton disabled={busy} onClick={claim}>
                <FiLink /> Link invoice & send email
              </CoreButton>
            </CoreCard>
          ) : (
            <CustomerLogin tenant={receipt.login.tenantId} token={token} />
          )}
        </>
      )}
      <Link to="/customer">My Purchase History</Link>
    </main>
  );
}

export function CustomerPortalPage() {
  const bearer = useAuthStore((s) => s.internalAccessToken);
  const currentTenant = useAuthStore((s) => s.tenantId);
  const [params] = useSearchParams();
  const { invoiceId } = useParams();
  const client = useQueryClient();
  const profile = useQuery({
    queryKey: ["customer", bearer, "profile"],
    queryFn: api.profile,
    enabled: !!bearer,
    retry: false,
  });
  const [page, setPage] = useState(0);
  const history = useQuery({
    queryKey: ["customer", bearer, "invoices", page],
    queryFn: () => api.invoices(page),
    enabled: !!profile.data && !invoiceId,
    retry: false,
  });
  const detail = useQuery({
    queryKey: ["customer", bearer, "invoice", invoiceId],
    queryFn: () => api.invoice(invoiceId),
    enabled: !!profile.data && !!invoiceId,
    retry: false,
  });
  const invoiceColumns = [
    {
      accessorKey: "invoiceNumber",
      header: "Invoice",
      cell: ({ row }) => (
        <Link to={customerInvoicePath(row.original.id, profile.data.tenantId)}>{row.original.invoiceNumber}</Link>
      ),
    },
    { accessorKey: "transactionTime", header: "Date", cell: ({ getValue }) => date(getValue()) },
    {
      accessorKey: "totalAmount",
      header: "Total",
      cell: ({ row }) => customerMoney(row.original.totalAmount, row.original.currency),
    },
    { accessorKey: "paymentStatus", header: "Status", cell: ({ getValue }) => getValue() || "Unknown" },
  ];

  return (
    <main className="eco-module-page customer-page">
      <CorePageHeader
        eyebrow="EcoFood Platform / Customer"
        title="Customer Portal"
        description="Your profile and the invoices linked to your account in the current Tenant."
      />
      <nav className="customer-nav">
        <Link to="/customer">
          <FiUser /> Profile & history
        </Link>
        <Link to="/customer/complaints">Customer Care</Link>
        <Link to="/receipt">
          <FiLink /> Scan a receipt link/QR to link it
        </Link>
        {bearer && (
          <CoreButton
            variant="secondary"
            size="sm"
            onClick={() => {
              client.removeQueries({ queryKey: ["customer"] });
              useAuthStore.getState().logout();
            }}
          >
            Log out
          </CoreButton>
        )}
      </nav>
      {!bearer && <CustomerLogin tenant={params.get("tenant") || currentTenant} invoiceId={invoiceId} />}
      {bearer && profile.isPending && <p role="status">Loading profile…</p>}
      {profile.error && (
        <>
          <p role="alert" className="customer-error">
            {customerError(profile.error)}
          </p>
          <CustomerLogin tenant={params.get("tenant") || currentTenant} invoiceId={invoiceId} />
        </>
      )}
      {(detail.error || history.error) && (
        <p role="alert" className="customer-error">
          {customerError(detail.error || history.error)}
        </p>
      )}
      {profile.data && (
        <>
          {!invoiceId && (
            <>
              <p className="customer-greeting">
                <em>Hi {profile.data.email}</em>
              </p>
              <CoreCard className="customer-panel">
                <h2>
                  <FiFileText /> Purchase History
                </h2>
                <CoreTable
                  columns={invoiceColumns}
                  data={history.data?.content ?? []}
                  loading={history.isPending}
                  emptyTitle="No linked invoices yet — scan a QR code at checkout to save one to your account."
                />
                <div className="customer-pagination">
                  <CoreButton size="sm" variant="secondary" disabled={page === 0} onClick={() => setPage(page - 1)}>
                    Previous
                  </CoreButton>
                  <span>Page {page + 1}</span>
                  <CoreButton
                    size="sm"
                    variant="secondary"
                    disabled={!history.data?.hasNext}
                    onClick={() => setPage(page + 1)}
                  >
                    Next
                  </CoreButton>
                </div>
              </CoreCard>
            </>
          )}
          {invoiceId && detail.isPending && <p role="status">Loading invoice details…</p>}
          {invoiceId && detail.data && (
            <>
              <InvoiceContent invoice={detail.data} />
              <Link to={`/customer/complaints?invoiceId=${encodeURIComponent(invoiceId)}`}>
                File a complaint about this Tenant via this invoice
              </Link>
              <p>The confirmation email is sent asynchronously after linking. Reopening this page won&apos;t resend it.</p>
            </>
          )}
        </>
      )}
    </main>
  );
}

function date(value) {
  return value ? new Date(value).toLocaleString("en-US") : "Unknown";
}

export function InvoiceContent({ invoice }) {
  const itemColumns = [
    { accessorKey: "productName", header: "Product" },
    { accessorKey: "quantity", header: "Qty" },
    {
      accessorKey: "unitPrice",
      header: "Unit price",
      cell: ({ row }) => customerMoney(row.original.unitPrice, invoice.currency),
    },
    {
      accessorKey: "amount",
      header: "Amount",
      cell: ({ row }) => customerMoney(row.original.amount, invoice.currency),
    },
  ];
  return (
    <CoreCard className="customer-panel">
      <h2>Invoice {invoice.invoiceNumber}</h2>
      <p>Date: {date(invoice.transactionTime)}</p>
      {invoice.paymentStatus && <p>Status: {invoice.paymentStatus}</p>}
      <CoreTable columns={itemColumns} data={invoice.items || []} emptyTitle="No items on this invoice." />
      <p className="customer-total">Total: {customerMoney(invoice.totalAmount, invoice.currency)}</p>
    </CoreCard>
  );
}
