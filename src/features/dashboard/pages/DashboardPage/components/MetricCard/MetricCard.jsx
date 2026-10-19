import "./MetricCard.css";
import { FiArrowUpRight } from "react-icons/fi";

export function MetricCard({ label, value, icon: Icon, change, suffix }) {
  return (
    <article className="metric-card">
      <div className="metric-top"><span>{label}</span><span className="metric-icon"><Icon size={19} /></span></div>
      <div className="metric-value">{value}{suffix && <small>{suffix}</small>}</div>
      {change !== undefined && <span className="metric-trend"><FiArrowUpRight size={14} /> {change}% so với hôm qua</span>}
    </article>
  );
}
