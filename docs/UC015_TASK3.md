# UC-015 Task 3 — Frontend

## Chức năng

- `/transactions`: danh sách giao dịch, tìm Invoice ID chính xác hoặc chuỗi con
  mã hóa đơn, lọc khoảng thời gian/trạng thái, chọn 10/20/50/100 dòng mỗi trang,
  xem chi tiết Invoice/Items qua modal, thống kê số lượng và tổng tiền theo currency.
- `/pos-simulator`: nhập danh mục sản phẩm thử trong phiên, chọn sản phẩm,
  sửa số lượng/đơn giá, tính tổng và submit. Danh mục thử không ghi vào hệ thống
  sản phẩm, không gọi API sản phẩm giả định. Hiện backend chưa có API danh mục.
- Các chế độ kiểm thử: hợp lệ, sai tổng hóa đơn, số lượng bằng 0. Gửi trùng
  payload đã thành công hoặc gửi lại nguyên payload gần nhất sau lỗi mạng.
- Hiển thị HTTP error và message backend, ID/status/receivedAt khi thành công.
  Không tự động retry POST. Không tự đổi invoiceNumber sau submit để tránh tạo
  hóa đơn mới ngoài ý muốn. Nút tạo mã hóa đơn mới giữ giỏ, tạo UUID và cập nhật giờ.
- Tái sử dụng CoreCard, CorePageHeader, CoreTable, CoreModal, CoreSelect,
  CoreButton, CoreEmptyState từ `@thinh-17/fe-core` 1.1.2. Không cần thêm shared
  component vào CoreFE; TransactionStatus chỉ dùng nội bộ feature.

## API và phân quyền

Gọi qua `services/apiClient.js` hiện có; interceptor tự gắn JWT nội bộ từ
authStore. Không nhập token/tenant/POS thủ công trên màn hình, không đổi auth flow.

| Method | API | Sử dụng |
| --- | --- | --- |
| GET | /api/v1/transactions | List, filter, page/size |
| GET | /api/v1/transactions/{id} | Invoice detail và Items |
| GET | /api/v1/transactions/summary | Summary với cùng filter, không phân trang |
| POST | /api/v1/transactions | Submit và replay cùng contract POS |

Menu và route `/transactions` yêu cầu `TRANSACTION_READ` cùng roleGroups chứa
SYSTEM/ENTERPRISE/MASTER_TENANT/TENANT. Route POS yêu cầu TRANSACTION_SUBMIT.
Backend vẫn quyết định quyền và Data Scope cuối cùng. Sau cập nhật ACL, refresh
hoặc exchange lại token qua flow hiện có. Cache query bao gồm user, tenant và
permissions/roleGroups; không dùng tenant UI chưa được backend xác thực làm scope.
State filter/detail/giỏ/replay được reset khi scope token thay đổi.

Tích hợp tối thiểu vào AppRouter, routes, navItems, navAccess và MainLayout để
hai màn hình có thể truy cập theo quyền. Không thay rule menu cũ, không sửa
Customer Portal hiện có, không đổi backend/CoreBE/CoreFE, không thêm dependency.

## Cấu hình và chạy

Từ thư mục `frontend`, dùng Node/npm tương thích với Vite đã có trong dự án:

```powershell
npm.cmd run dev
```

Đặt `VITE_API_BASE_URL` theo backend thực tế; ví dụ `http://localhost:8081`.
Khởi động lại Vite sau khi đổi biến môi trường. Đăng nhập bằng tài khoản có ACL
phù hợp. Không cần chỉnh URL API hoặc token trong component.

API đọc không cần mock Sale Orchestrator. Submit cần provider hoạt động và binding
khớp sub/tenantId của JWT, currencies/maxItems và trạng thái Plan/Proposition hợp
lệ theo hướng dẫn Task 1. Không có provider trả 503; binding sai hoặc thiếu quyền
trả 403. Simulator dùng cùng JWT/API với POS, không có ngoại lệ trên backend.

## Kiểm thử Transaction Management

1. Đăng nhập bằng tài khoản có TRANSACTION_READ và Data Scope nhân viên; mở menu
   **Quản lý giao dịch**. Dữ liệu và thống kê phải chỉ trong scope token.
2. Nhập chuỗi mã hóa đơn hoặc Invoice ID 24 ký tự hex rồi **Áp dụng**. Các input
   là draft cho đến khi áp dụng; list và summary dùng cùng bộ lọc đã áp dụng.
3. Chọn ngày theo giờ địa phương và status ACCEPTED. Frontend chuyển ngày sang
   UTC ISO-8601, backend so sánh transactionTime, bao gồm cả hai mốc. Đến ngày là
   thời điểm cụ thể, không tự hiểu là hết ngày.
4. Chọn kích thước trang và Prev/Next. Khi áp dụng/xóa filter hoặc đổi size,
   trở về trang đầu. Summary tính toàn bộ kết quả, không chỉ trang hiện tại.
