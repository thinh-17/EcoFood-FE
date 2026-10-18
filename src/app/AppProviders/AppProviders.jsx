import "./AppProviders.css";

import { QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter } from "react-router-dom";

import { queryClient } from "../queryClient.js";

import { TenantProvider } from
  "../../features/tenant/context/TenantProvider.jsx";

export function AppProviders({ children }) {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <TenantProvider>
          {children}
        </TenantProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
}