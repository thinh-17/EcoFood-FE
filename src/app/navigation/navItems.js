import {
  FiHome,
  FiUser,
  FiUsers,
  FiUserCheck,
  FiLayers,
  FiGrid,
  FiPackage,
  FiShield,
  FiLock,
  FiDatabase,
  FiLogOut,
  FiUserPlus,
} from "react-icons/fi";

import { ROUTES } from "../../constants/routes.js";

export const navItems = [
  {
    id: "home",
    label: "Home",
    icon: FiHome,
    to: ROUTES.HOME,
  },

  {
    id: "partner",
    label: "Partner",
    icon: FiUserCheck,

    children: [
      {
        id: "tenant",
        label: "Tenant",
        icon: FiLayers,
        to: ROUTES.TENANT,
      },
      {
        id: "tenant-onboarding",
        label: "Tenant Onboarding",
        icon: FiUserPlus,
        to: ROUTES.TENANT_ONBOARDING,
      },
    ],
  },

  {
    id: "manager",
    label: "Manager",
    icon: FiGrid,
    to: ROUTES.MANAGER,
  },

  {
    id: "product-library",
    label: "Product Library",
    icon: FiPackage,
    to: ROUTES.PRODUCT_LIBRARY,
  },

  {
    id: "users-group",
    label: "Users",
    icon: FiUsers,

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
        label: "Permission",
        icon: FiLock,
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
    icon: FiUser,

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