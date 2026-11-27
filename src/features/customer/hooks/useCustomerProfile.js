import { useQuery } from "@tanstack/react-query";
import { useAuthStore } from "../../auth/store/authStore.js";
import { customerApi } from "../customer.api.js";

export function useCustomerProfile() {
  const token = useAuthStore((state) => state.internalAccessToken);
  return useQuery({ queryKey: ["customer", token, "profile"], queryFn: customerApi.profile,
    enabled: !!token, retry: false });
}
