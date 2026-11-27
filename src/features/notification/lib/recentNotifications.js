// Keep server order when timestamps are unavailable; never invent a time.
export function recentNotifications(rows = []) {
  const timestamp = (row) => Date.parse(row.createdAt || row.sentAt) || 0;
  return [...rows].sort((a, b) => timestamp(b) - timestamp(a)).slice(0, 10);
}
