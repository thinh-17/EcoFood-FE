export function unreadBadge(count) {
  if (!Number.isFinite(count) || count <= 0) return "";
  return count > 99 ? "99+" : String(count);
}
