export const complaintStatuses = ["SUBMITTED", "IN_PROGRESS", "WAITING_REPORTER", "RESOLVED", "CLOSED"];
export function complaintAccess(claims = {}) {
  const roles = claims.roles || [], permissions = claims.permissions || [];
  const admin = roles.includes("TENANT_ADMIN") || roles.includes("ECO_ADMIN");
  return { read: admin && permissions.includes("COMPLAINT_READ"), manage: admin && permissions.includes("COMPLAINT_READ") && permissions.includes("COMPLAINT_MANAGE"), assign: admin && permissions.includes("COMPLAINT_ASSIGN") };
}
export function complaintTransitions(status) {
  return { IN_PROGRESS: ["WAITING_REPORTER", "RESOLVED"], WAITING_REPORTER: ["IN_PROGRESS"], RESOLVED: ["CLOSED"] }[status] || [];
}
export function complaintError(error) {
  const status = error?.response?.status;
  if (status === 401) return "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.";
  if (status === 403) return "Bạn không có quyền truy cập trong phạm vi hiện tại.";
  if (status === 404) return "Complaint hoặc Invoice không khả dụng trong phạm vi của bạn.";
  if (status === 409) return "Dữ liệu đã thay đổi hoặc thao tác không hợp lệ. Hãy tải lại trước khi tiếp tục.";
  return error?.response?.data?.message || "Không thể xử lý yêu cầu. Vui lòng thử lại.";
}
