import { PRODUCT_STATUSES } from "../lib/product.js";

export function ProductStatus({ status }) {
  return <span className={`product-status product-status--${status?.toLowerCase()}`}><span aria-hidden="true" />{PRODUCT_STATUSES[status] ?? status}</span>;
}
