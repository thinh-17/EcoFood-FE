import "./AppRouter.css";
import { lazy, Suspense } from "react";

import { Navigate, Route, Routes, useLocation } from "react-router-dom";

import { ROUTES } from "../../constants/routes.js";

import { MainLayout } from "../../layouts/MainLayout/MainLayout.jsx";

import { HomePage } from "../../features/home/pages/HomePage/HomePage.jsx";

import { ModulePage } from "../../features/modules/pages/ModulePage/ModulePage.jsx";
import { ProductListPage } from "../../features/product/pages/ProductListPage.jsx";
import { PropositionPage } from "../../features/proposition/pages/PropositionPage.jsx";
import { NotificationPage } from "../../features/notification/NotificationPage.jsx";

import { TenantOnboardingPage } from "../../features/tenant/pages/TenantOnboardingPage/TenantOnboardingPage.jsx";
import { TenantListPage } from "../../features/tenant/pages/TenantListPage/TenantListPage.jsx";
import { UserListPage } from "../../features/user/pages/UserListPage/UserListPage.jsx";
import { RoleListPage } from "../../features/role/pages/RoleListPage/RoleListPage.jsx";
import { PermissionListPage } from "../../features/permission/pages/PermissionListPage/PermissionListPage.jsx";
import { DataAccessRuleListPage } from "../../features/dataAccessRules/pages/DataAccessRuleListPage/DataAccessRuleListPage.jsx";
import { DataAccessRuleDetailPage } from "../../features/dataAccessRules/pages/DataAccessRuleDetailPage/DataAccessRuleDetailPage.jsx";

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
        <Route index element={<HomePage />} />
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

          <Route element={<RequireTenantOnboardingAccess />}>
            <Route
              path="partner/tenants/onboarding"
              element={<TenantOnboardingPage />}
            />
          </Route>
        </Route>

        <Route
          path="manager"
          element={<Suspense fallback={<p role="status">Đang tải Dashboard…</p>}><BusinessDashboardPage /></Suspense>}
        />

        <Route
          path="product-library"
          element={<Navigate to={ROUTES.PRODUCTS} replace />}
        />
        <Route path="product-library/products" element={<ProductListPage />} />
        <Route path="product-library/propositions" element={<PropositionPage />} />

        <Route element={<RequireUsersAccess />}>
          <Route path="users" element={<UserListPage />} />

          <Route element={<RequireRolesAndPermissionsAccess />}>
            <Route path="users/roles" element={<RoleListPage />} />

            <Route path="users/permissions" element={<PermissionListPage />} />
          </Route>

          <Route element={<RequireDataAccessRulesAccess />}>
            <Route path="users/data-access-rules" element={<DataAccessRuleListPage />} />
            <Route path="users/data-access-rules/new" element={<DataAccessRuleDetailPage />} />
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
