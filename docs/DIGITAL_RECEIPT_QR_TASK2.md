# Phase 2 Task 2 — QR Code trong POS Simulator

## Luồng thực hiện

1. POS gửi POST `/api/v1/transactions` bằng apiClient và JWT nội bộ hiện có.
2. Chỉ sau response thành công, lấy `id`, tạo một Receipt session gắn với Invoice
   và một `requestId` UUID ổn định, chụp snapshot payload đã submit.
3. Gửi POST `/api/v1/transactions/{id}/receipts`, body `{requestId}` qua cùng client.
4. Nhận `receiptUrl` và `expiresAt`. QR mã hóa chính xác nguyên string URL backend
   trả về, không tự tạo token, không thêm JWT hoặc thông tin khách hàng vào URL.
5. Đọc GET `/api/v1/public/receipts?token=...` trên backend đã cấu hình bằng request
   không có JWT/cookie. Dùng dữ liệu Receipt để hiển thị Distribution Partner và
   invoice items thực tế. Không fetch URL tùy ý bằng client có Authorization.

Màn hình Payment Success luôn giữ Invoice đã được backend tiếp nhận, kể cả lỗi
Receipt. Hiển thị mã hóa đơn, ngày giao dịch, partner, sản phẩm, số lượng, đơn giá,
thành tiền, tổng tiền và status ACCEPTED. Trước khi đọc Receipt thành công, thông
tin giao dịch lấy từ snapshot đã submit, partner báo chưa tải được; không tự bịa
thông tin hoặc dùng form/giỏ đã bị sửa sau thanh toán.

## Retry và bảo mật

- Phát hành Receipt chỉ được khởi động từ success handler của thao tác Submit,
  không gọi trong render/useEffect. React StrictMode không phát hành thêm receipt.
- Một session/requestId cho mỗi Invoice trong phiên POS. Nhiều thao tác Retry
  đồng thời dùng chung promise đang chạy. POST Receipt không tự retry.
- Lỗi phát hành: Retry Receipt gửi lại cùng invoiceId/requestId. Không gọi lại
  Submit Transaction và không tự chuyển sang requestId mới, kể cả response bị mất
  sau khi backend đã lưu Receipt. Backend Task 1 xử lý idempotency bằng key này.
- URL đã có nhưng đọc nội dung lỗi: retry chỉ GET nội dung, không phát hành lại.
- Submit thất bại không tạo session hay QR cho request thất bại. Nếu đã có Invoice
  thành công trước đó trên màn hình, không xóa kết quả cũ vì một lần gửi khác lỗi.
- Refresh trang không tự gửi POST Transaction/Receipt; state phiên POS hiện tại
  được xóa như hành vi trước đây, không tự phục hồi bằng submit. Không lưu token
  Receipt/JWT vào localStorage mới hoặc public environment variable.
- URL phải là HTTP/HTTPS, không user-info/fragment, chỉ có query token theo contract
  Backend Task 1. QR/copy/open dùng nguyên string backend, không chuẩn hóa URL.
- Dùng qrcode tạo matrix cục bộ; SVG đen/trắng, quiet zone 4 module, kích thước màn
  hình 288px, bản in 65mm. Không gọi QR image service ngoài để lộ receipt token.
- Link mở tab mới với noopener/noreferrer và no-referrer. Copy dùng Clipboard API,
  nếu browser không cho phép thì chọn link để người dùng copy thủ công.
- Token hết hạn hiển thị trạng thái hết hạn, vô hiệu hóa Copy/Open/Print; không
  tự gia hạn/phát hành access mới. Link bị revoke/hết hạn cần xử lý phát hành lại
  có chủ đích qua flow backend; không giải quyết bằng submit hóa đơn mới.

## Print Receipt

