// GET /api/v1/tenants/me does not exist on the backend yet — calling it
// 404s. Returning an empty list until that endpoint is actually built,
// rather than hitting a route that isn't there.
export async function getMyTenants() {
  return [];
}
