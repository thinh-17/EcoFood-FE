import axios from "axios";
import { apiConfig } from "../../../services/apiConfig.js";

// Deliberately separate from apiClient: never runs JWT/refresh interceptors.
const publicReceiptClient = axios.create({
  ...apiConfig,
  baseURL: import.meta.env.VITE_PUBLIC_API_BASE_URL || apiConfig.baseURL,
  adapter: "fetch",
  withCredentials: false,
  xsrfCookieName: null,
  fetchOptions: { cache: "no-store", referrerPolicy: "no-referrer" },
});

export async function getPublicReceipt(token, signal) {
  const response = await publicReceiptClient.get("/api/v1/public/receipts", { params: { token }, signal });
  return response.data?.data ?? response.data;
}
