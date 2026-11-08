import { NavLink, Outlet } from "react-router-dom";
import { FiLogOut, FiShoppingBag, FiUser } from "react-icons/fi";
import { useAuthStore } from "../../auth/store/authStore.js";
import { ROUTES } from "../../../constants/routes.js";
import "./CustomerPortalLayout.css";

export function CustomerPortalLayout() {
  const logout = useAuthStore((state) => state.logout);

  return (
    <div className="customer-shell">
      <header className="customer-shell__header">
        <div className="customer-shell__header-inner">
          <NavLink to={ROUTES.CUSTOMER_PROFILE} className="customer-shell__brand">
            EcoFood <span>Customer Portal</span>
          </NavLink>
          <nav className="customer-shell__nav" aria-label="Customer navigation">
            <NavLink to={ROUTES.CUSTOMER_PROFILE} className={({ isActive }) =>
              `customer-shell__link ${isActive ? "customer-shell__link--active" : ""}`}>
              <FiUser aria-hidden="true" /> Hồ sơ
            </NavLink>
            <NavLink to={ROUTES.CUSTOMER_INVOICES} className={({ isActive }) =>
              `customer-shell__link ${isActive ? "customer-shell__link--active" : ""}`}>
              <FiShoppingBag aria-hidden="true" /> Hóa đơn
            </NavLink>
          </nav>
          <button type="button" onClick={() => logout()} className="customer-shell__logout">
            <FiLogOut aria-hidden="true" /> Đăng xuất
          </button>
        </div>
      </header>
      <main className="customer-shell__main"><Outlet /></main>
    </div>
  );
}