Nút Print Receipt chỉ bật khi có đủ nội dung hóa đơn và QR. Dùng SVG cùng Receipt
URL, kèm summary/partner/items/total/status/expiry/link. Print DOM được portal ra
ngoài layout; print CSS chỉ in Receipt, không in sidebar, form POS hoặc payload
debug. Render SVG không phụ thuộc tải ảnh từ mạng nên QR đã sẵn sàng khi bấm in.
Browser vẫn hiển thị hộp thoại Print/Save as PDF theo thao tác người dùng.

## Chuẩn bị môi trường kiểm thử

- Backend Task 1 chạy, MongoDB hoạt động, Receipt secret đã cấu hình một lần,
  TTL phù hợp; provider POS active, binding khớp tenant/sub và invoice.
- Tài khoản POS có `TRANSACTION_SUBMIT` và `RECEIPT_ISSUE`; lấy JWT nội bộ mới sau
  thay đổi ACL. Không cần TRANSACTION_READ để xem Payment Success/Receipt vì
  nội dung được lấy từ Public Receipt API bằng capability token.
- Frontend `VITE_API_BASE_URL` trỏ tới backend thực tế (mặc định backend 8081,
  giữ cấu hình API client hiện có). Không đặt RECEIPT_TOKEN_SECRET hoặc POS secret
  vào biến VITE_*. Restart Vite khi đổi cấu hình.
- Để quét bằng điện thoại, `RECEIPT_PUBLIC_BASE_URL` phải là IP LAN/domain backend
  mà điện thoại truy cập được, ví dụ `http://192.168.1.10:8081/api/v1/public/receipts`.
  Điện thoại và máy chạy backend dùng cùng LAN, cổng backend phải truy cập được.
  Không dùng localhost/127.0.0.1 cho link quét từ máy khác; dùng HTTPS khi triển khai.
- Task này chưa có Guest Receipt Page: quét QR hiện mở JSON giới hạn của API
  Digital Receipt. Không triển khai thêm Customer Registration/Feedback.

## Test thủ công trên POS Simulator

1. Đăng nhập, mở POS Simulator. Nhập P001 / Sua / đơn giá 10000 vào danh mục thử,
   chọn sản phẩm, số lượng 2. Giữ chế độ giao dịch hợp lệ, mã hóa đơn mới.
2. Bấm Gửi giao dịch. DevTools Network phải có một POST Transaction (201),
   một POST Receipt (200) và GET Public Receipt (200). Public GET không có JWT.
3. Payment Success hiển thị đúng mã/ngày/partner/sản phẩm/quantity/unit price/total
   20000 VND và status ACCEPTED. Chỉnh giỏ sau đó không làm đổi summary đã thanh toán.
4. QR hiển thị rõ. Quét bằng camera điện thoại: URL phải trùng hoàn toàn receiptUrl
   trong POST Receipt response, mở đúng Invoice JSON. Không chứa accessToken/JWT.
5. Copy Link rồi dán vào cửa sổ riêng tư: link xem được không cần đăng nhập.
   Mở Digital Receipt phải mở đúng URL trong tab mới, không gửi referrer.
6. Print Receipt: kiểm tra preview/Save as PDF có đầy đủ summary và QR, không có
   sidebar/form nhập liệu. Quét QR trên bản in hoặc PDF phóng đủ kích thước.
7. Test Submit lỗi bằng chế độ sai tổng/số lượng bằng 0: không có POST Receipt/QR
   mới. Trên phiên sạch không xuất hiện Payment Success.
8. Test Receipt lỗi: sau khi trang đã tải, cấu hình mock/network để chỉ POST Receipt
   lỗi 503 hoặc mất phản hồi. Invoice vẫn hiển thị, có Retry Receipt. Khôi phục API,
   bấm Retry: chỉ Receipt POST được gọi với cùng invoiceId/requestId; không có
   Transaction POST mới. MongoDB chỉ có một receipt_access cho request đó.
9. Test Public GET lỗi sau khi Receipt đã issue: Retry chỉ GET lại, không POST thêm.
10. Rerender (sửa form), thao tác lại hoặc refresh trang không được gửi POST ngoài
    thao tác Submit/Retry có chủ đích. Refresh xóa state POS và không tự gửi lại.
