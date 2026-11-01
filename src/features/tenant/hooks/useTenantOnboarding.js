import { useMutation, useQueryClient } from "@tanstack/react-query";

import { onboardTenant } from "../api/tenant.api.js";

export function useTenantOnboarding() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: onboardTenant,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tenants"] });
    },
  });
}
