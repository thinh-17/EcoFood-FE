import { useMutation, useQueryClient } from "@tanstack/react-query";

import { updateRole } from "../api/role.api.js";

export function useUpdateRole() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, payload }) => updateRole(id, payload),
    onSuccess: (_data, { id }) => {
      queryClient.invalidateQueries({ queryKey: ["roles", "directory"] });
      queryClient.invalidateQueries({ queryKey: ["roles", "detail", id] });
    },
  });
}
