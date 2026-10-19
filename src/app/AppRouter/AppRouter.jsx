import "./AppRouter.css";

import { Navigate, Route, Routes } from "react-router-dom";

import { ROUTES } from "../../constants/routes.js";

import { MainLayout } from "../../layouts/MainLayout/MainLayout.jsx";

import { HomePage } from "../../features/home/pages/HomePage/HomePage.jsx";

import { ModulePage } from "../../features/modules/pages/ModulePage/ModulePage.jsx";

import { NotFoundPage } from "../../pages/NotFoundPage/NotFoundPage.jsx";

import { RequireAuth } from "../../features/auth/components/RequireAuth.jsx";
import { CallbackPage } from "../../features/auth/pages/CallbackPage.jsx";

export function AppRouter() {
  return (
    <Routes>
      <Route path="/callback" element={<CallbackPage />} />

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
              description="Quản lý thông tin tài khoản và hồ sơ người dùng."
            />
          }
        />

        <Route
          path="partner"
          element={
            <Navigate
              to={ROUTES.PARTNER_ONBOARDING}
              replace
            />
          }
        />

        <Route
          path="partner/onboarding"
          element={
            <ModulePage
              title="Partner Onboarding"
              description="Tiếp nhận và quản lý quy trình đăng ký đối tác."
            />
          }
        />

        <Route
          path="partner/tenants"
          element={
            <ModulePage
              title="Tenant"
              description="Quản lý danh sách tenant trong hệ sinh thái."
            />
          }
        />

        <Route
          path="manager"
          element={
            <ModulePage
              title="Manager"
              description="Quản lý hoạt động và theo dõi vận hành."
            />
          }
        />

        <Route
          path="product-library"
          element={
            <ModulePage
              title="Product Library"
              description="Quản lý thư viện sản phẩm và danh mục."
            />
          }
        />

        <Route
          path="users"
          element={
            <ModulePage
              title="Users"
              description="Quản lý danh sách người dùng của hệ thống."
            />
          }
        />

        <Route
          path="users/roles"
          element={
            <ModulePage
              title="Roles"
              description="Quản lý vai trò và nhóm quyền."
            />
          }
        />

        <Route
          path="users/permissions"
          element={
            <ModulePage
              title="Permission"
              description="Quản lý các quyền truy cập chức năng."
            />
          }
        />

        <Route
          path="users/data-access-rules"
          element={
            <ModulePage
              title="Data Access Rules"
              description="Cấu hình chính sách truy cập dữ liệu."
            />
          }
        />

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

      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}