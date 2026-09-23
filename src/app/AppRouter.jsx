import {
  Route,
  Routes,
} from 'react-router';

export function AppRouter() {
  return (
    <Routes>
      <Route
        path="/"
        element={
          <div className="flex min-h-screen items-center justify-center bg-slate-100">
            <h1 className="text-3xl font-bold text-blue-600">
              F&B Multi-Tenant Platform
            </h1>
          </div>
        }
      />
    </Routes>
  );
}