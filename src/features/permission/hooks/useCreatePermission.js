import { useMutation, useQueryClient } from "@tanstack/react-query";

import { createPermission } from "../api/permission.api.js";

export function useCreatePermission() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload) => createPermission(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["permissions", "directory"] });
    },
  });
}
