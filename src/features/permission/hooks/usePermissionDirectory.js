import { useQuery } from "@tanstack/react-query";

import { getPermissionDirectory } from "../api/permission.api.js";

// Flat reference list (no pagination/search) — backs the Permissions tab under Users.
export function usePermissionDirectory() {
  return useQuery({
    queryKey: ["permissions", "directory"],
    queryFn: getPermissionDirectory,
  });
}
