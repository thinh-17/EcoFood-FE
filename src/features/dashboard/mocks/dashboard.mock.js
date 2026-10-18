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
    { id: "a1", type: "transaction", title: "Giao dịch #OD-1042 đã thanh toán", detail: "Chi nhánh Quận 1", occurredAt: "2026-10-12T09:45:00+07:00" },
    { id: "a2", type: "product", title: "Cập nhật sản phẩm Cà phê sữa", detail: "Danh mục Đồ uống", occurredAt: "2026-10-12T09:20:00+07:00" },
    { id: "a3", type: "tenant", title: "Thêm người dùng vào chi nhánh", detail: "Quyền Quản lý", occurredAt: "2026-10-12T08:35:00+07:00" },
    { id: "a4", type: "complaint", title: "Tiếp nhận phản hồi khách hàng", detail: "Đơn hàng #OD-1038", occurredAt: "2026-10-11T17:15:00+07:00" },
  ],
  "tenant-002": [
    { id: "b1", type: "transaction", title: "Giao dịch #OD-218 đã thanh toán", detail: "Chi nhánh Thủ Đức", occurredAt: "2026-10-12T10:15:00+07:00" },
    { id: "b2", type: "product", title: "Thêm sản phẩm Trà đào", detail: "Danh mục Đồ uống", occurredAt: "2026-10-12T09:05:00+07:00" },
  ],
};

export const dashboardArticles = [
  {
    id: "n1",
    category: "Vận hành",
    title: "5 chỉ số giúp theo dõi hiệu quả vận hành cửa hàng F&B",
    source: "Kiến thức nội bộ",
    image: "https://images.unsplash.com/photo-1552566626-52f8b828add9?w=900&auto=format&fit=crop&q=80",
  },
  {
    id: "n2",
    category: "Sản phẩm",
    title: "Xây dựng thực đơn nhất quán trên nhiều chi nhánh",
    source: "Kiến thức nội bộ",
    image: "https://images.unsplash.com/photo-1559305616-3f99cd43e353?w=900&auto=format&fit=crop&q=80",
  },
  {
    id: "n3",
    category: "Khách hàng",
    title: "Cải thiện trải nghiệm khách hàng từ phản hồi sau mua",
    source: "Kiến thức nội bộ",
    image: "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=900&auto=format&fit=crop&q=80",
  },
  {
    id: "n4",
    category: "Tăng trưởng",
    title: "Gợi ý quản lý giá bán và chương trình khuyến mãi",
    source: "Kiến thức nội bộ",
    image: "https://images.unsplash.com/photo-1543353071-087092ec393a?w=900&auto=format&fit=crop&q=80",
  },
  {
    id: "n5",
    category: "Quản trị",
    title: "Phân quyền truy cập theo tenant và vai trò",
    source: "Kiến thức nội bộ",
    image: "https://images.unsplash.com/photo-1556740738-b6a63e27c4df?w=900&auto=format&fit=crop&q=80",
  },
];
