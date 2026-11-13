import { test, expect } from "@playwright/test";

const token = "a".repeat(43);
const url = `/receipt?token=${token}`;
const data = { invoiceNumber: "INV-GUEST-001", transactionTime: "2026-11-14T01:00:00Z", distributionPartner: "DP-GUEST-001",
  currency: "VND", totalAmount: 45000, items: [
    { productCode: "P1", productName: "Sữa tươi", quantity: 2, unitPrice: 10000, amount: 20000 },
    { productCode: "P2", productName: "Bánh mì", quantity: 1, unitPrice: 25000, amount: 25000 },
  ] };

async function mockGuest(context, handler) {
  const requests = [];
  await context.route("**/api/v1/**", async (route) => {
    const request = route.request(); requests.push(request);
    if (new URL(request.url()).pathname !== "/api/v1/public/receipts") {
      return route.fulfill({ status: 500, json: { message: "Unexpected auth/tenant request" } });
    }
    if (handler) return handler(route, requests);
    return route.fulfill({ json: data });
  });
  return requests;
}

test("direct Guest route bypasses auth and tenant bootstrap, shows actual data and refreshes", async ({ page, context }) => {
  await context.addCookies([{ name: "pos-cookie", value: "must-not-be-forwarded", domain: "127.0.0.1", path: "/", httpOnly: true }]);
  const external = [];
  page.on("request", (request) => {
    if (!request.url().startsWith("http://127.0.0.1:5175")) external.push(request.url());
  });
  const requests = await mockGuest(context);
  await page.goto(url);
  await expect(page.getByRole("heading", { name: data.distributionPartner })).toBeVisible();
  await expect(page.getByText(data.invoiceNumber, { exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Sữa tươi" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Bánh mì" })).toBeVisible();
  await expect(page.getByText("Chưa có thông tin riêng")).toBeVisible();
  await expect(page.getByRole("navigation")).toHaveCount(0);
  await expect(page.getByRole("link")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "In hóa đơn" })).toBeEnabled();
  await page.reload();
  await expect(page.getByText(data.invoiceNumber, { exact: true })).toBeVisible();
  expect(requests.length).toBeGreaterThanOrEqual(2);
  for (const request of requests) {
    expect(request.headers().authorization).toBeUndefined();
    expect(request.headers().cookie).toBeUndefined();
    expect(request.headers().referer).toBeUndefined();
    expect([...new URL(request.url()).searchParams.keys()]).toEqual(["token"]);
  }
  expect(external).toEqual([]);
  expect(await page.evaluate(() => JSON.stringify({ ...localStorage, ...sessionStorage }))).not.toContain(token);
  await page.screenshot({ path: "test-results/guest-desktop.png", fullPage: true });
  await page.evaluate(() => { window.print = () => { window.guestPrintCalled = true; }; });
  await page.getByRole("button", { name: "In hóa đơn" }).click();
  expect(await page.evaluate(() => window.guestPrintCalled)).toBe(true);
  await page.emulateMedia({ media: "print" });
  await expect(page.locator(".guest-receipt__future")).toBeHidden();
  await expect(page.getByRole("button", { name: "In hóa đơn" })).toBeHidden();
  await expect(page.getByText(data.invoiceNumber, { exact: true })).toBeVisible();
  await page.screenshot({ path: "test-results/guest-print.png", fullPage: true });
});

