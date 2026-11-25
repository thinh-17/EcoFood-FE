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
  if (definition.scopeId !== tenantId) throw new Error("Invalid tenant");
  const existing = await getMockDashboardDefinition(tenantId);
  if (definition.revision !== existing.revision) throw new Error("The dashboard was changed in another session. Please refresh.");
  const saved = { ...definition, revision: existing.revision + 1, updatedAt: new Date().toISOString() };
  localStorage.setItem(key(tenantId), JSON.stringify(saved));
  return saved;
}

const data = {
  "tenant-001": {
    revenue7Days: [
      { day: "Mon", amount: 8.2 }, { day: "Tue", amount: 10.6 }, { day: "Wed", amount: 9.5 },
      { day: "Thu", amount: 15.8 }, { day: "Fri", amount: 13.1 }, { day: "Sat", amount: 20.4 }, { day: "Sun", amount: 18.5 },
    ],
    topProducts: [
      { name: "Milk coffee", quantity: 95 }, { name: "Peach tea", quantity: 73 },
      { name: "Pork banh mi", quantity: 59 }, { name: "Matcha latte", quantity: 41 },
    ],
    alerts: ["2 ingredients need restocking", "3 customer feedback items pending"],
  },
  "tenant-002": {
    revenue7Days: [
      { day: "Mon", amount: 4.2 }, { day: "Tue", amount: 5.1 }, { day: "Wed", amount: 6.7 },
      { day: "Thu", amount: 5.3 }, { day: "Fri", amount: 7.2 }, { day: "Sat", amount: 9.1 }, { day: "Sun", amount: 8.3 },
    ],
    topProducts: [
      { name: "Peach tea", quantity: 66 }, { name: "White coffee", quantity: 53 },
      { name: "Black coffee", quantity: 47 }, { name: "Pastries", quantity: 30 },
    ],
    alerts: ["1 customer feedback item pending"],
  },
};
export async function getMockDashboardWidgetData(tenantId) {
  await wait();
  return data[tenantId] ?? data["tenant-001"];
}
