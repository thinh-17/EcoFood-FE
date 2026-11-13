// HTTP backend fixture for exercising the optional Vite Guest proxy. Test-only.
import http from "node:http";

http.createServer((request, response) => {
  const url = new URL(request.url, "http://127.0.0.1:5181");
  response.setHeader("Content-Type", "application/json");
  if (url.pathname === "/health") return response.end("{}");
  if (url.pathname !== "/api/v1/public/receipts" || request.headers.authorization) {
    response.writeHead(400); return response.end(JSON.stringify({ message: "Unexpected test request" }));
  }
  if (url.searchParams.get("token") !== "c".repeat(43)) {
    response.writeHead(404); return response.end(JSON.stringify({ message: "Receipt unavailable" }));
  }
  response.end(JSON.stringify({ invoiceNumber: "INV-REAL-PROXY", transactionTime: "2026-11-14T01:00:00Z",
    distributionPartner: "DP-PROXY", currency: "VND", totalAmount: 20000,
    items: [{ productCode: "P1", productName: "Sản phẩm qua proxy", quantity: 2, unitPrice: 10000, amount: 20000 }] }));
}).listen(5181, "127.0.0.1");
