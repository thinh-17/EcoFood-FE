import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { CorePageHeader } from "@thinh-17/fe-core";
import { ROUTES } from "../../../constants/routes.js";
import { useAuthStore } from "../../auth/store/authStore.js";
import { useCurrentRoles } from "../../auth/hooks/useCurrentRoles.js";
import { canManageProducts } from "../lib/product.js";
import { ProductDetail } from "./ProductDetail.jsx";

export function ProductDetailPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const scope = useAuthStore((state) => state.tenantId);
  const roles = useCurrentRoles();
  // Actions taken while viewing (submit/approve/reject/new version/edit) only
  // become visible once back on the list — matches the pre-route behavior,
  // where the notice banner only ever rendered in the list's own JSX.
  const [notice, setNotice] = useState("");
  return <section className="product-page product-surface">
    <CorePageHeader title="Product details" description="Review product definition and version processes." />
    <ProductDetail
      key={id}
      id={id}
      scope={scope}
      canManage={canManageProducts(roles)}
      onClose={() => navigate(ROUTES.PRODUCTS, { state: { notice } })}
      onNotice={setNotice}
    />
  </section>;
}
