import { useMutation, useQueryClient } from "@tanstack/react-query";

import { createRole } from "../api/role.api.js";

export function useCreateRole() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload) => createRole(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["roles", "directory"] });
    },
  });
}
