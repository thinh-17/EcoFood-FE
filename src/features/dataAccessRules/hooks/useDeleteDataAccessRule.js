import { useMutation, useQueryClient } from "@tanstack/react-query";
import { deleteDataAccessRule } from "../api/dataAccessRule.api.js";
export function useDeleteDataAccessRule() {
  const client = useQueryClient();
  return useMutation({ mutationFn: deleteDataAccessRule,
    onSuccess: (_data, id) => {
      client.removeQueries({ queryKey: ["data-access-rules", "detail", id] });
      client.invalidateQueries({ queryKey: ["data-access-rules", "directory"] });
      client.invalidateQueries({ queryKey: ["dashboard-access"] });
      client.invalidateQueries({ queryKey: ["business-dashboard"] });
      client.invalidateQueries({ queryKey: ["invoice-dashboard"] });
    },
  });
}
