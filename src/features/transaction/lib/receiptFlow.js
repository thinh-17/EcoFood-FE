export function validateReceiptUrl(receiptUrl) {
  let parsed;
  try { parsed = new URL(receiptUrl); } catch { throw new Error("Backend trả về Receipt URL không hợp lệ."); }
  if (!["https:", "http:"].includes(parsed.protocol) || parsed.username || parsed.password || parsed.hash
      || [...parsed.searchParams.keys()].length !== 1 || !/^[A-Za-z0-9_-]{43}$/.test(parsed.searchParams.get("token") || "")) {
    throw new Error("Receipt URL phải là HTTP/HTTPS và chỉ chứa receipt token hợp lệ.");
  }
  return parsed;
}

export function validateReceiptAccess(access, invoiceId) {
  if (!access || access.invoiceId !== invoiceId || !access.receiptId
      || !Number.isFinite(Date.parse(access.expiresAt))) {
    throw new Error("Receipt response không khớp Invoice hoặc thiếu thời hạn.");
  }
  validateReceiptUrl(access.receiptUrl);
  return access;
}

/** Event-driven session: rendering/subscribing never starts a request. No POST retries here. */
export function createReceiptSession({ response, payload, replay = false }, { issue, read, requestId = crypto.randomUUID() }) {
  const payment = structuredClone({ response, payload, replay });
  let snapshot = { status: "idle", receipt: null, detail: null, error: null, stage: "issue" };
  let inFlight = null;
  const listeners = new Set();
  function publish(update) {
    snapshot = { ...snapshot, ...update };
    listeners.forEach((listener) => listener());
  }
  function ensure() {
    if (inFlight) return inFlight;
    if (snapshot.status === "success") return Promise.resolve(snapshot);
    // Assign before notifying listeners: rapid retries share exactly one request.
    inFlight = Promise.resolve().then(async () => {
      try {
        if (!snapshot.receipt) {
          const access = validateReceiptAccess(await issue(payment.response.id, requestId), payment.response.id);
          publish({ receipt: structuredClone(access), stage: "details" });
        }
        const detail = await read(snapshot.receipt.receiptUrl);
        if (!detail || detail.invoiceNumber !== payment.response.invoiceNumber || !Array.isArray(detail.items)
            || !detail.distributionPartner || detail.currency !== payment.payload.currency
            || Number(detail.totalAmount) !== Number(payment.payload.totalAmount)) {
          throw new Error("Nội dung Receipt không khớp giao dịch đã tiếp nhận.");
        }
        publish({ status: "success", detail: structuredClone(detail), error: null });
      } catch (error) {
        publish({ status: "error", error });
      }
      return snapshot;
    }).finally(() => { inFlight = null; });
    publish({ status: "loading", error: null, stage: snapshot.receipt ? "details" : "issue" });
    return inFlight;
  }
  return {
    payment, requestId, ensure,
    getSnapshot: () => snapshot,
    subscribe(listener) { listeners.add(listener); return () => listeners.delete(listener); },
  };
}

export function receiptError(error) {
  const status = error?.response?.status;
  if (!status) return error?.message || "Không nhận được phản hồi từ Receipt API. Có thể thử lại với cùng requestId.";
  const message = error.response.data?.message || "Receipt API không xử lý được yêu cầu.";
  return `HTTP ${status}: ${message}`;
}
