import {
  Route,
  Routes,
} from 'react-router';
import { AppButton } from "@thinh-17/fe-core";

export function AppRouter() {
  return (
    <Routes>
      <Route
        path="/"
        element={
          <div className="flex flex-col min-h-screen items-center justify-center bg-slate-100">
            <h1 className="text-3xl font-bold text-blue-600">
              F&B Multi-Tenant Platform
            </h1>
            <AppButton
              onClick={() => {
                console.log("Called from main app");
              }}
            >
              Test FE-core
            </AppButton>
          </div>
        }
      />
    </Routes>
  );
}