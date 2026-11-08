export function formatMoney(amount, currency = "VND") {
  if (amount == null) return "—";
  try {
    return new Intl.NumberFormat("vi-VN", { style: "currency", currency, maximumFractionDigits: 12 }).format(amount);
  } catch {
    return `${amount} ${currency}`;
  }
}

export function formatDate(value) {
  return value ? new Date(value).toLocaleString("vi-VN") : "—";
}

export function transactionError(error, submission = false) {
  const status = error?.response?.status;
  const detail = error?.response?.data?.message;
  if (!status) return submission
    ? "Không nhận được phản hồi. Kiểm tra kết nối; giao dịch có thể đã được tiếp nhận. Tra cứu hoặc gửi lại đúng mã hóa đơn trước khi tạo giao dịch mới."
    : "Không tải được dữ liệu. Kiểm tra kết nối với backend và thử lại.";
  const help = {
    400: "Dữ liệu không hợp lệ.",
    401: "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.",
    403: "Kiểm tra quyền, Data Scope hoặc binding POS của tài khoản.",
    404: "Không tìm thấy hóa đơn trong phạm vi được cấp.",
    409: "Giao dịch trùng hoặc cấu hình Plan/Proposition chưa hoạt động.",
    503: "Provider Sale Orchestrator chưa sẵn sàng. Kiểm tra cấu hình backend.",
  };
  return `HTTP ${status}: ${detail || help[status] || "Không thể xử lý yêu cầu."} ${detail ? help[status] || "" : ""}`.trim();
}

export function buildTransactionFilters(draft) {
  const params = {};
  if (draft.invoiceId.trim()) {
    if (!/^[a-f\d]{24}$/i.test(draft.invoiceId.trim())) throw new Error("Invoice ID cần đủ 24 ký tự hex.");
    params.invoiceId = draft.invoiceId.trim();
  }
  if (draft.invoiceNumber.trim()) {
    if (draft.invoiceNumber.trim().length > 100) throw new Error("Mã hóa đơn tối đa 100 ký tự.");
    params.invoiceNumber = draft.invoiceNumber.trim();
  }
  for (const field of ["from", "to"]) {
    if (draft[field]) {
      const date = new Date(draft[field]);
      if (!Number.isFinite(date.getTime())) throw new Error("Ngày giao dịch không hợp lệ.");
      params[field] = date.toISOString();
    }
  }
  if (params.from && params.to && params.from > params.to) throw new Error("Ngày bắt đầu phải trước hoặc bằng ngày kết thúc.");
  if (draft.status) params.status = draft.status;
  return params;
}
