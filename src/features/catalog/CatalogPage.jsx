import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CorePageHeader } from "@thinh-17/fe-core";
import { FiGlobe, FiPlus, FiRefreshCw, FiKey } from "react-icons/fi";
import { useAuthStore } from "../auth/store/authStore.js";
import { decodeJwt } from "../auth/lib/jwt.js";
import { catalogApi as api } from "./catalog.api.js";
import { catalogAccess, catalogActions, newCatalogDraft, localTime, catalogError } from "./catalog.js";
import "./CatalogPage.css";

export function CatalogPage() {
  const token = useAuthStore((s) => s.internalAccessToken); let claims = {};
  try { claims = decodeJwt(token); } catch { /* Backend validates the actual internal JWT. */ }
  if (!catalogAccess(claims).read) return <section className="catalog-page"><CorePageHeader title="Publish External API" /><p role="alert">Cần role Admin, Product Manager hoặc Employee thuộc Tenant.</p></section>;
  return <Workspace key={token} scope={token} />;
}
function Workspace({ scope }) {
  const client = useQueryClient(), root = ["catalog-publications", scope];
  const [type, setType] = useState(""), [apiKey, setKey] = useState(""), [page, setPage] = useState(0), [selected, select] = useState(""), [editing, edit] = useState(null);
  const capabilities = useQuery({ queryKey: [...root, "capabilities"], queryFn: api.capabilities, retry: false });
  const rights = capabilities.data || {};
  const list = useQuery({ queryKey: [...root, "list", type, apiKey, page], queryFn: () => api.list({ type: type || undefined, apiKey: apiKey || undefined, page, size: 20 }), enabled: !!rights.read, retry: false });
  const detail = useQuery({ queryKey: [...root, "detail", selected], queryFn: () => api.detail(selected), enabled: !!rights.read && !!selected, retry: false });
  const versions = useQuery({ queryKey: [...root, "versions", selected], queryFn: () => api.versions(selected), enabled: !!rights.read && !!selected, retry: false });
  const mutation = useMutation({ mutationFn: (work) => work(), onSuccess: () => client.invalidateQueries({ queryKey: root }), onError: () => client.invalidateQueries({ queryKey: root }) });
  const error = capabilities.error || list.error || detail.error || versions.error || mutation.error;
  const publication = detail.data, actions = catalogActions(publication?.status, rights);
  async function save(input) { try { const saved = await mutation.mutateAsync(() => api.save(input)); select(saved.id); edit(null); } catch { /* Keep values for correction/retry. */ } }
  function action(name) { mutation.mutate(() => api.action(publication.id, name, publication.revision)); }
  return <section className="catalog-page"><CorePageHeader title="Publish External API" description="Công bố Catalog Product/Price theo version và quyền Partner; độc lập Sale Orchestrator." />
    {capabilities.isPending && <p role="status">Đang kiểm tra quyền…</p>}
    {error && <p role="alert">{catalogError(error)}</p>}
    {rights.read && <>
      <div className="catalog-toolbar">
        {rights.manage && <button onClick={() => edit(newCatalogDraft())}><FiPlus /> Tạo Draft</button>}
        <label>Catalog<select aria-label="Catalog filter" value={type} onChange={(e) => { setType(e.target.value); setPage(0); }}><option value="">Tất cả</option><option>PRODUCT</option><option>PRICE</option></select></label>
        <label>API key<input value={apiKey} maxLength={60} onChange={(e) => { setKey(e.target.value); setPage(0); }} /></label>
        <button onClick={() => client.invalidateQueries({ queryKey: root })}><FiRefreshCw /> Tải lại</button>
      </div>
      <p>Voucher và Combo Catalog chưa có nguồn nghiệp vụ phù hợp để công bố.</p>
      {editing && rights.manage && <Editor key={`${editing.id || "new"}/${editing.version}`} draft={editing} scope={scope} busy={mutation.isPending} save={save} cancel={() => edit(null)} />}
      <div className="catalog-panel catalog-table"><table><thead><tr><th>API</th><th>Catalog</th><th>Version</th><th>Trạng thái</th><th>Partner Access</th><th>Publish</th></tr></thead><tbody>{(list.data?.content || []).map((p) => <tr key={p.id}><td><button onClick={() => { select(p.id); edit(null); mutation.reset(); }}>{p.name}</button><small>{p.apiKey}</small></td><td>{p.catalogType}</td><td>{p.version}</td><td>{p.status}</td><td>{p.grants?.length ? p.grants.map((g) => <small key={g.id}>{g.partnerId}: {g.revokedAt ? "REVOKED" : g.effective ? "ACTIVE" : "INACTIVE"}</small>) : `Chưa cấp credential (${p.partnerIds.length} Partner cấu hình)`}</td><td>{date(p.publishedAt)}</td></tr>)}</tbody></table>
        {list.isPending && <p role="status">Đang tải Publication…</p>}{list.data && !list.data.content.length && <p>Chưa có Publication trong phạm vi.</p>}
      </div>
      <div className="catalog-toolbar"><button disabled={!page} onClick={() => setPage(page - 1)}>Trước</button><span>Trang {page + 1}</span><button disabled={!list.data?.hasNext} onClick={() => setPage(page + 1)}>Sau</button></div>
      {selected && detail.isPending && <p role="status">Đang tải chi tiết…</p>}
      {publication && <article className="catalog-panel"><button onClick={() => select("")}>Đóng chi tiết</button><h2><FiGlobe /> {publication.name}</h2>
        <p>{publication.catalogType} · v{publication.version} · {publication.status} · revision {publication.revision}</p>
        <p>Hiệu lực: {date(publication.policy.startsAt)} → {date(publication.policy.expiresAt)}; tối đa {publication.policy.maxPageSize} dòng/request.</p>
        <div className="catalog-toolbar">
          {actions.edit && <button disabled={mutation.isPending} onClick={() => edit({ ...publication, customField: publication.catalogOrchestrator.customField })}>Sửa Draft</button>}
          {rights.manage && <button onClick={() => edit(newCatalogDraft(publication))}>Tạo version mới</button>}
          {actions.validate && <button disabled={mutation.isPending} onClick={() => action("validate")}>Validate</button>}
          {actions.publish && <button disabled={mutation.isPending} onClick={() => action("publish")}>Publish</button>}
          {actions.retire && <button disabled={mutation.isPending} onClick={() => action("retire")}>Retire</button>}
        </div>
        <p>CatalogOrchestrator: {publication.catalogOrchestrator.id}</p>
        <ul>{(publication.pins || []).map((pin) => <li key={pin.planId}>Plan {pin.planId} v{pin.planVersion} · Product v{pin.productVersion} · Process revision {pin.processRevision}</li>)}</ul>
        {publication.endpoint && <div className="catalog-integration"><h3>Tích hợp Partner</h3><code>GET {publication.endpoint}?page=0&amp;size={Math.min(20, publication.policy.maxPageSize)}</code><p>Authorization: Catalog &lt;credential&gt; — credential đã cấp có sẵn tiền tố Catalog. Dùng HTTPS; localhost được phép HTTP để demo.</p><p>Gọi GET /api/external/v1/catalog/session để xác minh credential. Không sử dụng Internal JWT hoặc tài khoản Keycloak quản trị.</p></div>}
        <h3>Partner Access</h3>
        <div className="catalog-table"><table><thead><tr><th>Partner</th><th>Plan scope</th><th>Hết hạn</th><th>Trạng thái credential</th><th>Thao tác</th></tr></thead><tbody>{(publication.grants || []).map((grant) => <tr key={grant.id}><td>{grant.partnerId}</td><td>{grant.planIds.join(", ")}</td><td>{date(grant.expiresAt)}</td><td>{grant.revokedAt ? "REVOKED" : grant.effective ? "ACTIVE" : "INACTIVE"}</td><td>{rights.grant && !grant.revokedAt && <button disabled={mutation.isPending} onClick={() => mutation.mutate(() => api.revoke(publication.id, grant.partnerId, publication.revision))}>Thu hồi</button>}</td></tr>)}</tbody></table>{!publication.grants?.length && <p>Chưa cấp credential. Publish không tự gửi hoặc tạo secret cho Partner.</p>}</div>
        {actions.grant && <GrantAccess key={publication.id} publication={publication} scope={scope} changed={() => client.invalidateQueries({ queryKey: root })} />}
        <p>Catalog reads: {publication.accessCount || 0}; lần cuối: {date(publication.lastAccessAt)}. Request bị từ chối đã xác thực: {publication.deniedCount || 0}.</p>
        <h3>Các version</h3><div className="catalog-toolbar">{(versions.data?.content || []).map((v) => <button key={v.id} onClick={() => select(v.id)}>v{v.version} · {v.status}</button>)}</div>
        <h3>Audit</h3><ol className="catalog-audit">{(publication.audit || []).map((a) => <li key={a.id}><strong>{a.action}</strong> · {a.result} · {date(a.at)}<p>Actor: {a.actor}</p><p>{a.detail}</p></li>)}</ol>
      </article>}
    </>}
  </section>;
}
function Editor({ draft, scope, busy, save, cancel }) {
  const [form, setForm] = useState(draft), [search, searchFor] = useState(""), [page, setPage] = useState(0);
  const options = useQuery({ queryKey: ["catalog-options", scope, form.catalogType], queryFn: () => api.options(form.catalogType), retry: false });
  const plans = useQuery({ queryKey: ["catalog-plans", scope, form.catalogType, search, page], queryFn: () => api.plans(form.catalogType, search, page), retry: false });
  const [starts, setStarts] = useState(localTime(draft.policy.startsAt)), [expires, setExpires] = useState(localTime(draft.policy.expiresAt));
  const [label, setLabel] = useState(draft.customField?.find((f) => f.key === "label")?.value || ""), [description, setDescription] = useState(draft.customField?.find((f) => f.key === "description")?.value || "");
  function field(name, value) { setForm((old) => ({ ...old, [name]: value })); }
  function toggle(plan) { const included = form.selections.some((s) => s.planId === plan.planId); field("selections", included ? form.selections.filter((s) => s.planId !== plan.planId) : [...form.selections, { propositionId: plan.propositionId, planId: plan.planId }]); }
  return <form className="catalog-panel catalog-editor" onSubmit={(e) => {
    e.preventDefault(); save({ ...form, version: Number(form.version), policy: { startsAt: new Date(starts).toISOString(), expiresAt: new Date(expires).toISOString(), maxPageSize: Number(form.policy.maxPageSize) },
      customField: [...(label ? [{ key: "label", value: label }] : []), ...(description ? [{ key: "description", value: description }] : [])] });
  }}><h2>{draft.id ? "Sửa Draft" : "Draft mới"}</h2>
    <label>Tên API<input required maxLength={150} value={form.name} onChange={(e) => field("name", e.target.value)} /></label>
    <label>API key<input required pattern="[a-z][a-z0-9-]{2,59}" maxLength={60} disabled={!!draft.id} value={form.apiKey} onChange={(e) => field("apiKey", e.target.value)} /></label>
    <label>Catalog API<select aria-label="Catalog API" disabled={!!draft.id} value={form.catalogType} onChange={(e) => { field("catalogType", e.target.value); setPage(0); }}><option>PRODUCT</option><option>PRICE</option></select></label>
    <label>API version<input required type="number" min={1} max={10000} disabled={!!draft.id} value={form.version} onChange={(e) => field("version", e.target.value)} /></label>
    <fieldset><legend>Data Scope — chọn đúng phiên bản Plan</legend><label>Tìm Plan<input value={search} onChange={(e) => { searchFor(e.target.value); setPage(0); }} /></label>
      {(plans.data?.content || []).map((plan) => <label className="catalog-check" key={plan.planId}><input type="checkbox" checked={form.selections.some((s) => s.planId === plan.planId)} onChange={() => toggle(plan)} />{plan.propositionName} / {plan.planName} v{plan.planVersion} · Product v{plan.productVersion} {plan.currency || ""}</label>)}
      {plans.isPending && <p role="status">Đang tải Plan hợp lệ…</p>}{plans.data && !plans.data.content.length && <p>Không có Plan đủ điều kiện trong phạm vi.</p>}
      <div className="catalog-toolbar"><button type="button" disabled={!page} onClick={() => setPage(page - 1)}>Plan trước</button><button type="button" disabled={!plans.data?.hasNext} onClick={() => setPage(page + 1)}>Plan sau</button></div>
      <p>Đã chọn {form.selections.length} Plan:</p><ul>{form.selections.map((s) => <li key={s.planId}>{s.planId} <button type="button" onClick={() => field("selections", form.selections.filter((v) => v.planId !== s.planId))}>Bỏ chọn</button></li>)}</ul>
    </fieldset>
    <label>Ecosystem Partner<select aria-label="Ecosystem Partner" required multiple value={form.partnerIds} onChange={(e) => field("partnerIds", Array.from(e.target.selectedOptions, (o) => o.value))}>{(options.data?.partners || []).map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}{form.partnerIds.filter((id) => !options.data?.partners?.some((p) => p.id === id)).map((id) => <option key={id} value={id}>{id} (cần xác minh lại)</option>)}</select></label>
    <label>Bắt đầu (giờ máy)<input required type="datetime-local" value={starts} onChange={(e) => setStarts(e.target.value)} /></label><label>Hết hạn (giờ máy)<input required type="datetime-local" value={expires} min={starts} onChange={(e) => setExpires(e.target.value)} /></label>
    <label>Giới hạn dòng/request<input required type="number" min={1} max={100} value={form.policy.maxPageSize} onChange={(e) => field("policy", { ...form.policy, maxPageSize: e.target.value })} /></label>
    <label>Nhãn Catalog<input maxLength={500} value={label} onChange={(e) => setLabel(e.target.value)} /></label><label>Mô tả Catalog<textarea maxLength={500} value={description} onChange={(e) => setDescription(e.target.value)} /></label>
    {(options.error || plans.error) && <p role="alert">{catalogError(options.error || plans.error)}</p>}
    <div className="catalog-toolbar"><button disabled={busy || !form.selections.length || !form.partnerIds.length}>Save Draft</button><button type="button" onClick={cancel}>Hủy</button></div>
  </form>;
}
function GrantAccess({ publication, scope, changed }) {
  const options = useQuery({ queryKey: ["catalog-grant-options", scope, publication.id], queryFn: () => api.partners(publication.id), retry: false });
  const [partnerId, select] = useState(""), [plans, choose] = useState([]), [expires, setExpires] = useState(localTime(publication.policy.expiresAt));
  const [secret, setSecret] = useState(null), [busy, setBusy] = useState(false), [error, setError] = useState("");
  const partner = options.data?.find((p) => p.partnerId === partnerId);
  async function issue(e) {
    e.preventDefault(); setBusy(true); setError("");
    try {
      // One-time credential stays in component memory only: no query cache, URL, storage or logs.
      const issued = await api.grant(publication.id, { revision: publication.revision, partnerId, planIds: plans, expiresAt: new Date(expires).toISOString() });
      setSecret(issued); // Refresh after dismissal, otherwise revision-key remount would discard the only copy.
    } catch (failure) { setError(catalogError(failure)); } finally { setBusy(false); }
  }
  if (secret) return <section className="catalog-secret"><h3>Credential chỉ hiển thị một lần</h3><p>Lưu vào secret manager của Partner. Cấp lại cho cùng Partner sẽ vô hiệu credential trước.</p><label>Authorization header<textarea aria-label="Authorization header" readOnly autoComplete="off" spellCheck={false} value={secret.credential} /></label><p>Hết hạn: {date(secret.expiresAt)}</p><button onClick={() => { setSecret(null); changed(); }}>Đã lưu — ẩn credential</button></section>;
  return <form className="catalog-editor" onSubmit={issue}><h3><FiKey /> Cấp / xoay credential</h3>
    <label>Partner được phép<select aria-label="Partner được phép" required value={partnerId} onChange={(e) => { select(e.target.value); choose(options.data.find((p) => p.partnerId === e.target.value)?.entries.map((i) => i.planId) || []); }}><option value="">Chọn Partner</option>{(options.data || []).map((p) => <option key={p.partnerId} value={p.partnerId}>{p.partnerName}</option>)}</select></label>
    {(partner?.entries || []).map((item) => <label className="catalog-check" key={item.planId}><input type="checkbox" checked={plans.includes(item.planId)} onChange={() => choose(plans.includes(item.planId) ? plans.filter((id) => id !== item.planId) : [...plans, item.planId])} />{item.name} · Plan v{item.planVersion}</label>)}
    <label>Credential hết hạn<input required type="datetime-local" max={localTime(publication.policy.expiresAt)} value={expires} onChange={(e) => setExpires(e.target.value)} /></label>
    {(options.error || error) && <p role="alert">{error || catalogError(options.error)}</p>}
    <button disabled={busy || !partnerId || !plans.length}>Cấp credential mới</button>
  </form>;
}
function date(value) { return value ? new Date(value).toLocaleString("vi-VN") : "—"; }
