import "./DashboardWidgets.css";
import { FiArrowUpRight, FiAlertCircle, FiCheckCircle, FiCoffee } from "react-icons/fi";
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip } from "recharts";
import { widgetRegistry } from "../../../../config/widgetRegistry.js";

const money = (value) => new Intl.NumberFormat("vi-VN").format(value || 0) + " ₫";
const KPI = {
  "kpi.revenue": { field: "revenueToday", format: money, percent: "revenueChangePercent" },
  "kpi.orders": { field: "ordersToday", percent: "orderChangePercent" },
  "kpi.products": { field: "productsActive" },
  "kpi.feedback": { field: "complaintsPending" },
};

function Content({ widget, summary, activities, data }) {
  if (KPI[widget.type]) {
    const kpi = KPI[widget.type];
    const Icon = widgetRegistry[widget.type].icon;
    const value = summary?.[kpi.field];
    return <div className="wb-kpi"><div className="wb-kpi-icon"><Icon size={21} /></div>
      <strong>{value == null ? "—" : kpi.format ? kpi.format(value) : value}</strong>
      {kpi.percent && summary?.[kpi.percent] != null && <small><FiArrowUpRight /> {summary[kpi.percent]}% so với kỳ trước</small>}
    </div>;
  }
  if (widget.type === "chart.revenue") return (
    <div className="wb-chart"><div className="wb-caption">Đơn vị: triệu đồng · Dữ liệu minh họa</div>
      <ResponsiveContainer width="100%" height="90%" minHeight={100}>
        <AreaChart data={data?.revenue7Days ?? []} margin={{ top: 8, right: 8, bottom: 0, left: -24 }}>
          <CartesianGrid stroke="#e9edf4" vertical={false} />
          <XAxis dataKey="day" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
          <Tooltip formatter={(v) => [`${v} triệu`, "Doanh thu"]} />
          <Area type="monotone" dataKey="amount" stroke="#087f6e" fill="#e9f3ee" strokeWidth={2.5} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
  if (widget.type === "list.products") {
    const products = data?.topProducts ?? [];
    const max = Math.max(1, ...products.map((p) => p.quantity));
    return <div className="wb-product-list">{products.map((p, index) => <div className="wb-product-row" key={p.name}>
      <span>{index + 1}. {p.name}</span><b>{p.quantity}</b>
      <span className="wb-progress"><i style={{ width: `${100 * p.quantity / max}%` }} /></span>
    </div>)}</div>;
  }
  if (widget.type === "list.activities") return <ul className="wb-feed">{(activities ?? []).slice(0, 5).map((a) =>
    <li key={a.id}><FiCheckCircle /><span>{a.title}<small>{a.detail}</small></span></li>)}</ul>;
  if (widget.type === "list.alerts") return <ul className="wb-alert-list">{(data?.alerts ?? []).map((a) =>
    <li key={a}><FiAlertCircle />{a}</li>)}{!data?.alerts?.length && <li><FiCoffee /> Không có cảnh báo</li>}</ul>;
  return <div className="wb-unsupported">Widget chưa được hỗ trợ.</div>;
}

export function DashboardWidget({ widget, editable, onRemove, summary, activities, data }) {
  if (!widgetRegistry[widget.type]) return null;
  return <div className="wb-widget">
    <div className="wb-widget-heading">
      <div className={editable ? "wb-widget-handle" : "wb-widget-heading-text"} title={editable ? "Giữ để kéo thả" : undefined}>
        {editable && <span className="wb-grip" aria-hidden="true">⠿</span>}
        <strong>{widget.title}</strong>
      </div>
      {editable && <button type="button" className="wb-remove" aria-label={`Xóa ${widget.title}`} onClick={() => onRemove(widget.id)}>×</button>}
    </div>
    <div className="wb-widget-body"><Content widget={widget} summary={summary} activities={activities} data={data} /></div>
  </div>;
}
