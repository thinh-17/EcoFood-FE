import { useMutation, useQueryClient } from "@tanstack/react-query";

import { createUser } from "../api/user.api.js";

export function useCreateUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload) => createUser(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users", "directory"] });
    },
  });
}
