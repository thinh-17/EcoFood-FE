import { PRODUCT_STATUSES } from "../lib/product.js";
import { StatusBadge } from "../../../components/StatusBadge.jsx";

export function ProductStatus({ status }) {
  return <StatusBadge status={status} label={PRODUCT_STATUSES[status] ?? status} />;
}
