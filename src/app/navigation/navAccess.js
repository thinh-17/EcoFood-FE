import {
  canSeeDataAccessRulesSubTab,
  canSeePartnerTab,
  canSeeRolesAndPermissionsSubTabs,
  canSeeTenantOnboarding,
  canSeeUsersTab,
} from "../../features/auth/lib/accessControl.js";
import { canUseNotificationRole } from "../../features/notification/notification.js";
import { catalogAccess } from "../../features/catalog/catalog.js";

// One visibility rule per gated top-level nav item id — ungated items (not
// listed here) are always visible. See app/docs/ACL_ROLE_MODEL.md.
const VISIBILITY_RULES = {
  notifications: canUseNotificationRole,
  partner: canSeePartnerTab,
  "users-group": canSeeUsersTab,
};

// Same idea, one level down — gates an individual child inside a nav group
// (e.g. hiding "Tenant Onboarding" from TENANT_PARTNERSHIP_MANAGER while
// still showing its sibling "Tenant" entry; or hiding Roles/Permission from
// everyone except the ECO actor, while Data Access Rules stays _ADMIN-only
// for any actor and "Users" itself stays ungated here).
const CHILD_VISIBILITY_RULES = {
  "tenant-onboarding": canSeeTenantOnboarding,
  roles: canSeeRolesAndPermissionsSubTabs,
  permissions: canSeeRolesAndPermissionsSubTabs,
  "data-access": canSeeDataAccessRulesSubTab,
};

export function filterNavItems(items, roleCodes, permissions = []) {
  return items
    .filter((item) => {
      if (item.id === "catalog-publications") return catalogAccess({ roles: roleCodes, permissions }).read;
      if (item.id === "complaints") return permissions.includes("COMPLAINT_READ") && roleCodes.some((r) => ["TENANT_ADMIN", "ECO_ADMIN"].includes(r));
      if (item.id === "manager" || item.id === "business-dashboard") return permissions.includes("DASHBOARD_READ");
      const rule = VISIBILITY_RULES[item.id];
      return rule ? rule(roleCodes) : true;
    })
    .map((item) => {
      if (!item.children) return item;
      return {
        ...item,
        children: item.children.filter((child) => {
          const rule = CHILD_VISIBILITY_RULES[child.id];
          return rule ? rule(roleCodes) : true;
        }),
      };
    });
}
