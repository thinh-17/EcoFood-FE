import { useMutation, useQueryClient } from "@tanstack/react-query";

import { updateTenant } from "../api/tenant.api.js";

export function useUpdateTenant() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, payload }) => updateTenant(id, payload),
    onSuccess: (_data, { id }) => {
      queryClient.invalidateQueries({ queryKey: ["tenants", "directory"] });
      queryClient.invalidateQueries({ queryKey: ["tenants", "detail", id] });
    },
  });
}
