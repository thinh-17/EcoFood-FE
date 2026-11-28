import { FeedbackMessage } from "../../../components/FeedbackMessage.jsx";
import { CoreLoadingState } from "@thinh-17/fe-core";
import { CorePagination as Pagination } from "@thinh-17/fe-core";
import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { CoreCard, CoreTable } from "@thinh-17/fe-core";
import { CoreButton } from "@thinh-17/fe-core";
import { PageHeader as CorePageHeader } from "../../../components/PageHeader.jsx";
import { FiFileText, FiLink } from "react-icons/fi";
import { useAuthStore } from "../../auth/store/authStore.js";
import { customerApi as api } from "../api/customer.api.js";
import { finishCustomerAuth } from "../lib/customerAuth.js";
import { CustomerLogin } from "../components/CustomerLogin.jsx";
import { useCustomerProfile } from "../hooks/useCustomerProfile.js";
import { customerMoney, customerError, receiptToken, customerInvoicePath } from "../lib/customer.lib.js";
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
          <FeedbackMessage error={error}>
            {error}
          </FeedbackMessage>
          <Link to="/customer/login">Log in again</Link>
        </>
      ) : (
        <CoreLoadingState title="Verifying your sign-in" description="Linking your invoice if requested." />
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
  const profile = useCustomerProfile();
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
        <FeedbackMessage error={error}>
          {error}
        </FeedbackMessage>
      )}
      {!receipt && !error && <CoreLoadingState title="Loading invoice" />}
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
  const profile = useCustomerProfile();
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
      accessorKey: "id",
      header: "Invoice",
      cell: ({ row }) => (
        <Link to={customerInvoicePath(row.original.id, profile.data.tenantId)}>{row.original.id}</Link>
      ),
    },
    { accessorKey: "receivedAt", header: "Received date", cell: ({ getValue }) => date(getValue()) },
    {
      accessorKey: "totalAmount",
      header: "Total",
      cell: ({ row }) => customerMoney(row.original.totalAmount, row.original.currency),
    },
  ];

  return (
    <section className="eco-module-page customer-page">
      <CorePageHeader
        eyebrow="EcoFood Platform / Customer"
        title={invoiceId ? "Invoice details" : "Purchase History"}
        description="View the invoices linked to your Customer account."
      />
      {!bearer && <CustomerLogin tenant={params.get("tenant") || currentTenant} invoiceId={invoiceId} />}
      {bearer && profile.isPending && <CoreLoadingState title="Loading profile" />}
      {profile.error && (
        <>
          <FeedbackMessage error={profile.error}>
            {customerError(profile.error)}
          </FeedbackMessage>
          <CustomerLogin tenant={params.get("tenant") || currentTenant} invoiceId={invoiceId} />
        </>
      )}
      {(detail.error || history.error) && (
        <FeedbackMessage error={detail.error || history.error}>
          {customerError(detail.error || history.error)}
        </FeedbackMessage>
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
                <Pagination page={page} hasNext={history.data?.hasNext} onPageChange={setPage} disabled={history.isFetching} label="Purchase history pagination" />
              </CoreCard>
            </>
          )}
          {invoiceId && detail.isPending && <CoreLoadingState title="Loading invoice details" />}
          {invoiceId && detail.data && (
            <>
              <InvoiceContent invoice={detail.data} />
              <Link to={`/customer/complaints?invoiceId=${encodeURIComponent(invoiceId)}`}>
                File a Service complaint about this invoice
              </Link>
              <p>The confirmation email is sent asynchronously after linking. Reopening this page won&apos;t resend it.</p>
            </>
          )}
        </>
      )}
    </section>
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
      <h2>Invoice {invoice.id}</h2>
      {(invoice.tenantId || invoice.tenantName) && <p>Submitted by tenant: {invoice.tenantName || invoice.tenantId}</p>}
      <p>Received date: {date(invoice.receivedAt)}</p>
      <CoreTable columns={itemColumns} data={invoice.items || []} emptyTitle="No items on this invoice." />
      <p className="customer-total">Total: {customerMoney(invoice.totalAmount, invoice.currency)}</p>
    </CoreCard>
  );
}
