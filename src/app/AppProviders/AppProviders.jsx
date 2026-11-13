import "./AppProviders.css";

import { QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, useLocation } from "react-router-dom";
import { useEffect } from "react";
import { isGuestReceiptPath } from "../../features/receipt/lib/receiptRoute.js";

import { queryClient } from "../queryClient.js";

import { TenantProvider } from
  "../../features/tenant/context/TenantProvider.jsx";
import { AuthBootstrap } from "../../features/auth/components/AuthBootstrap.jsx";

function SessionProviders({ children }) {
  const { pathname } = useLocation();
  const guest = isGuestReceiptPath(pathname);
  useEffect(() => {
    // Guest receipt links never cause a request to an external font provider.
    if (!guest) void import("../private-fonts.css");
  }, [guest]);
  if (guest) return children;
  return <AuthBootstrap><TenantProvider>{children}</TenantProvider></AuthBootstrap>;
}

export function AppProviders({ children }) {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <SessionProviders>{children}</SessionProviders>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
