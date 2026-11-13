import "./AppRouter.css";

import { Navigate, Route, Routes } from "react-router-dom";

import { ROUTES } from "../../constants/routes.js";

import { MainLayout } from "../../layouts/MainLayout/MainLayout.jsx";
import { GuestReceiptPage } from "../../features/receipt/pages/GuestReceiptPage.jsx";
import { RequireTransactionAccess } from "../../features/transaction/components/RequireTransactionAccess.jsx";
import { TransactionManagementPage } from "../../features/transaction/pages/TransactionManagementPage.jsx";
import { PosSimulatorPage } from "../../features/transaction/pages/PosSimulatorPage.jsx";
import { CustomerPortalLayout } from "../../features/customer/layouts/CustomerPortalLayout.jsx";
import { CustomerProfilePage } from "../../features/customer/pages/CustomerProfilePage/CustomerProfilePage.jsx";
import { CustomerInvoicePage } from "../../features/customer/pages/CustomerInvoicePage/CustomerInvoicePage.jsx";
import { CustomerInvoiceDetailPage } from "../../features/customer/pages/CustomerInvoiceDetailPage/CustomerInvoiceDetailPage.jsx";

import { HomePage } from "../../features/home/pages/HomePage/HomePage.jsx";

import { ModulePage } from "../../features/modules/pages/ModulePage/ModulePage.jsx";

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

export function AppRouter() {
  return (
    <Routes>
      <Route path={ROUTES.GUEST_RECEIPT} element={<GuestReceiptPage />} />
      <Route path="/callback" element={<CallbackPage />} />
      <Route path="/auth-handoff" element={<AuthHandoffPage />} />

      {/* Customer portal has a separate layout from the admin/tenant console. */}
      <Route element={<RequireAuth><CustomerPortalLayout /></RequireAuth>}>
        <Route path="customer" element={<Navigate to={ROUTES.CUSTOMER_PROFILE} replace />} />
        <Route path="customer/profile" element={<CustomerProfilePage />} />
        <Route path="customer/invoices" element={<CustomerInvoicePage />} />
        <Route path="customer/invoices/:invoiceId" element={<CustomerInvoiceDetailPage />} />
      </Route>

      <Route
        element={
          <RequireAuth>
            <MainLayout />
          </RequireAuth>
        }
      >
        <Route index element={<HomePage />} />

        <Route element={<RequireTransactionAccess />}>
          <Route path="transactions" element={<TransactionManagementPage />} />
        </Route>
        <Route element={<RequireTransactionAccess submit />}>
          <Route path="pos-simulator" element={<PosSimulatorPage />} />
        </Route>

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
          element={
            <ModulePage
              title="Manager"
              description="Manage operations and monitor activity."
            />
          }
        />

        <Route
          path="product-library"
          element={
            <ModulePage
              title="Product Library"
              description="Manage the product library and catalog."
            />
          }
        />

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
          element={
            <Navigate
              to={ROUTES.MANAGER}
              replace
            />
          }
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
