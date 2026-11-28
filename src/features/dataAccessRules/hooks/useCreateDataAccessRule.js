import { useMutation, useQueryClient } from "@tanstack/react-query";

import { createDataAccessRule } from "../api/dataAccessRule.api.js";

export function useCreateDataAccessRule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload) => createDataAccessRule(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["data-access-rules", "directory"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-access"] });
      queryClient.invalidateQueries({ queryKey: ["business-dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["invoice-dashboard"] });
    },
  });
}
