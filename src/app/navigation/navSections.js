// Categorization only: visibility is evaluated by the existing filterNavItems first.
const SECTIONS = [
  ["overview", "Overview", ["home", "manager"]],
  ["partners", "Partner Management", ["tenant", "tenant-onboarding"]],
  ["products", "Product Library", ["products", "propositions"]],
  ["service", "Customer Service", ["complaints"]],
  ["access", "User & Access Management", ["users", "roles", "permissions", "data-access"]],
  ["system", "System", ["audit-log"]],
];

export function navigationSections(visibleItems) {
  const links = visibleItems.flatMap((item) => item.children ?? [item]);
  return SECTIONS.map(([id, label, ids]) => ({ id, label,
    items: ids.map((key) => links.find((item) => item.id === key)).filter(Boolean),
  })).filter((section) => section.items.length);
}

export function activeNavigationPath(pathname, links) {
  return links.filter(({ to }) => to && (to === pathname || (to !== "/" && pathname.startsWith(`${to}/`))))
    .sort((a, b) => b.to.length - a.to.length)[0]?.to;
}
