import { RequireManager, InvoiceDashboardPage, CustomerDashboardPage } from "../../features/dashboard/pages/ManagerDashboardPages.jsx";
import "./AppRouter.css";
import { lazy, Suspense } from "react";

import { Navigate, Route, Routes, useLocation } from "react-router-dom";

import { ROUTES } from "../../constants/routes.js";

import { MainLayout } from "../../layouts/MainLayout/MainLayout.jsx";

import { HomePage } from "../../features/home/pages/HomePage/HomePage.jsx";
import { useAuthStore } from "../../features/auth/store/authStore.js";
import { decodeJwt } from "../../features/auth/lib/jwt.js";

import { ModulePage } from "../../features/modules/pages/ModulePage/ModulePage.jsx";
import { ProductListPage } from "../../features/product/pages/ProductListPage.jsx";
import { ProductCreatePage } from "../../features/product/pages/ProductCreatePage.jsx";
import { ProductDetailPage } from "../../features/product/pages/ProductDetailPage.jsx";
import { PropositionPage } from "../../features/proposition/pages/PropositionPage.jsx";
import { NotificationPage } from "../../features/notification/NotificationPage.jsx";

import { TenantOnboardingPage } from "../../features/tenant/pages/TenantOnboardingPage/TenantOnboardingPage.jsx";
import { TenantListPage } from "../../features/tenant/pages/TenantListPage/TenantListPage.jsx";
import { TenantDetailPage } from "../../features/tenant/pages/TenantListPage/TenantDetailPage.jsx";
import { UserListPage } from "../../features/user/pages/UserListPage/UserListPage.jsx";
import { UserDetailPage } from "../../features/user/pages/UserListPage/UserDetailPage.jsx";
import { RoleListPage } from "../../features/role/pages/RoleListPage/RoleListPage.jsx";
import { RoleDetailPage } from "../../features/role/pages/RoleListPage/RoleDetailPage.jsx";
import { PermissionListPage } from "../../features/permission/pages/PermissionListPage/PermissionListPage.jsx";
import { PermissionDetailPage } from "../../features/permission/pages/PermissionListPage/PermissionDetailPage.jsx";
import { DataAccessRuleListPage } from "../../features/dataAccessRules/pages/DataAccessRuleListPage/DataAccessRuleListPage.jsx";
import { DataAccessRuleDetailPage } from "../../features/dataAccessRules/pages/DataAccessRuleDetailPage/DataAccessRuleDetailPage.jsx";
import { DataAccessRuleEditPage } from "../../features/dataAccessRules/pages/DataAccessRuleListPage/DataAccessRuleEditPage.jsx";

import { RequireAuth } from "../../features/auth/components/RequireAuth.jsx";
import { RequirePartnerAccess } from "../../features/auth/components/RequirePartnerAccess.jsx";
import { RequireTenantOnboardingAccess } from "../../features/auth/components/RequireTenantOnboardingAccess.jsx";
import { RequireDataAccessRulesAccess } from "../../features/auth/components/RequireDataAccessRulesAccess.jsx";
import { RequireRolesAndPermissionsAccess } from "../../features/auth/components/RequireRolesAndPermissionsAccess.jsx";
import { RequireUsersAccess } from "../../features/auth/components/RequireUsersAccess.jsx";
import { CallbackPage } from "../../features/auth/pages/CallbackPage.jsx";
import { AuthHandoffPage } from "../../features/auth/pages/AuthHandoffPage.jsx";
import { CustomerLoginPage, CustomerCallbackPage, CustomerPortalPage, ReceiptPage } from "../../features/customer/CustomerPages.jsx";
import { CustomerCarePage, ComplaintManagementPage } from "../../features/complaint/ComplaintPage.jsx";
import { CatalogPage } from "../../features/catalog/CatalogPage.jsx";
import { AuditLogPage } from "../../features/audit/pages/AuditLogPage.jsx";

const BusinessDashboardPage = lazy(() => import("../../features/dashboard/pages/BusinessDashboardPage.jsx")
  .then((module) => ({ default: module.BusinessDashboardPage })));

