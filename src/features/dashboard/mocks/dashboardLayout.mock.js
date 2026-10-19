import { createDefaultDashboard } from "../config/widgetRegistry.js";

const wait = (ms = 140) => new Promise((resolve) => setTimeout(resolve, ms));
const key = (tenantId) => `fnb-dashboard-layout-v1:${tenantId}`;

// localStorage chỉ dùng để mô phỏng API. Không phải bảo mật hay database thực.
export async function getMockDashboardDefinition(tenantId) {
  await wait();
  const saved = localStorage.getItem(key(tenantId));
  if (!saved) return createDefaultDashboard(tenantId);
  try { return JSON.parse(saved); }
  catch { return createDefaultDashboard(tenantId); }
}

export async function saveMockDashboardDefinition(tenantId, definition) {
  await wait();
  if (definition.scopeId !== tenantId) throw new Error("Tenant không hợp lệ");
  const existing = await getMockDashboardDefinition(tenantId);
  if (definition.revision !== existing.revision) throw new Error("Dashboard đã thay đổi ở phiên khác. Hãy tải lại.");
  const saved = { ...definition, revision: existing.revision + 1, updatedAt: new Date().toISOString() };
  localStorage.setItem(key(tenantId), JSON.stringify(saved));
  return saved;
}

const data = {
  "tenant-001": {
    revenue7Days: [
      { day: "T2", amount: 8.2 }, { day: "T3", amount: 10.6 }, { day: "T4", amount: 9.5 },
      { day: "T5", amount: 15.8 }, { day: "T6", amount: 13.1 }, { day: "T7", amount: 20.4 }, { day: "CN", amount: 18.5 },
    ],
    topProducts: [
      { name: "Cà phê sữa", quantity: 95 }, { name: "Trà đào", quantity: 73 },
      { name: "Bánh mì thịt", quantity: 59 }, { name: "Matcha latte", quantity: 41 },
    ],
    alerts: ["2 nguyên liệu cần nhập thêm", "3 phản hồi khách hàng đang chờ"],
  },
  "tenant-002": {
    revenue7Days: [
      { day: "T2", amount: 4.2 }, { day: "T3", amount: 5.1 }, { day: "T4", amount: 6.7 },
      { day: "T5", amount: 5.3 }, { day: "T6", amount: 7.2 }, { day: "T7", amount: 9.1 }, { day: "CN", amount: 8.3 },
    ],
    topProducts: [
      { name: "Trà đào", quantity: 66 }, { name: "Bạc xỉu", quantity: 53 },
      { name: "Cà phê đen", quantity: 47 }, { name: "Bánh ngọt", quantity: 30 },
    ],
    alerts: ["1 phản hồi khách hàng đang chờ"],
  },
};
export async function getMockDashboardWidgetData(tenantId) {
  await wait();
  return data[tenantId] ?? data["tenant-001"];
}
