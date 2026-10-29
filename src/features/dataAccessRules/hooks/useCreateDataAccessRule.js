import { useMutation, useQueryClient } from "@tanstack/react-query";

import { createDataAccessRule } from "../api/dataAccessRule.api.js";

export function useCreateDataAccessRule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload) => createDataAccessRule(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["data-access-rules", "directory"] });
    },
  });
}
