import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { CorePageHeader } from "@thinh-17/fe-core";
import { FiFileText, FiUser, FiLink } from "react-icons/fi";
import { useAuthStore } from "../auth/store/authStore.js";
import { customerApi as api } from "./customer.api.js";
import { startCustomerAuth, finishCustomerAuth } from "./customerAuth.js";
import { customerMoney, customerError, receiptToken, customerInvoicePath } from "./customer.lib.js";
import "./CustomerPages.css";

export function CustomerLoginPage() {
  const [params] = useSearchParams(); const tenant = useAuthStore((s) => s.tenantId);
  return <main className="customer-page"><CorePageHeader title="Customer" description="Đăng ký và đăng nhập bằng Keycloak." /><CustomerLogin tenant={params.get("tenant") || tenant} /></main>;
}
function CustomerLogin({ tenant, token = "", invoiceId = "" }) {
  const [error, setError] = useState("");
  const config = useQuery({ queryKey: ["customer-login", tenant], queryFn: () => api.config(tenant), enabled: !!tenant, retry: false });
  async function begin(register) { try { setError(""); await startCustomerAuth(config.data, register, token, invoiceId); } catch (e) { setError(customerError(e)); } }
  return <section className="customer-panel">
    {!tenant && <p role="alert">Mở Customer Portal trên domain Tenant hoặc từ link hóa đơn để xác định Tenant.</p>}
    {config.isFetching && <p role="status">Đang tải cấu hình đăng nhập…</p>}
    {(config.error || error) && <p role="alert">{error || customerError(config.error)}</p>}
    {config.data && <><p>{token ? "Đăng nhập Customer để xác nhận liên kết Invoice và nhận Email." : "Thông tin đăng nhập và xác minh Email được xử lý tại Keycloak."}</p>
      <button onClick={() => begin(false)}>Đăng nhập{token ? " & liên kết Invoice" : ""}</button>
      <button disabled={!config.data.registrationEnabled} onClick={() => begin(true)}>Đăng ký Customer</button>
      {!config.data.registrationEnabled && <small>Tenant chưa bật đăng ký Customer mới.</small>}
    </>}
  </section>;
}
export function CustomerCallbackPage() {
  const started = useRef(false), navigate = useNavigate(); const [error, setError] = useState("");
  useEffect(() => {
    if (started.current) return; started.current = true;
    const params = new URLSearchParams(window.location.search);
    window.history.replaceState({}, "", window.location.pathname);
    finishCustomerAuth(params).then((path) => navigate(path, { replace: true })).catch((e) => setError(customerError(e)));
  }, [navigate]);
  return <main className="customer-page">{error ? <><p role="alert">{error}</p><Link to="/customer/login">Đăng nhập lại</Link></> : <p role="status">Đang xác thực Customer và liên kết Invoice nếu đã yêu cầu…</p>}</main>;
}
export function ReceiptPage() {
  const cache = useQueryClient();
  const [token, setToken] = useState(() => receiptToken(window.location.hash));
  const [pasted, setPasted] = useState("");
  const [receipt, setReceipt] = useState(null), [error, setError] = useState(() => token ? "" : "Link hóa đơn thiếu mã xác minh hợp lệ."), [busy, setBusy] = useState(false);
  const bearer = useAuthStore((s) => s.internalAccessToken), navigate = useNavigate();
  const profile = useQuery({ queryKey: ["customer", bearer, "profile"], queryFn: api.profile, enabled: !!bearer, retry: false });
  useEffect(() => {
    window.history.replaceState({}, "", window.location.pathname + window.location.search);
    if (!token) return;
    let active = true;
    api.receipt(token).then((data) => { if (active) setReceipt(data); }).catch(() => { if (active) setError("Hóa đơn không khả dụng: link có thể hết hạn, bị thu hồi hoặc đã liên kết."); });
    return () => { active = false; };
  }, [token]);
  async function claim() {
    setBusy(true); setError("");
    try { const result = await api.claim(token); await cache.invalidateQueries({ queryKey: ["customer", bearer, "invoices"] }); navigate(customerInvoicePath(result.invoice.id, receipt.login.tenantId), { replace: true }); }
    catch (e) { setError(customerError(e)); } finally { setBusy(false); }
  }
  return <main className="customer-page"><CorePageHeader title="Hóa đơn điện tử" description="Xem tại chỗ; liên kết tài khoản để lưu trong lịch sử và nhận Email." />
    {!token && <form className="customer-panel customer-profile" onSubmit={(e) => {
      e.preventDefault(); let value = /^[A-Za-z0-9_-]{43}$/.test(pasted.trim()) ? pasted.trim() : "";
      if (!value) { try { value = receiptToken(new URL(pasted.trim(), window.location.origin).hash); } catch { /* Show validation error below. */ } }
      if (value) { setError(""); setToken(value); setPasted(""); } else setError("Link hoặc mã receipt không hợp lệ.");
    }}><label>Link hoặc mã từ QR Invoice<input required maxLength={2048} autoComplete="off" spellCheck={false} value={pasted} onChange={(e) => setPasted(e.target.value)} /></label><button type="submit">Xem Invoice</button></form>}
    {error && <p role="alert" className="customer-error">{error}</p>}
    {!receipt && !error && <p role="status">Đang tải hóa đơn…</p>}
    {receipt && <><InvoiceContent invoice={receipt} />
      {profile.data?.tenantId === receipt.login.tenantId ? <section className="customer-panel"><p>Liên kết Invoice với tài khoản {profile.data.email} và gửi Email xác nhận.</p><button disabled={busy} onClick={claim}><FiLink /> Liên kết Invoice & gửi Email</button></section>
        : <CustomerLogin tenant={receipt.login.tenantId} token={token} />}
    </>}
    <Link to="/customer">Purchase History của tôi</Link>
  </main>;
}
export function CustomerPortalPage() {
  const bearer = useAuthStore((s) => s.internalAccessToken), currentTenant = useAuthStore((s) => s.tenantId);
  const [params] = useSearchParams(); const { invoiceId } = useParams(); const client = useQueryClient();
  const profile = useQuery({ queryKey: ["customer", bearer, "profile"], queryFn: api.profile, enabled: !!bearer, retry: false });
  const [page, setPage] = useState(0);
  const history = useQuery({ queryKey: ["customer", bearer, "invoices", page], queryFn: () => api.invoices(page), enabled: !!profile.data && !invoiceId, retry: false });
  const detail = useQuery({ queryKey: ["customer", bearer, "invoice", invoiceId], queryFn: () => api.invoice(invoiceId), enabled: !!profile.data && !!invoiceId, retry: false });
  const update = useMutation({ mutationFn: api.update, onSuccess: (saved) => client.setQueryData(["customer", bearer, "profile"], saved) });
  return <main className="customer-page"><CorePageHeader title="Customer Portal" description="Hồ sơ và hóa đơn thuộc sở hữu của bạn trong Tenant hiện tại." />
    <nav className="customer-nav"><Link to="/customer"><FiUser /> Hồ sơ & lịch sử</Link><Link to="/customer/complaints">Customer Care</Link><Link to="/receipt"><FiLink /> Quét link/QR hóa đơn để liên kết</Link>
      {bearer && <button onClick={() => { client.removeQueries({ queryKey: ["customer"] }); useAuthStore.getState().logout(); }}>Đăng xuất</button>}
    </nav>
    {!bearer && <CustomerLogin tenant={params.get("tenant") || currentTenant} invoiceId={invoiceId} />}
    {bearer && profile.isPending && <p role="status">Đang tải hồ sơ…</p>}
    {profile.error && <><p role="alert" className="customer-error">{customerError(profile.error)}</p><CustomerLogin tenant={params.get("tenant") || currentTenant} invoiceId={invoiceId} /></>}
    {(detail.error || history.error || update.error) && <p role="alert" className="customer-error">{customerError(detail.error || history.error || update.error)}</p>}
    {profile.data && <>
      {!invoiceId && <><ProfileEditor key={`${profile.data.id}/${profile.data.revision}`} profile={profile.data} busy={update.isPending} save={(data) => update.mutate(data)} />
        <section className="customer-panel"><h2><FiFileText /> Purchase History</h2>
          {history.isPending && <p role="status">Đang tải lịch sử…</p>}
          {history.data && !history.data.content.length && <p>Chưa có Invoice đã liên kết. Quét QR tại điểm bán để lưu hóa đơn vào tài khoản.</p>}
          <div className="customer-table"><table><thead><tr><th>Invoice</th><th>Thời điểm</th><th>Tổng tiền</th><th>Trạng thái</th></tr></thead><tbody>{(history.data?.content || []).map((invoice) => <tr key={invoice.id}><td><Link to={customerInvoicePath(invoice.id, profile.data.tenantId)}>{invoice.invoiceNumber}</Link></td><td>{date(invoice.transactionTime)}</td><td>{customerMoney(invoice.totalAmount, invoice.currency)}</td><td>{invoice.paymentStatus || "Chưa xác định"}</td></tr>)}</tbody></table></div>
          <div className="customer-pagination"><button disabled={page === 0} onClick={() => setPage(page - 1)}>Trước</button><span>Trang {page + 1}</span><button disabled={!history.data?.hasNext} onClick={() => setPage(page + 1)}>Sau</button></div>
        </section></>}
      {invoiceId && detail.isPending && <p role="status">Đang tải chi tiết Invoice…</p>}
      {invoiceId && detail.data && <><InvoiceContent invoice={detail.data} /><Link to={`/customer/complaints?invoiceId=${encodeURIComponent(invoiceId)}`}>Phàn nàn về Tenant qua Invoice này</Link><p>Email xác nhận được xử lý bất đồng bộ sau khi liên kết. Không gửi lại Email khi mở trang này.</p></>}
    </>}
  </main>;
}
function ProfileEditor({ profile, save, busy }) {
  const [firstName, setFirstName] = useState(profile.firstName || ""), [lastName, setLastName] = useState(profile.lastName || "");
  return <form className="customer-panel customer-profile" onSubmit={(e) => { e.preventDefault(); save({ ...profile, firstName, lastName }); }}><h2>Customer Profile</h2>
    <p>Email: {profile.email}</p><p>Username: {profile.username}</p>
    <label>Tên<input required maxLength={100} value={firstName} onChange={(e) => setFirstName(e.target.value)} /></label>
    <label>Họ<input required maxLength={100} value={lastName} onChange={(e) => setLastName(e.target.value)} /></label>
    <button type="submit" disabled={busy}>Lưu hồ sơ</button><small>Email, username và mật khẩu không thay đổi tại form này.</small>
  </form>;
}
function date(value) { return value ? new Date(value).toLocaleString("vi-VN") : "Chưa xác định"; }
export function InvoiceContent({ invoice }) {
  return <article className="customer-panel"><h2>Invoice {invoice.invoiceNumber}</h2><p>Thời điểm: {date(invoice.transactionTime)}</p>
    {invoice.paymentStatus && <p>Trạng thái: {invoice.paymentStatus}</p>}
    <div className="customer-table"><table><thead><tr><th>Sản phẩm</th><th>Số lượng</th><th>Đơn giá</th><th>Thành tiền</th></tr></thead><tbody>{(invoice.items || []).map((item, i) => <tr key={`${item.productCode}/${i}`}><td>{item.productName}</td><td>{item.quantity}</td><td>{customerMoney(item.unitPrice, invoice.currency)}</td><td>{customerMoney(item.amount, invoice.currency)}</td></tr>)}</tbody></table></div>
    <p className="customer-total">Tổng: {customerMoney(invoice.totalAmount, invoice.currency)}</p>
  </article>;
}