11. Kiểm tra desktop và mobile 390px: QR đủ lớn, URL xuống dòng, table có thể cuộn,
    các nút Copy/Open/Print sử dụng được; không tràn ngang toàn trang.

## Kiểm thử tự động và build

```powershell
npm.cmd run test:transaction
npm.cmd run lint
npm.cmd run build
```

Browser tests dùng Playwright/Chromium và API mock trong fixture riêng:

```powershell
$env:PLAYWRIGHT_BROWSERS_PATH = 'D:\DoAnTotNghiep\frontend\node_modules\.cache\ms-playwright'
npx.cmd playwright install chromium
npm.cmd run test:receipt:browser
```

Fixture ở tests/receipt không phải route hoặc entry point production. Dữ liệu và
JWT fixture chỉ dùng trong test, không gửi đến backend thật. Browser test gồm QR
SVG thực sự được rasterize và giải mã bằng jsQR, Copy Link, bản in, retry với cùng
requestId không tạo invoice mới, Submit lỗi không issue, refresh không POST và
viewport mobile. Ảnh kiểm tra lưu trong test-results, được gitignore.

Thư viện qrcode (runtime) là phần cần thêm để tạo QR; jsqr và @playwright/test chỉ
là dev dependencies cho giải mã độc lập và kiểm thử trình duyệt. Nguồn API thư viện:
https://github.com/soldair/node-qrcode và https://github.com/cozmo/jsQR.

## Kết quả xác minh 14/11/2026

- Unit test: 18/18 đạt, gồm 8 test Receipt mới và 10 test Transaction/POS hiện có.
  QR matrix được jsQR giải mã độc lập đúng nguyên URL backend.
- Playwright Chromium: 4/4 đạt. Đã rasterize SVG trên trình duyệt rồi giải mã,
  xác nhận Copy Link chính xác, link mở đúng URL, Print chỉ chứa Receipt và QR,
  Receipt retry giữ requestId/không POST Transaction lại, Submit lỗi không issue,
  public GET không có Authorization, refresh không POST và viewport mobile 390px.
- Đã sửa grid min-content gây tràn ngang mobile, chạy lại browser tests đạt.
  Đã xem trực tiếp ảnh desktop, mobile và print trong test-results.
- `npm run lint`: exit 0, không có error; còn 12 warning ở module có sẵn
  (TenantProvider/role/customer/dashboard), không sửa ngoài phạm vi.
- `npm run build` cuối: thành công, Vite 8.3.5; JS khoảng 567 kB (gzip 168 kB),
  CSS 33.26 kB. Còn cảnh báo chunk vượt 500 kB, không ảnh hưởng build.
- Node/npm chạy ngoài sandbox sau khi được phép vì runtime gặp EPERM trong
  sandbox. Npm cache và Chromium nằm trong frontend, không đọc POS secret.
- Browser tests dùng API mock trong fixture riêng, chưa xác minh với phiên
  Keycloak/backend thật hoặc camera điện thoại/máy in vật lý. Các bước LAN/QR
  và in trên môi trường thực tế ở trên cần người dùng chạy để đối chiếu.

## File thay đổi

Tạo dưới src/features/transaction:

- api/receipt.api.js
- lib/receiptFlow.js
- lib/receiptQr.js
- lib/receipt.test.js
- components/PaymentSuccess.jsx
- components/ReceiptQRCode.jsx
- components/ReceiptSummary.jsx
- components/ReceiptPrintView.jsx

Tạo playwright.receipt.config.js, tests/receipt/fixture.html,
tests/receipt/fixture.jsx, tests/receipt/receipt.spec.js và tài liệu này.
Sửa PosSimulatorPage.jsx, transaction.css, package.json, package-lock.json và
.gitignore (cache/tool reports). Không xóa file. Không sửa backend/CoreBE/CoreFE
hoặc module ngoài transaction; API contract Task 1 giữ nguyên.
