import { ROUTES } from "../../../constants/routes.js";

export function isGuestReceiptPath(pathname) {
  return pathname === ROUTES.GUEST_RECEIPT || pathname === `${ROUTES.GUEST_RECEIPT}/`;
}

export function getGuestReceiptToken(search) {
  const values = new URLSearchParams(search).getAll("token");
  return values.length === 1 && /^[A-Za-z0-9_-]{43}$/.test(values[0]) ? values[0] : null;
}
