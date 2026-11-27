import { useNavigate } from "react-router-dom";

import { PageHeader as CorePageHeader } from "../../../components/PageHeader.jsx";
import { ROUTES } from "../../../constants/routes.js";
import { useAuthStore } from "../../auth/store/authStore.js";
import { ProductForm } from "../components/ProductForm.jsx";

export function ProductCreatePage() {
  const navigate = useNavigate();
  const scope = useAuthStore((state) => state.tenantId);
  return <section className="product-page product-surface">
    <CorePageHeader title="Create Product" description="Define your product, calculate costs and submit for review." />
    <ProductForm
      scope={scope}
      onCancel={() => navigate(ROUTES.PRODUCTS)}
      onSaved={(product) => navigate(ROUTES.PRODUCTS, {
        state: { notice: product.status === "PENDING_REVIEW" ? "Product submitted for review." : "Product draft saved." },
      })}
    />
  </section>;
}
