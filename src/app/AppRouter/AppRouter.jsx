import "./AppRouter.css";

import { Navigate, Route, Routes } from "react-router-dom";

import { ROUTES } from "../../constants/routes.js";

import { MainLayout } from "../../layouts/MainLayout/MainLayout.jsx";

import { HomePage } from "../../features/home/pages/HomePage/HomePage.jsx";

import { ModulePage } from "../../features/modules/pages/ModulePage/ModulePage.jsx";
import { ProductListPage } from "../../features/product/pages/ProductListPage.jsx";
import { ProductCreatePage } from "../../features/product/pages/ProductCreatePage.jsx";
import { ProductDetailPage } from "../../features/product/pages/ProductDetailPage.jsx";
import { PropositionPage } from "../../features/proposition/pages/PropositionPage.jsx";

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

export function AppRouter() {
  return (
    <Routes>
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
