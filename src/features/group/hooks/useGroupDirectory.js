import { useQuery } from "@tanstack/react-query";

import { getGroupDirectory } from "../api/group.api.js";

// Flat reference list (no pagination/search) — backs the Group picker on
// the Create Role form.
export function useGroupDirectory() {
  return useQuery({
    queryKey: ["groups", "directory"],
    queryFn: getGroupDirectory,
  });
}
