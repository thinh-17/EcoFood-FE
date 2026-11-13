import { useQuery } from "@tanstack/react-query";
import { getPublicReceipt } from "../api/publicReceipt.api.js";
import { validateGuestReceipt } from "../lib/guestReceipt.js";

export function useGuestReceipt(token) {
  return useQuery({
    queryKey: ["guest-receipt", token],
    queryFn: async ({ signal }) => validateGuestReceipt(await getPublicReceipt(token, signal)),
    enabled: Boolean(token),
    staleTime: 0,
    gcTime: 0,
    retry: false,
    refetchOnWindowFocus: false,
  });
}