5. Bấm **Xem**, kiểm tra mã/ID hóa đơn, nguồn POS, tenant, người gửi, Plan,
   Proposition, ngày tiếp nhận, trạng thái, tổng tiền và các items.
6. Kiểm tra rỗng, lỗi kết nối, token hết hạn, 403/404; màn hình phải hiển thị
   lỗi hoặc trạng thái rỗng phù hợp, không dùng số liệu của query khác làm fallback.
7. Dùng tài khoản tenant A/B riêng, chuyển tenant qua flow xác thực hiện có.
   Invoice và thống kê không được dùng cache của user/tenant trước đó.

## Kiểm thử POS Simulator

1. Đăng nhập tài khoản có TRANSACTION_SUBMIT, provider/binding backend hợp lệ.
   Mở **POS Simulator**, currency mặc định VND (phải được provider cho phép).
2. Nhập mã P001, tên Sua, đơn giá 10000 rồi **Thêm vào danh mục thử**.
   Chọn sản phẩm rồi **Thêm sản phẩm**. Nhập số lượng 2: thành tiền/tổng 20000.
   Thử thêm sản phẩm khác, sửa đơn giá hoặc xóa dòng. Muốn đổi currency, xóa giỏ
   trước; danh mục thử được phân theo currency nhập lúc tạo sản phẩm.
3. Giữ mã hóa đơn UUID mới, ngày hiện tại hoặc quá khứ và chế độ hợp lệ.
   **Gửi giao dịch**: kỳ vọng 201, status ACCEPTED, có ID và thời điểm tiếp nhận.
4. Bấm **Gửi trùng giao dịch đã thành công**: gửi nguyên payload đã được tiếp
   nhận bất kể đã sửa giỏ/form; kỳ vọng 409 Duplicate transaction, không thêm invoice.
5. Bấm **Tạo mã hóa đơn mới**, chọn **sai tổng tiền**, gửi: kỳ vọng 400.
   Đổi sang số lượng bằng 0: kỳ vọng 400. Payload gốc hợp lệ được tính trước,
   chỉ chủ động làm sai trường của chế độ được chọn. Xem payload đã gửi trong details.
6. Chuyển về hợp lệ, tạo mã mới, gửi lại thành công. Nếu có READ, mở Transaction
   Management và tìm mã vừa submit; số lượng/tổng tiền/items phải khớp.
7. Kiểm thử mất kết nối: hiển thị chưa nhận được phản hồi; không kết luận chưa lưu.
   **Gửi lại payload gần nhất** để kiểm tra kết quả, dùng cùng mã nếu chưa xác định
   request trước đã được tiếp nhận. POST không tự động retry.
8. Kiểm tra thiếu provider 503, binding/quyền sai 403, Plan/Proposition inactive
   409. Thông báo hiển thị mã HTTP và message backend, không giả lập thành công.

Tính tiền dùng BigInt cho phép toán thập phân trước khi chuyển JSON number, kiểm
tra số serialize không làm đổi giá trị; từ chối giá trị vượt khả năng biểu diễn
chính xác. Mỗi input tối đa 12 chữ số nguyên, 6 chữ số lẻ; quantity > 0, giá >= 0.
Các chế độ payload sai được chọn rõ ràng, không bỏ kiểm tra bảo mật backend.

## Kiểm thử tự động và build

```powershell
node --test src/features/transaction/lib/transaction.test.js
npm.cmd run lint
npm.cmd run build
```

Test dùng Node test runner sẵn có, không thêm framework. Bao phủ tính tiền thập
phân, giới hạn độ chính xác, payload và chế độ sai, filter ngày/ID, permission và
Data Scope, cách tách cache theo user/tenant/ACL. Kiểm thử này không thay thế test
trình duyệt end-to-end với Keycloak/MongoDB/backend thực tế.

## File thay đổi

Tạo mới dưới `src/features/transaction/`:

- api/transaction.api.js
- components/RequireTransactionAccess.jsx
- components/TransactionStatus.jsx
- hooks/useTransactionAccess.js
- hooks/useTransactions.js
- lib/posPayload.js
- lib/transactionAccess.js
- lib/transactionFormat.js
- lib/transaction.test.js
- pages/TransactionManagementPage.jsx
- pages/PosSimulatorPage.jsx
- transaction.css

Tạo tài liệu `docs/UC015_TASK3.md`. Sửa `src/app/AppRouter/AppRouter.jsx`,
`src/constants/routes.js`, `src/app/navigation/navItems.js`,
`src/app/navigation/navAccess.js`, `src/layouts/MainLayout/MainLayout.jsx`.
Không xóa file. Các thay đổi đã có ở .npmrc/package-lock/Customer Portal được
giữ nguyên, không triển khai thêm QR Code, Digital Receipt hoặc Customer Portal.
