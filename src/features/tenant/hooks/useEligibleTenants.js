import { useQuery } from "@tanstack/react-query";
import { getEligibleTenants } from "../api/tenant.api.js";

export function useEligibleTenants() {
  return useQuery({ queryKey: ["tenants", "eligible"], queryFn: getEligibleTenants });
}
