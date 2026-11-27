import { apiClient, unwrapData } from "../../../services/apiClient.js";

// POST /api/v1/sales/transactions/csv — same submit-transaction path as the
// JSON body endpoint (BatchTransactionService.submit, unchanged), just
// sourced from a CSV upload parsed server-side by BatchTransactionCsvParser.
// Axios sets the multipart boundary/Content-Type itself from the FormData
// instance; never set it manually here.
export async function submitTransactionCsv(file) {
  const body = new FormData();
  body.append("file", file);
  const response = await apiClient.post("/api/v1/sales/transactions/csv", body);
  return unwrapData(response);
}
