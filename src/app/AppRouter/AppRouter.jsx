import "./AppRouter.css";

import { Navigate, Route, Routes } from "react-router-dom";

import { ROUTES } from "../../constants/routes.js";

import { MainLayout } from "../../layouts/MainLayout/MainLayout.jsx";

import { HomePage } from "../../features/home/pages/HomePage/HomePage.jsx";

import { ModulePage } from "../../features/modules/pages/ModulePage/ModulePage.jsx";

import { TenantOnboardingPage } from "../../features/tenant/pages/TenantOnboardingPage/TenantOnboardingPage.jsx";
import { TenantListPage } from "../../features/tenant/pages/TenantListPage/TenantListPage.jsx";
import { UserListPage } from "../../features/user/pages/UserListPage/UserListPage.jsx";

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
            <Route
              path="users/roles"
              element={
                <ModulePage
                  title="Roles"
                  description="Manage roles and permission groups."
                />
              }
            />

            <Route
              path="users/permissions"
              element={
                <ModulePage
                  title="Permission"
                  description="Manage functional access permissions."
                />
              }
            />
          </Route>

          <Route element={<RequireDataAccessRulesAccess />}>
            <Route
              path="users/data-access-rules"
              element={
                <ModulePage
                  title="Data Access Rules"
                  description="Configure data access policies."
                />
              }
            />
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