// Isolated browser fixture only; not an application route or production entry point.
import React from "react";
import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import jsQR from "jsqr";
import "@thinh-17/fe-core/style.css";
import "../../src/index.css";
import { PosSimulatorPage } from "../../src/features/transaction/pages/PosSimulatorPage.jsx";
import { useAuthStore } from "../../src/features/auth/store/authStore.js";

const claims = { sub: "test-user", tenantId: "test-tenant", permissions: ["TRANSACTION_SUBMIT", "RECEIPT_ISSUE"], roleGroups: ["TENANT"] };
useAuthStore.setState({ internalAccessToken: `test.${btoa(JSON.stringify(claims))}.fixture`, status: "authenticated" });

window.decodeRenderedReceiptQR = async () => {
  const svg = document.querySelector(".receipt-qr-panel svg").cloneNode(true);
  svg.setAttribute("xmlns", "http://www.w3.org/2000/svg");
  const objectUrl = URL.createObjectURL(new Blob([new XMLSerializer().serializeToString(svg)], { type: "image/svg+xml" }));
  try {
    const image = new Image();
    image.src = objectUrl;
    await image.decode();
    const canvas = document.createElement("canvas"); canvas.width = canvas.height = 864;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(image, 0, 0, 864, 864);
    return jsQR(ctx.getImageData(0, 0, 864, 864).data, 864, 864)?.data;
  } finally { URL.revokeObjectURL(objectUrl); }
};

createRoot(document.getElementById("root")).render(<React.StrictMode>
  <QueryClientProvider client={new QueryClient()}><PosSimulatorPage /></QueryClientProvider>
</React.StrictMode>);
