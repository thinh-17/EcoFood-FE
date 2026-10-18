import { FiDollarSign, FiShoppingBag, FiCoffee, FiMessageSquare, FiTrendingUp, FiAward, FiList, FiBell } from "react-icons/fi";

// Whitelist: layout từ server chỉ lưu type/config, KHÔNG chứa component code hay API URL tùy ý.
export const widgetRegistry = {
  "kpi.revenue": { title: "Doanh thu hôm nay", icon: FiDollarSign, size: { w: 3, h: 2 }, minW: 2, minH: 2 },
  "kpi.orders": { title: "Số đơn hàng", icon: FiShoppingBag, size: { w: 3, h: 2 }, minW: 2, minH: 2 },
  "kpi.products": { title: "Sản phẩm đang bán", icon: FiCoffee, size: { w: 3, h: 2 }, minW: 2, minH: 2 },
  "kpi.feedback": { title: "Phản hồi chờ xử lý", icon: FiMessageSquare, size: { w: 3, h: 2 }, minW: 2, minH: 2 },
  "chart.revenue": { title: "Doanh thu 7 ngày", icon: FiTrendingUp, size: { w: 8, h: 5 }, minW: 5, minH: 4 },
  "list.products": { title: "Top món bán chạy", icon: FiAward, size: { w: 4, h: 5 }, minW: 3, minH: 4 },
  "list.activities": { title: "Hoạt động mới nhất", icon: FiList, size: { w: 8, h: 4 }, minW: 4, minH: 3 },
  "list.alerts": { title: "Cảnh báo vận hành", icon: FiBell, size: { w: 4, h: 4 }, minW: 3, minH: 3 },
};

const widget = (id, type, x, y, w, h) => ({
  id, type, title: widgetRegistry[type].title,
  layout: { i: id, x, y, w, h,
    minW: widgetRegistry[type].minW, minH: widgetRegistry[type].minH },
  config: {},
});

export function createDefaultDashboard(tenantId) {
  return {
    id: `dashboard-${tenantId}`,
    scopeType: "TENANT", scopeId: tenantId,
    name: "Dashboard tổng quan",
    version: 1,
    revision: 0,
    widgets: [
      widget("revenue", "kpi.revenue", 0, 0, 3, 2),
      widget("orders", "kpi.orders", 3, 0, 3, 2),
      widget("products", "kpi.products", 6, 0, 3, 2),
      widget("feedback", "kpi.feedback", 9, 0, 3, 2),
      widget("trend", "chart.revenue", 0, 2, 8, 5),
      widget("top-products", "list.products", 8, 2, 4, 5),
      widget("activities", "list.activities", 0, 7, 8, 4),
      widget("alerts", "list.alerts", 8, 7, 4, 4),
    ],
  };
}
