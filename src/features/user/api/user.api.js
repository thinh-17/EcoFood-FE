import { apiClient, unwrapData } from "../../../services/apiClient.js";

// GET /api/v1/users/directory — NOT implemented on the backend yet (this
// call 404s until it exists). Mirrors TenantController.getTenantDirectory
// exactly: page/size/sort/search query params, same first-call-omits-search
// convention, same role-scoping and regex-search strategy are expected to
// carry over once that endpoint is built (see TenantService.
// listTenantDirectory for the pattern to follow).
export async function getUserDirectory({ page = 0, size = 20, sort, search } = {}) {
  const response = await apiClient.get("/api/v1/users/directory", {
    params: { page, size, sort, search },
  });
  return unwrapData(response);
}
