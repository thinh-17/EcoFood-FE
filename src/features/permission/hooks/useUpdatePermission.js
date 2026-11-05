import { useMutation, useQueryClient } from "@tanstack/react-query";

import { updatePermission } from "../api/permission.api.js";

export function useUpdatePermission() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, payload }) => updatePermission(id, payload),
    onSuccess: (_data, { id }) => {
      queryClient.invalidateQueries({ queryKey: ["permissions", "directory"] });
      queryClient.invalidateQueries({ queryKey: ["permissions", "detail", id] });
    },
  });
}
