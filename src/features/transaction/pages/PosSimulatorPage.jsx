import { useMemo, useRef, useState } from "react";
import { CoreButton, CoreCard, CoreEmptyState, CorePageHeader, CoreSelect } from "@thinh-17/fe-core";
import { useSubmitTransaction } from "../hooks/useTransactions.js";
import { buildPosPayload, calculateCart, localDateTime, newInvoiceNumber } from "../lib/posPayload.js";
import { formatDate, formatMoney, transactionError } from "../lib/transactionFormat.js";
import "../transaction.css";

const EMPTY_PRODUCT = { productCode: "", productName: "", unitPrice: "" };

export function PosSimulatorPage() {
  const [catalog, setCatalog] = useState([]);
  const [product, setProduct] = useState(EMPTY_PRODUCT);
  const [selectedProduct, setSelectedProduct] = useState("");
  const [lines, setLines] = useState([]);
  const [invoiceNumber, setInvoiceNumber] = useState(newInvoiceNumber);
  const [transactionTime, setTransactionTime] = useState(localDateTime);
  const [currency, setCurrency] = useState("VND");
  const [mode, setMode] = useState("valid");
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);
  const [lastPayload, setLastPayload] = useState(null);
  const [lastSuccess, setLastSuccess] = useState(null);
  const busy = useRef(false);
  const submit = useSubmitTransaction();
  const calculation = useMemo(() => {
    try { return { ...calculateCart(lines), error: "" }; }
    catch (error) { return { error: error.message }; }
  }, [lines]);

  function addCatalogProduct(event) {
    event.preventDefault();
    try {
      calculateCart([{ ...product, quantity: "1" }]);
      const clean = { ...product, productCode: product.productCode.trim(), productName: product.productName.trim(), currency };
      if (catalog.some((item) => item.productCode === clean.productCode && item.currency === currency))
        throw new Error("Mã sản phẩm đã có trong danh mục thử của tiền tệ này.");
      setCatalog((old) => [...old, clean]);
      setSelectedProduct(clean.productCode);
      setProduct(EMPTY_PRODUCT);
      setError("");
    } catch (error) { setError(error.message); }
  }

  function addToCart() {
    const item = catalog.find((entry) => entry.productCode === selectedProduct && entry.currency === currency);
    if (!item) return;
    setLines((old) => [...old, { ...item, key: crypto.randomUUID(), quantity: "1" }]);
  }

  function changeLine(key, field, value) {
    setLines((old) => old.map((line) => line.key === key ? { ...line, [field]: value } : line));
  }

  async function send(payload, replay = false) {
    if (busy.current) return;
    busy.current = true;
    setError(""); setResult(null);
    setLastPayload(structuredClone(payload));
    try {
      const response = await submit.mutateAsync(payload);
      setResult({ response, replay });
      setLastSuccess(structuredClone(payload));
    } catch (error) { setError(transactionError(error, true)); }
    finally { busy.current = false; }
  }

  function submitForm(event) {
    event.preventDefault();
    try { send(buildPosPayload({ invoiceNumber, transactionTime, currency, lines }, mode)); }
    catch (error) { setError(error.message); setResult(null); }
  }

  function startNewInvoice() {
    setInvoiceNumber(newInvoiceNumber()); setTransactionTime(localDateTime());
    setResult(null); setError(""); setMode("valid");
  }

  return <div className="eco-module-page transaction-page">
    <CorePageHeader eyebrow="EcoFood / UC-015" title="POS Simulator"
      description="Lập và gửi giao dịch bằng cùng API của POS. Kết quả phản ánh phản hồi thực tế từ backend." />
    <CoreCard>
      <h2>Danh mục sản phẩm thử</h2>
      <p className="transaction-hint">Nhập sản phẩm để chọn cho phiên thử này. Danh mục không được lưu vào hệ thống sản phẩm và sẽ mất khi tải lại trang.</p>
      <form onSubmit={addCatalogProduct} className="transaction-filter">
        <label>Mã sản phẩm<input className="fe-input" required maxLength={100} value={product.productCode}
          onChange={(event) => setProduct((old) => ({ ...old, productCode: event.target.value }))} /></label>
        <label>Tên sản phẩm<input className="fe-input" required maxLength={255} value={product.productName}
          onChange={(event) => setProduct((old) => ({ ...old, productName: event.target.value }))} /></label>
        <label>Đơn giá · {currency}<input className="fe-input" type="number" min="0" step="any" required value={product.unitPrice}
          onChange={(event) => setProduct((old) => ({ ...old, unitPrice: event.target.value }))} /></label>
        <CoreButton type="submit" disabled={submit.isPending}>Thêm vào danh mục thử</CoreButton>
      </form>
    </CoreCard>

    <CoreCard>
      <form onSubmit={submitForm}>
        <fieldset disabled={submit.isPending} className="transaction-fieldset">
          <div className="transaction-toolbar"><h2>Hóa đơn POS</h2>
            <CoreButton variant="secondary" onClick={startNewInvoice}>Tạo mã hóa đơn mới</CoreButton></div>
          <div className="transaction-filter">
            <label>Mã hóa đơn<input className="fe-input" required maxLength={100} value={invoiceNumber}
              onChange={(event) => setInvoiceNumber(event.target.value)} /></label>
            <label>Ngày giao dịch<input className="fe-input" type="datetime-local" required value={transactionTime}
              onChange={(event) => setTransactionTime(event.target.value)} /></label>
            <label>Tiền tệ<input className="fe-input" maxLength={3} required pattern="[A-Z]{3}"
              disabled={lines.length > 0} value={currency} onChange={(event) => {
                setCurrency(event.target.value.toUpperCase()); setSelectedProduct("");
              }} /></label>
          </div>
          <p className="transaction-hint">Tiền tệ phải được provider cho phép. Xóa giỏ trước khi đổi tiền tệ. Thời gian theo giờ địa phương.</p>
          <div className="transaction-toolbar transaction-picker">
            <label>Chọn sản phẩm<CoreSelect value={selectedProduct} placeholder="Chọn từ danh mục thử"
              options={catalog.filter((item) => item.currency === currency).map((item) => ({ value: item.productCode,
                label: `${item.productCode} · ${item.productName} · ${formatMoney(item.unitPrice, currency)}` }))}
              onChange={setSelectedProduct} /></label>
            <CoreButton variant="secondary" disabled={!selectedProduct} onClick={addToCart}>Thêm sản phẩm</CoreButton>
          </div>
          {lines.length === 0 ? <CoreEmptyState title="Chưa có sản phẩm" description="Thêm sản phẩm vào danh mục thử, chọn sản phẩm rồi thêm vào hóa đơn." />
            : <div className="transaction-table-scroll"><table className="transaction-items-table">
              <thead><tr><th>Sản phẩm</th><th>Số lượng</th><th>Đơn giá</th><th>Thành tiền</th><th>Thao tác</th></tr></thead>
              <tbody>{lines.map((line, index) => <tr key={line.key}>
                <td><strong>{line.productName}</strong><small className="transaction-code">{line.productCode}</small></td>
                <td><input className="fe-input" aria-label={`Số lượng dòng ${index + 1}`} type="number" min="0.000001" step="any"
                  required value={line.quantity} onChange={(event) => changeLine(line.key, "quantity", event.target.value)} /></td>
                <td><input className="fe-input" aria-label={`Đơn giá dòng ${index + 1}`} type="number" min="0" step="any"
                  required value={line.unitPrice} onChange={(event) => changeLine(line.key, "unitPrice", event.target.value)} /></td>
                <td>{calculation.items ? formatMoney(calculation.items[index].amount, currency) : "—"}</td>
                <td><CoreButton variant="secondary" size="sm" onClick={() => setLines((old) => old.filter((entry) => entry.key !== line.key))}>Xóa</CoreButton></td>
              </tr>)}</tbody></table></div>}
          {calculation.error && <p role="alert" className="transaction-error">{calculation.error}</p>}
          <div className="transaction-toolbar"><strong>Tổng tiền: {calculation.error ? "—" : formatMoney(calculation.totalAmount, currency)}</strong>
            <span>{lines.length} dòng sản phẩm</span></div>
          <label className="transaction-test-mode">Chế độ kiểm thử<CoreSelect value={mode} onChange={setMode}
            options={[{ value: "valid", label: "Giao dịch hợp lệ" }, { value: "wrong-total", label: "Dữ liệu không hợp lệ: sai tổng tiền" },
              { value: "zero-quantity", label: "Dữ liệu không hợp lệ: số lượng bằng 0" }]} /></label>
          {mode !== "valid" && <p className="transaction-hint">Chế độ này chủ động gửi payload sai đến API để kiểm thử phản hồi 400. Chỉ dùng với dữ liệu kiểm thử.</p>}
          <div className="transaction-actions">
            <CoreButton type="submit" loading={submit.isPending} disabled={!lines.length || Boolean(calculation.error)}>Gửi giao dịch</CoreButton>
            <CoreButton variant="secondary" disabled={!lastSuccess} onClick={() => send(structuredClone(lastSuccess), true)}>Gửi trùng giao dịch đã thành công</CoreButton>
            <CoreButton variant="secondary" disabled={!lastPayload} onClick={() => send(structuredClone(lastPayload), true)}>Gửi lại payload gần nhất</CoreButton>
          </div>
        </fieldset>
      </form>
    </CoreCard>

    {error && <div className="transaction-error" role="alert">{error}</div>}
    {result && <CoreCard><div role="status" className="transaction-success">
      <h2>Đã tiếp nhận giao dịch · HTTP 201</h2>
      <p>Mã hóa đơn: <strong>{result.response.invoiceNumber}</strong></p>
      <p>Invoice ID: {result.response.id}</p><p>Trạng thái: {result.response.status}</p>
      <p>Tiếp nhận lúc: {formatDate(result.response.receivedAt)}</p>
      {result.replay && <p>Payload gửi lại được backend tiếp nhận thành công.</p>}
    </div></CoreCard>}
    {lastPayload && <CoreCard><details><summary>Payload gần nhất đã gửi</summary>
      <pre className="transaction-payload">{JSON.stringify(lastPayload, null, 2)}</pre></details></CoreCard>}
  </div>;
}
