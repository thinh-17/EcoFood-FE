import {
  FiHome,
  FiUser,
  FiUsers,
  FiUserCheck,
  FiBriefcase,
  FiSliders,
  FiPackage,
  FiShield,
  FiKey,
  FiDatabase,
  FiLogOut,
  FiFilePlus,
  FiFileText,
  FiMessageSquare,
  FiActivity,
  FiShare2,
  FiBookOpen,
  FiSettings,
} from "react-icons/fi";

import { ROUTES } from "../../constants/routes.js";

export const navItems = [
  { id: "audit-log", label: "Audit Log", icon: FiActivity, to: "/audit-log" },
  { id: "complaints", label: "Complaints", icon: FiMessageSquare, to: "/complaints" },
  {
    id: "home",
    label: "Home",
    icon: FiHome,
    to: ROUTES.HOME,
  },

  {
    id: "partner",
    label: "Partner",
    icon: FiShare2,

    children: [
      {
        id: "tenant",
        label: "Tenants",
        icon: FiBriefcase,
        to: ROUTES.TENANT,
      },
      {
        id: "tenant-onboarding",
        label: "Tenant Onboarding",
        icon: FiFilePlus,
        to: ROUTES.TENANT_ONBOARDING,
      },
    ],
  },

  {
    id: "manager",
    label: "Manager",
    icon: FiSliders,
    to: ROUTES.MANAGER,
  },

  {
    id: "product-library",
    label: "Product Library",
    icon: FiBookOpen,
    children: [
      { id: "products", label: "Products", icon: FiPackage, to: ROUTES.PRODUCTS },
      { id: "propositions", label: "Propositions", icon: FiFileText, to: ROUTES.PROPOSITIONS },
    ],
  },

  {
    id: "users-group",
    label: "Users",
    icon: FiUserCheck,

    children: [
      {
        id: "users",
        label: "Users",
        icon: FiUsers,
        to: ROUTES.USERS,
      },
      {
        id: "roles",
        label: "Roles",
        icon: FiShield,
        to: ROUTES.ROLES,
      },
      {
        id: "permissions",
        label: "Permissions",
        icon: FiKey,
        to: ROUTES.PERMISSIONS,
      },
      {
        id: "data-access",
        label: "Data Access Rules",
        icon: FiDatabase,
        to: ROUTES.DATA_ACCESS_RULES,
      },
    ],
  },

  {
    id: "account",
    label: "Account",
    icon: FiSettings,

    children: [
      {
        id: "account-profile",
        label: "Account",
        icon: FiUser,
        to: ROUTES.ACCOUNT,
      },
      {
        id: "account-logout",
        label: "Log out",
        icon: FiLogOut,
        action: "logout",
      },
    ],
  },
];
