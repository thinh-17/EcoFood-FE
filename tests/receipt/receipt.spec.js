import { test, expect } from "@playwright/test";

const invoiceId = "abcdef000000000000000001";
const receiptUrl = `http://127.0.0.1:5175/receipt?token=${"a".repeat(43)}`;

async function setup(page, { failSubmit = false, failIssueOnce = false } = {}) {
  const calls = { submit: 0, issue: [], publicAuthorization: [], payload: null };
  await page.route("https://fonts.googleapis.com/**", (route) => route.fulfill({ body: "", contentType: "text/css" }));
  await page.route("**/api/v1/**", async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    if (url.pathname === "/api/v1/transactions" && request.method() === "POST") {
      calls.submit++; calls.payload = request.postDataJSON();
      return route.fulfill({ status: failSubmit ? 400 : 201, json: failSubmit ? { message: "Invoice total does not match items" }
        : { id: invoiceId, invoiceNumber: calls.payload.invoiceNumber, status: "ACCEPTED", receivedAt: new Date().toISOString() } });
    }
    if (url.pathname === `/api/v1/transactions/${invoiceId}/receipts`) {
      calls.issue.push(request.postDataJSON());
      if (failIssueOnce && calls.issue.length === 1) return route.fulfill({ status: 503, json: { message: "Sale Orchestrator provider unavailable" } });
      return route.fulfill({ json: { receiptId: "b".repeat(64), invoiceId, receiptUrl, expiresAt: "2099-01-01T00:00:00Z" } });
    }
    if (url.pathname === "/api/v1/public/receipts") {
      calls.publicAuthorization.push(request.headers().authorization);
      return route.fulfill({ json: { ...calls.payload, distributionPartner: "DP-BROWSER-001" } });
    }
    return route.fulfill({ status: 404, json: { message: "Unexpected test request" } });
  });
  await page.goto("/tests/receipt/fixture.html");
  return calls;
}

async function pay(page) {
  await page.getByLabel("Mã sản phẩm", { exact: true }).fill("P001");
  await page.getByLabel("Tên sản phẩm", { exact: true }).fill("Sữa thử QR");
  await page.getByLabel("Đơn giá · VND", { exact: true }).fill("10000");
  await page.getByRole("button", { name: "Thêm vào danh mục thử", exact: true }).click();
  await page.getByRole("button", { name: "Thêm sản phẩm", exact: true }).click();
  await page.getByLabel("Số lượng dòng 1", { exact: true }).fill("2");
  await page.getByRole("button", { name: "Gửi giao dịch", exact: true }).click();
}

test("success: exact QR URL, authoritative summary, copy/open link and printable receipt", async ({ page, context }) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  const calls = await setup(page);
  await pay(page);
  await expect(page.getByRole("heading", { name: "Thanh toán thành công" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Print Receipt" })).toBeEnabled();
  const result = page.getByRole("region", { name: "Kết quả thanh toán" });
  await expect(result.getByText("DP-BROWSER-001", { exact: true })).toBeVisible();
  expect(await page.evaluate(() => window.decodeRenderedReceiptQR())).toBe(receiptUrl);
  await expect(result.getByRole("link", { name: "Mở Digital Receipt" })).toHaveAttribute("href", receiptUrl);
  await result.getByRole("button", { name: "Copy Link" }).click();
  await expect(result.getByRole("status").filter({ hasText: "Đã sao chép" })).toBeVisible();
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(receiptUrl);
  await page.evaluate(() => { window.print = () => { window.receiptPrinted = true; }; });
  await page.getByRole("button", { name: "Print Receipt" }).click();
  expect(await page.evaluate(() => window.receiptPrinted)).toBe(true);
  await page.screenshot({ path: "test-results/receipt-desktop.png", fullPage: true });
  await page.emulateMedia({ media: "print" });
  const print = page.locator(".receipt-print-root");
  await expect(print).toBeVisible();
  await expect(print).toContainText("DP-BROWSER-001");
  await expect(print).toContainText("Sữa thử QR");
  await expect(print.locator("svg")).toBeVisible();
  await expect(print).toContainText(receiptUrl);
  await expect(page.locator("#root")).toBeHidden();
  await page.screenshot({ path: "test-results/receipt-print.png", fullPage: true });
  expect(calls.submit).toBe(1); expect(calls.issue).toHaveLength(1);
  expect(calls.publicAuthorization).toEqual([undefined]);
});

test("Receipt failure preserves paid Invoice; rapid Retry reuses requestId and never submits again", async ({ page }) => {
  const calls = await setup(page, { failIssueOnce: true });
  await pay(page);
  await expect(page.getByRole("button", { name: "Retry Receipt" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Thanh toán thành công" })).toBeVisible();
  await page.getByRole("button", { name: "Retry Receipt" }).click();
  await expect(page.getByRole("button", { name: "Print Receipt" })).toBeEnabled();
  expect(calls.submit).toBe(1); expect(calls.issue).toHaveLength(2);
  expect(calls.issue[0]).toEqual(calls.issue[1]);
  await page.getByLabel("Số lượng dòng 1", { exact: true }).fill("9");
  await expect(page.getByRole("region", { name: "Kết quả thanh toán" }).getByRole("cell", { name: "2", exact: true })).toBeVisible();
  expect(calls.issue).toHaveLength(2);
});

test("failed submission never issues a receipt or renders a QR", async ({ page }) => {
  const calls = await setup(page, { failSubmit: true });
  await pay(page);
  await expect(page.getByRole("alert").filter({ hasText: "Invoice total does not match items" })).toBeVisible();
  expect(calls.issue).toHaveLength(0);
  await expect(page.locator(".receipt-qr-panel svg")).toHaveCount(0);
});

test("mobile layout stays inside viewport and refresh does not send POST requests", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const calls = await setup(page);
  await pay(page);
  await expect(page.getByRole("button", { name: "Print Receipt" })).toBeEnabled();
  const qr = page.locator(".receipt-qr-panel svg");
  await expect(qr).toBeVisible();
  await page.screenshot({ path: "test-results/receipt-mobile.png", fullPage: true });
  const geometry = await page.evaluate(() => ({ width: window.innerWidth, scrollWidth: document.documentElement.scrollWidth,
    outside: [...document.querySelectorAll("body *")].filter((el) => el.getBoundingClientRect().right > window.innerWidth + 1)
      .slice(0, 12).map((el) => ({ tag: el.tagName, class: el.className, width: el.getBoundingClientRect().width })) }));
  expect(geometry.scrollWidth, JSON.stringify(geometry)).toBeLessThanOrEqual(geometry.width);
  const box = await qr.boundingBox(); expect(box.width).toBeGreaterThanOrEqual(240);
  await page.screenshot({ path: "test-results/receipt-mobile.png", fullPage: true });
  await page.reload();
  await expect(page.getByRole("heading", { name: "POS Simulator" })).toBeVisible();
  expect(calls.submit).toBe(1); expect(calls.issue).toHaveLength(1);
  await expect(page.locator(".receipt-qr-panel svg")).toHaveCount(0);
});
