import { apiClient, unwrapData } from "../../../services/apiClient.js";
import { validateReceiptUrl } from "../lib/receiptFlow.js";
import { getPublicReceipt } from "../../receipt/api/publicReceipt.api.js";

export async function issueReceipt(invoiceId, requestId) {
  return unwrapData(await apiClient.post(
    `/api/v1/transactions/${encodeURIComponent(invoiceId)}/receipts`, { requestId },
  ));
}

export async function readPublicReceipt(receiptUrl) {
  const url = validateReceiptUrl(receiptUrl);
  // Never fetch an arbitrary returned URL with the authenticated client.
  // The fixed backend endpoint needs only the receipt capability, never a JWT.
  return getPublicReceipt(url.searchParams.get("token"));
}