test("loading state, then responsive success on phone and tablet", async ({ page, context }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  let release;
  const pending = new Promise((resolve) => { release = resolve; });
  await mockGuest(context, async (route) => { await pending; return route.fulfill({ json: data }); });
  await page.goto(url);
  await expect(page.getByRole("status")).toContainText("Đang tải hóa đơn");
  release();
  await expect(page.getByRole("heading", { name: data.distributionPartner })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.screenshot({ path: "test-results/guest-mobile.png", fullPage: true });
  await page.setViewportSize({ width: 768, height: 1024 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});

test("missing or malformed token is rejected locally without any API/auth request", async ({ page, context }) => {
  const requests = await mockGuest(context);
  for (const suffix of ["", "?token=bad", `?token=${token}&token=${token}`]) {
    await page.goto("/receipt" + suffix);
    await expect(page.getByRole("heading", { name: "Liên kết không hợp lệ" })).toBeVisible();
    await expect(page.getByText(data.invoiceNumber, { exact: true })).toHaveCount(0);
  }
  expect(requests).toHaveLength(0);
});

test("invalid, expired, revoked and missing Invoice all show safe unavailable message", async ({ page, context }) => {
  await mockGuest(context, (route) => route.fulfill({ status: 404, json: { message: "Receipt unavailable" } }));
  await page.goto(url);
  await expect(page.getByRole("heading", { name: "Hóa đơn không khả dụng" })).toBeVisible();
  await expect(page.getByText(/đã hết hạn, bị thu hồi/)).toBeVisible();
  await expect(page.getByRole("button", { name: "In hóa đơn" })).toHaveCount(0);
  await expect(page.getByText(data.invoiceNumber, { exact: true })).toHaveCount(0);
});

test("network failure allows Retry and never redirects to login", async ({ page, context }) => {
  let fail = true;
  await mockGuest(context, (route) => fail ? route.abort("failed") : route.fulfill({ json: data }));
  await page.goto(url);
  await expect(page.getByRole("heading", { name: "Không thể kết nối" })).toBeVisible();
  fail = false;
  await page.getByRole("button", { name: "Thử lại" }).click();
  await expect(page.getByText(data.invoiceNumber, { exact: true })).toBeVisible();
  await expect(page).toHaveURL(new RegExp("/receipt\\?token="));
});

test("token navigation clears previous Invoice and never renders stale data", async ({ page, context }) => {
  await mockGuest(context, (route) => new URL(route.request().url()).searchParams.get("token") === token
    ? route.fulfill({ json: data }) : route.fulfill({ status: 404, json: { message: "Receipt unavailable" } }));
  await page.goto(url);
  await expect(page.getByText(data.invoiceNumber, { exact: true })).toBeVisible();
  await page.goto(`/receipt?token=${"b".repeat(43)}`);
  await expect(page.getByRole("heading", { name: "Hóa đơn không khả dụng" })).toBeVisible();
  await expect(page.getByText(data.invoiceNumber, { exact: true })).toHaveCount(0);
});

test("POS QR opens the same paid Invoice in a fresh anonymous Customer browser context", async ({ page, context, browser }) => {
  let payload;
  const receiptUrl = `http://127.0.0.1:5175${url}`;
  await context.route("**/api/v1/**", async (route) => {
    const path = new URL(route.request().url()).pathname;
    if (path === "/api/v1/transactions") {
      payload = route.request().postDataJSON();
      return route.fulfill({ status: 201, json: { id: "abcdef000000000000000001", invoiceNumber: payload.invoiceNumber,
        status: "ACCEPTED", receivedAt: new Date().toISOString() } });
    }
    if (path.endsWith("/receipts") && route.request().method() === "POST") {
      return route.fulfill({ json: { receiptId: "b".repeat(64), invoiceId: "abcdef000000000000000001", receiptUrl, expiresAt: "2099-01-01T00:00:00Z" } });
    }
    return route.fulfill({ json: { ...payload, distributionPartner: "DP-END-TO-END" } });
  });
  await page.goto("/tests/receipt/fixture.html");
  await page.getByLabel("Mã sản phẩm", { exact: true }).fill("P1");
  await page.getByLabel("Tên sản phẩm", { exact: true }).fill("Sản phẩm quét QR");
  await page.getByLabel("Đơn giá · VND", { exact: true }).fill("10000");
  await page.getByRole("button", { name: "Thêm vào danh mục thử", exact: true }).click();
  await page.getByRole("button", { name: "Thêm sản phẩm", exact: true }).click();
  await page.getByLabel("Số lượng dòng 1").fill("2");
  await page.getByRole("button", { name: "Gửi giao dịch", exact: true }).click();
  await expect(page.getByRole("button", { name: "Print Receipt" })).toBeEnabled();
  const decoded = await page.evaluate(() => window.decodeRenderedReceiptQR());
  expect(decoded).toBe(receiptUrl);
  const customer = await browser.newContext({ viewport: { width: 390, height: 844 } });
  try {
    const requests = await mockGuest(customer, (route) => route.fulfill({ json: { ...payload, distributionPartner: "DP-END-TO-END" } }));
    const guest = await customer.newPage();
    await guest.goto(decoded);
    await expect(guest.getByText(payload.invoiceNumber, { exact: true })).toBeVisible();
    await expect(guest.getByRole("heading", { name: "Sản phẩm quét QR" })).toBeVisible();
    await expect(guest.getByRole("heading", { name: "DP-END-TO-END" })).toBeVisible();
    for (const request of requests) expect(request.headers().authorization).toBeUndefined();
  } finally { await customer.close(); }
});

test("same-origin Vite Guest proxy reads HTTP backend without CORS or auth bootstrap", async ({ page }) => {
  await page.goto(`/receipt?token=${"c".repeat(43)}`);
  await expect(page.getByText("INV-REAL-PROXY", { exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "DP-PROXY" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Sản phẩm qua proxy" })).toBeVisible();
});
