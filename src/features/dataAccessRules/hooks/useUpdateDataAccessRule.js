import { useMutation, useQueryClient } from "@tanstack/react-query";

import { updateDataAccessRule } from "../api/dataAccessRule.api.js";

export function useUpdateDataAccessRule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, payload }) => updateDataAccessRule(id, payload),
    onSuccess: (_data, { id }) => {
      queryClient.invalidateQueries({ queryKey: ["data-access-rules", "directory"] });
      queryClient.invalidateQueries({ queryKey: ["data-access-rules", "detail", id] });
    },
  });
}
