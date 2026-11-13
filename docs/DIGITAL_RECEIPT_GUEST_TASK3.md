# Phase 2 Task 3 — Guest Digital Receipt Page

## Route và contract thực tế

Guest frontend: `/receipt?token=<receipt-token>`.
Backend API: `GET /api/v1/public/receipts?token=<receipt-token>` (không phải path token).
POS vẫn dùng nguyên `receiptUrl` backend trả về để tạo QR, không rewrite URL hoặc
tự sinh token. Chuyển base URL phía backend từ API JSON sang trang frontend:

```properties
RECEIPT_PUBLIC_BASE_URL=http://localhost:5173/receipt
```

Restart backend sau thay đổi. Giữ secret và provider POS hiện có. Với cấu hình
mới, response issue có dạng `http://localhost:5173/receipt?token=...`. Link cũ đã
in trỏ API backend vẫn mở JSON như trước, không thể tự đổi đích của QR đã in.
URL/query format `?token=...` và API issue/public của Task 1 không thay đổi.

## Dữ liệu hiển thị và giới hạn contract

Trang dùng PublicReceiptResponse thật: invoiceNumber, transactionTime,
distributionPartner, currency, totalAmount và items (productCode/productName/
quantity/unitPrice/amount). Hiển thị đại lý, mã/ngày hóa đơn, tiền tệ, từng sản
phẩm, số lượng, đơn giá, thành tiền, tạm tính và tổng cộng. Tạm tính cộng amount
của các item bằng phép toán thập phân, không cộng float làm sai 0.1 + 0.2.

Invoice hiện chỉ lưu mã Distribution Partner, không có tên/địa chỉ cửa hàng,
thuế, chiết khấu hoặc PaymentStatus riêng. Không tự tạo dữ liệu các trường này:
hiển thị giá trị đại lý thực tế, không hiện thuế/chiết khấu nếu không có, và
trạng thái thanh toán báo chưa có thông tin riêng. Nhãn "Hóa đơn đã được ghi
nhận" phản ánh API chỉ cho đọc Invoice ACCEPTED, không giả định trạng thái PAID.
Không sửa backend chỉ để tạo dữ liệu thiếu.

API Task 1 cố ý trả cùng 404 Receipt unavailable cho token giả, hết hạn, bị thu
hồi hoặc Invoice không tồn tại/không hợp lệ. UI hiển thị thông báo chung nêu
các khả năng đó và hướng dẫn liên hệ cửa hàng, không suy đoán hay tiết lộ lý do.
Token sai cấu trúc/thiếu/duplicate trong URL được phát hiện cục bộ và không gọi API.
Network/5xx có nút Thử lại; response thiếu/sai cấu trúc không hiển thị hóa đơn.

Give Feedback và Save Purchase chỉ là ô "Sắp ra mắt", không điều hướng hoặc
gửi API Feedback/Registration/Claim. Có chức năng in qua trình duyệt, ẩn ô sắp
ra mắt và nút thao tác trong bản in.

## Routing và bảo mật

- Guest route nằm ngoài RequireAuth/MainLayout/Customer Portal Layout.
- AppProviders bỏ qua AuthBootstrap và TenantProvider cho đúng `/receipt` hoặc
  `/receipt/`, không phụ thuộc tài khoản, domain tenant hay Keycloak hiện tại.
  Các route còn lại giữ flow xác thực cũ.
- Client public riêng dùng cùng apiConfig của ứng dụng, không có JWT/refresh
  interceptor. Axios fetch adapter + withCredentials=false bỏ cookie cả khi
  cùng origin, không gửi XSRF cookie/header, referrerPolicy=no-referrer và no-store.
- POS và Guest tái sử dụng hàm getPublicReceipt, chỉ gọi endpoint backend cố định;
  không gắn JWT lên receipt URL tùy ý. Query chỉ gồm token, không nhận Customer ID
  hay Tenant ID từ người dùng.
- Token chỉ ở URL và bộ nhớ query hiện tại, không ghi vào localStorage/sessionStorage.
  Query gcTime=0, không giữ dữ liệu khi rời trang, không dùng dữ liệu token cũ làm
  placeholder khi đổi link. Không log token hoặc thông tin request ra console.
- Meta no-referrer ở HTML ngăn lộ URL qua Referrer. Guest chỉ dùng font hệ thống;
  stylesheet Google Fonts hiện có được tách và chỉ tải khi vào route ứng dụng
  còn lại. Không thêm analytics, CDN, QR service hoặc request bên thứ ba cho Guest.
