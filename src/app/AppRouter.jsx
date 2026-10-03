import {
  Route,
  Routes,
} from 'react-router';
import { AppButton } from "@thinh-17/fe-core";
import { testCoreFlow } from "@thinh-17/fe-core";

import { useState } from "react";

export function AppRouter() {

  const [message, setMessage] = useState("");

  const handleTest = async () => {
    try {
      const result = await testCoreFlow();
      setMessage(result);
    } catch (error) {
      setMessage("Connection failed");
    }
  };

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
              onClick={handleTest}
            >
              Test FE-core
            </AppButton>
            {message && (
              <p className="text-lg text-green-500 mt-4">{message}</p>
            )}
          </div>
        }
      />
    </Routes>
  );
}