import { apiClient, unwrapData } from "../../../services/apiClient.js";

// GET /api/v1/groups/directory — full Group catalog (id/code/name),
// alphabetical. Backs the Group picker on the Create Role form.
export async function getGroupDirectory() {
  const response = await apiClient.get("/api/v1/groups/directory");
  return unwrapData(response);
}
