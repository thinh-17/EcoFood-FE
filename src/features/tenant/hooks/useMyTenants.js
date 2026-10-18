import { useQuery } from "@tanstack/react-query";
import { getMyTenants } from "../api/tenant.api.js";

export function useMyTenants() {
  return useQuery({ queryKey: ["tenants", "me"], queryFn: getMyTenants });
}
