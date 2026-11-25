const tenantA = {
  displayName: "Huy",
  revenueToday: 18500000,
  ordersToday: 128,
  productsActive: 84,
  complaintsPending: 3,
  revenueChangePercent: 12.4,
  orderChangePercent: 8.2,
};

const tenantB = {
  displayName: "Huy",
  revenueToday: 8300000,
  ordersToday: 62,
  productsActive: 46,
  complaintsPending: 1,
  revenueChangePercent: 5.2,
  orderChangePercent: 2.5,
};

export const dashboardSummaryByTenant = {
  "tenant-001": tenantA,
  "tenant-002": tenantB,
};

export const dashboardActivitiesByTenant = {
  "tenant-001": [
    { id: "a1", type: "transaction", title: "Transaction #OD-1042 paid", detail: "District 1 branch", occurredAt: "2026-10-12T09:45:00+07:00" },
    { id: "a2", type: "product", title: "Updated milk coffee product", detail: "Beverages category", occurredAt: "2026-10-12T09:20:00+07:00" },
    { id: "a3", type: "tenant", title: "Added a user to the branch", detail: "Manager role", occurredAt: "2026-10-12T08:35:00+07:00" },
    { id: "a4", type: "complaint", title: "Received customer feedback", detail: "Order #OD-1038", occurredAt: "2026-10-11T17:15:00+07:00" },
  ],
  "tenant-002": [
    { id: "b1", type: "transaction", title: "Transaction #OD-218 paid", detail: "Thu Duc branch", occurredAt: "2026-10-12T10:15:00+07:00" },
    { id: "b2", type: "product", title: "Added peach tea product", detail: "Beverages category", occurredAt: "2026-10-12T09:05:00+07:00" },
  ],
};

export const dashboardArticles = [
  {
    id: "n1",
    category: "Operations",
    title: "5 metrics to track F&B store performance",
    source: "Internal knowledge",
    image: "https://images.unsplash.com/photo-1552566626-52f8b828add9?w=900&auto=format&fit=crop&q=80",
  },
  {
    id: "n2",
    category: "Products",
    title: "Build a consistent menu across branches",
    source: "Internal knowledge",
    image: "https://images.unsplash.com/photo-1559305616-3f99cd43e353?w=900&auto=format&fit=crop&q=80",
  },
  {
    id: "n3",
    category: "Customers",
    title: "Improve customer experience with post-purchase feedback",
    source: "Internal knowledge",
    image: "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=900&auto=format&fit=crop&q=80",
  },
  {
    id: "n4",
    category: "Growth",
    title: "Tips for managing prices and promotions",
    source: "Internal knowledge",
    image: "https://images.unsplash.com/photo-1543353071-087092ec393a?w=900&auto=format&fit=crop&q=80",
  },
  {
    id: "n5",
    category: "Administration",
    title: "Manage access by tenant and role",
    source: "Internal knowledge",
    image: "https://images.unsplash.com/photo-1556740738-b6a63e27c4df?w=900&auto=format&fit=crop&q=80",
  },
];
