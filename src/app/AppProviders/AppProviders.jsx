import "./AppProviders.css";

import { QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter } from "react-router-dom";

import { queryClient } from "../queryClient.js";

import { TenantProvider } from
  "../../features/tenant/context/TenantProvider.jsx";
import { AuthBootstrap } from "../../features/auth/components/AuthBootstrap.jsx";

export function AppProviders({ children }) {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthBootstrap>
          <TenantProvider>
            {children}
          </TenantProvider>
        </AuthBootstrap>
      </BrowserRouter>
    </QueryClientProvider>
  );
}