/** A Customer who ends up on the staff shell's "/" (same internalAccessToken as everyone else) belongs on their own portal, not the staff Home. */
function HomeRoute() {
  const token = useAuthStore((s) => s.internalAccessToken);
  let roles = [];
  try {
    roles = decodeJwt(token)?.roles || [];
  } catch {
    /* Malformed/missing token — treat as no roles, fall through to Home. */
  }
  return roles.includes("CUSTOMER") ? <Navigate to="/customer" replace /> : <HomePage />;
}

export function AppRouter() {
  const location = useLocation();
  return (
    <Routes>
      <Route path="receipt" element={<ReceiptPage />} />
      <Route path="customer/login" element={<CustomerLoginPage />} />
      <Route path="customer/callback" element={<CustomerCallbackPage />} />
      <Route path="customer" element={<CustomerPortalPage />} />
      <Route path="customer/complaints" element={<CustomerCarePage />} />
      <Route path="customer/invoices/:invoiceId" element={<CustomerPortalPage />} />
      <Route path="/callback" element={<CallbackPage />} />
      <Route path="/auth-handoff" element={<AuthHandoffPage />} />

      <Route
        element={
          <RequireAuth>
            <MainLayout />
          </RequireAuth>
        }
      >
        <Route index element={<HomeRoute />} />
        <Route path="notifications" element={<NotificationPage />} />
        <Route path="audit-log" element={<AuditLogPage />} />
        <Route path="complaints" element={<ComplaintManagementPage />} />
        <Route path="catalog-publications" element={<CatalogPage />} />

        <Route
          path="account"
          element={
            <ModulePage
              title="Account"
              description="Manage account information and user profile."
            />
          }
        />

        <Route element={<RequirePartnerAccess />}>
          <Route
            path="partner"
            element={
              <Navigate
                to={ROUTES.TENANT}
                replace
              />
            }
          />

          <Route path="partner/tenants" element={<TenantListPage />} />
          <Route path="partner/tenants/:id" element={<TenantDetailPage />} />

          <Route element={<RequireTenantOnboardingAccess />}>
            <Route
              path="partner/tenants/onboarding"
              element={<TenantOnboardingPage />}
            />
          </Route>
        </Route>

        <Route element={<RequireManager />}>
          <Route path="manager" element={<Navigate to="/manager/business" replace />} />
          <Route path="manager/business" element={<Suspense fallback={<p>Loading…</p>}><BusinessDashboardPage /></Suspense>} />
          <Route path="manager/invoices" element={<InvoiceDashboardPage />} />
          <Route path="manager/customers" element={<CustomerDashboardPage />} />
        </Route>

        <Route
          path="product-library"
          element={<Navigate to={ROUTES.PRODUCTS} replace />}
        />
        <Route path="product-library/products" element={<ProductListPage />} />
        <Route path="product-library/products/new" element={<ProductCreatePage />} />
        <Route path="product-library/products/:id" element={<ProductDetailPage />} />
        <Route path="product-library/propositions" element={<PropositionPage />} />

        <Route element={<RequireUsersAccess />}>
          <Route path="users" element={<UserListPage />} />
          <Route path="users/:id" element={<UserDetailPage />} />

          <Route element={<RequireRolesAndPermissionsAccess />}>
            <Route path="users/roles" element={<RoleListPage />} />
            <Route path="users/roles/:id" element={<RoleDetailPage />} />

            <Route path="users/permissions" element={<PermissionListPage />} />
            <Route path="users/permissions/:id" element={<PermissionDetailPage />} />
          </Route>

          <Route element={<RequireDataAccessRulesAccess />}>
            <Route path="users/data-access-rules" element={<DataAccessRuleListPage />} />
            <Route path="users/data-access-rules/new" element={<DataAccessRuleDetailPage />} />
            <Route path="users/data-access-rules/:id" element={<DataAccessRuleEditPage />} />
          </Route>
        </Route>

        <Route
          path="dashboard"
          element={<Navigate to={{ pathname: ROUTES.MANAGER, search: location.search, hash: location.hash }} replace />}
        />
      </Route>

      {/*
        A sub-tenant's own "domain" is its master's domain plus a path
        suffix (e.g. master-domain/ecosystem3) — purely a backend identity
        string for tenant resolution (see TenantOnboardingPage's
        buildDomainUrl), not a real distinct page in this SPA. Any unmatched
        path — including that suffix — lands back on the home route rather
        than a dead-end 404.
      */}
      <Route path="*" element={<Navigate to={ROUTES.HOME} replace />} />
    </Routes>
  );
}
