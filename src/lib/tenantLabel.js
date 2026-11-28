export function tenantLabel(tenant) {
  const type = tenant.partnerType?.toLowerCase().replaceAll("_", " ");
  return type ? `${tenant.name} - ${type}` : tenant.name;
}
