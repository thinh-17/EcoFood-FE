import { useQuery } from "@tanstack/react-query";

import { getRoleDirectory } from "../api/role.api.js";

// Flat reference list (no pagination/search) — backs the Roles tab under Users.
export function useRoleDirectory() {
  return useQuery({
    queryKey: ["roles", "directory"],
    queryFn: getRoleDirectory,
  });
}