- Chỉ map public allowlist; không hiển thị trường Customer/tenant/POS/token/JWT
  bất ngờ xuất hiện trong JSON. React render text, không dùng HTML từ server.

## Cấu hình local và điện thoại (LAN)

Frontend `.env` (không có secret):

```properties
VITE_API_BASE_URL=http://localhost:8081
VITE_PUBLIC_API_BASE_URL=/
```

Khi public base là `/`, Vite dev server proxy duy nhất path
`/api/v1/public/receipts` tới VITE_API_BASE_URL. Điện thoại gọi API cùng origin
frontend; không gọi localhost của điện thoại, không cần mở rộng CORS backend
chỉ để dev Guest. API riêng của ứng dụng giữ cấu hình cũ. Bỏ tùy chọn này nếu
muốn gọi API khác origin trực tiếp và đã cấu hình CORS đúng môi trường.

Chạy frontend:

```powershell
npm.cmd run dev -- --host 0.0.0.0 --port 5173
```

Backend `.env` dùng IP LAN của máy chạy frontend, ví dụ:

```properties
RECEIPT_PUBLIC_BASE_URL=http://192.168.1.10:5173/receipt
```

Restart backend và Vite sau đổi cấu hình. Điện thoại cùng mạng và truy cập được
cổng frontend 5173. Không cần đưa JWT/secret vào QR hoặc frontend. Production dùng
HTTPS/domain frontend thực; dev proxy không có trong bản build nên cấu hình
reverse proxy cho `/api/v1/public/receipts`, hoặc đặt VITE_PUBLIC_API_BASE_URL
thành API URL công khai và cấu hình CORS phù hợp. Hosting SPA cần fallback các
request `/receipt` về index.html để refresh/direct link hoạt động.

Không thay RECEIPT_TOKEN_SECRET khi chỉ đổi nơi hiển thị. Với token đã issue,
retry cùng requestId dưới base URL mới có thể trả URL cùng token nhưng trỏ sang
frontend; không tạo lại Invoice để chuyển trang xem.

## End-to-end thủ công từ POS đến Guest

1. Backend/DB/provider active; tài khoản POS có TRANSACTION_SUBMIT và RECEIPT_ISSUE.
   Đăng nhập POS qua flow hiện có. Guest không cần bất kỳ quyền/JWT nào.
2. Mở POS Simulator, tạo mã hóa đơn mới, thêm P001/Sua/10000, số lượng 2 và gửi.
   Kỳ vọng POST Transaction 201, POST Receipt 200, Public GET 200 và Payment Success.
3. Kiểm tra receiptUrl response là địa chỉ frontend `/receipt?token=...`. QR
   chứa đúng nguyên URL đó, không chứa Invoice ID thay token hoặc JWT.
4. Quét QR bằng điện thoại hoặc Copy Link mở cửa sổ ẩn danh. Phải thấy trang Guest
   EcoFood, không chuyển Keycloak/login, không có menu/sidebar Admin.
5. Đối chiếu mã hóa đơn, ngày, partner, sản phẩm, số lượng 2, đơn giá 10000 và
   total 20000 VND với Invoice/Payment Success. Dữ liệu không được lấy từ giỏ đang sửa.
6. Refresh URL: vẫn hiện đúng hóa đơn, không POST Transaction/Receipt, không cần
   đăng ký hoặc chọn Customer/Tenant. F12 Network chỉ có Public Receipt GET,
   không Authorization/cookie, không tenant/login-info hoặc Keycloak call.
7. Nhấn In hóa đơn/Save as PDF: đủ nội dung và tổng tiền, không in các ô sắp ra mắt.
   Có thể tắt Header/Footer trong hộp thoại Print để không in URL trên đầu/cuối trang.
8. Bỏ token/sửa thành chuỗi sai cấu trúc: "Liên kết không hợp lệ", không có dữ liệu
   hoặc API request. Dùng token giả đúng độ dài: API 404 và "Hóa đơn không khả dụng".
9. Thu hồi receipt bằng DELETE API Task 1 rồi refresh Guest: 404, không còn dữ liệu.
   Test hết hạn trên dev bằng TTL PT5S, phát hành requestId mới, chờ rồi refresh:
   cùng thông báo không khả dụng; frontend không tiết lộ phân biệt revoke/expiry.
10. Chặn Public GET hoặc ngắt mạng: trạng thái Không thể kết nối và Thử lại.
    Khôi phục kết nối, bấm Thử lại: tải đúng Invoice, không tạo mới Transaction/Receipt.
11. Thử hai link hóa đơn khác nhau: không hiển thị dữ liệu của link trước trong
    lúc đổi token hoặc khi link sau lỗi. Thêm tenantId/customerId vào query không
    thay đổi Invoice gắn với token, và không được gửi chúng vào Public API.
12. Kiểm tra viewport 390px, 768px và desktop: đọc được sản phẩm/tiền, không tràn
    ngang. Give Feedback/Save Purchase chỉ có trạng thái Sắp ra mắt, không link giả.

## Kiểm thử tự động

```powershell
npm.cmd run test:receipt:guest
npm.cmd run test:transaction
$env:PLAYWRIGHT_BROWSERS_PATH = 'D:\DoAnTotNghiep\frontend\node_modules\.cache\ms-playwright'
npm.cmd run test:receipt:browser
npm.cmd run lint
npm.cmd run build
```

Browser tests chạy Guest bằng entry/route ứng dụng thật; POS dùng fixture tách
biệt, API được mock. Có test POS QR → giải mã SVG → browser context ẩn danh mới
đọc đúng Invoice, không cần login. Test proxy dùng Node HTTP backend fixture riêng
để kiểm tra Vite forward thật, không chỉ intercept route trình duyệt.
Các mock này chỉ nằm trong tests/, không phải production flow hoặc route.

## Kết quả xác minh 14/11/2026

- 25 unit test đạt: 7 test Guest mới và 18 test Transaction/POS/QR hiện có.
- 12 browser test đạt: 8 test Guest/proxy mới và 4 test hồi quy POS QR.
  Guest được mở bằng entry/router thật, không dùng layout hoặc bootstrap giả.
  POS → giải mã QR SVG → browser context mới mở đúng Invoice đã được kiểm tra.
- Public GET được kiểm tra không Authorization, không cookie (kể cả cookie đã
  được đặt trong cùng origin), không Referer; không có request ngoài origin.
  Token không nằm trong localStorage/sessionStorage. Không có API tenant/login
  khi mở/refresh Guest. Lỗi token không hiển thị dữ liệu Invoice trước đó.
- Đã xem ảnh guest-desktop.png, guest-mobile.png và guest-print.png trong
  test-results; kiểm tra viewport 390px/768px/desktop không tràn ngang và Print
  ẩn các hành động/ô sắp ra mắt.
- Lint exit 0, không có error; còn 12 warning có sẵn ở Tenant/role/dashboard/
  Customer Profile. Không sửa chức năng ngoài task để dọn cảnh báo.
- Build production thành công: Vite 8.3.5; JS khoảng 577.39 kB (gzip 171.28 kB),
  CSS 37.79 kB. Còn cảnh báo chunk vượt 500 kB, không ảnh hưởng build.
- Không thêm dependency, không chạy lại backend test vì không sửa source backend.
  Chưa kiểm thử phiên Keycloak/MongoDB thật hoặc camera điện thoại/máy in vật lý;
  các API trong browser tests được mock, test proxy dùng HTTP fixture riêng.

## File thay đổi trong Task 3

Tạo mới:

- src/services/apiConfig.js
- src/app/private-fonts.css
- src/features/receipt/api/publicReceipt.api.js
- src/features/receipt/lib/receiptRoute.js
- src/features/receipt/lib/guestReceipt.js
- src/features/receipt/lib/guestReceipt.test.js
- src/features/receipt/hooks/useGuestReceipt.js
- src/features/receipt/pages/GuestReceiptPage.jsx
- src/features/receipt/pages/GuestReceiptPage.css
- tests/receipt/guest.spec.js
- tests/receipt/proxy-server.js
- docs/DIGITAL_RECEIPT_GUEST_TASK3.md

Sửa: src/app/AppProviders/AppProviders.jsx, src/app/AppRouter/AppRouter.jsx,
src/constants/routes.js, src/services/apiClient.js (chỉ tách cấu hình dùng chung),
src/features/transaction/api/receipt.api.js (dùng chung public client), src/index.css,
index.html, vite.config.js, .env.example, package.json, playwright.receipt.config.js,
tests/receipt/receipt.spec.js (Receipt URL fixture trỏ Guest frontend).

Không xóa file, không thêm dependency, không sửa backend/CoreBE/CoreFE. Các thay
đổi Task 1/Task 2 chưa commit được giữ nguyên. Những điểm tích hợp provider/router/
transport/font trên là cần thiết cho Guest không đăng nhập và bảo vệ receipt token;
không thay cơ chế JWT hoặc quyền của API còn lại.
