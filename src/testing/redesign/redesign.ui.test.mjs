import test from "node:test";
import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
const { chromium } = await import("playwright").catch(() => import(new URL("../../../.cache/ui/node_modules/playwright/index.mjs", import.meta.url)));
const base = process.env.REDESIGN_UI_TEST_URL || "http://127.0.0.1:5190";
const fixture = `${base}/src/testing/redesign/harness.html`;
const pageData = (content) => ({ content, page: 0, number: 0, size: 20, totalElements: content.length, hasNext: false });

async function setup(browser, options = {}) {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  page.setDefaultTimeout(12000);
  const errors = [], requests = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.route("**/api/**", async (route) => {
    const url = new URL(route.request().url()), path = url.pathname;
    if (!path.startsWith("/api/")) return route.continue();
    requests.push({ path, method: route.request().method(), authorization: route.request().headers().authorization });
    let body = pageData([]), status = 200;
    if (path === "/api/v1/users/eligible-tenants") body = [{ tenantId: "tenant-a", tenantName: "Test Enterprise", tenantCode: "A" }, { tenantId: "tenant-b", tenantName: "Second Enterprise", tenantCode: "B" }];
    else if (path === "/api/v1/notifications/capabilities") body = { read: options.denied !== true, retry: true };
    else if (path === "/api/v1/notifications") {
      if (options.notificationError) { status = 500; body = {}; }
      else body = pageData(options.empty ? [] : Array.from({ length: 15 }, (_, index) => ({ id: `delivery-${index}`, type: "COMPLAINT_CREATED", subject: `Delivery ${index}`, sendTo: "test@example.org", status: index ? "SENT" : "FAILED", createdAt: "2026-11-27T00:00:00Z", lastError: index ? null : "SMTP_OUTCOME_UNCERTAIN", deliveryUncertain: !index })));
    } else if (path.endsWith("/retry")) body = { status: "RETRY_PENDING" };
    else if (path.startsWith("/api/v1/notifications/")) body = { id: "delivery-0", type: "COMPLAINT_CREATED", subject: "Delivery detail", content: "<script>unsafe()</script>", sendFrom: "sender@example.org", sendTo: "test@example.org", status: "FAILED", submissionId: "submission-test", totalAttempts: 2, lastError: "SMTP_OUTCOME_UNCERTAIN" };
    else if (path === "/api/v1/products") body = pageData([{ id: "product-1", code: "P001", name: "Test product", type: "STANDALONE", category: "Food", version: 1, status: "APPROVED" }]);
    else if (path === "/api/v1/transactions") body = pageData([{ id: "invoice-1", invoiceNumber: "INV-TEST", totalAmount: 100, currency: "USD", status: "ACCEPTED", paymentStatus: "PAID" }]);
    else if (path === "/api/v1/transactions/invoice-1") body = { id: "invoice-1", invoiceNumber: "INV-TEST", totalAmount: 100, currency: "USD", items: [] };
    else if (path === "/api/v1/tenants/root") body = { id: "root", domainUrl: "ecofood.test" };
    else if (path === "/api/v1/tenants") body = [];
    else if (path === "/api/v1/audit-events/actors") body = [];
    else if (["/api/v1/roles/directory", "/api/v1/permissions/directory", "/api/v1/groups/directory"].includes(path)) body = [];
    else if (path === "/api/v1/roles/role-1/permissions") body = { permissions: [] };
    else if (path === "/api/v1/tenants/tenant-a") body = { id: "tenant-a", tenantName: "Test Enterprise", partnerTypeCode: "ENTERPRISE", tenantType: "MASTER_TENANT", domainUrl: "enterprise.ecofood.test" };
    else if (path === "/api/v1/users/user-1") body = { id: "user-1", username: "test-user", email: "test@example.org", firstName: "Test", lastName: "User", userCategoryCode: "PARTNER", tenantAssignments: [] };
    else if (path === "/api/v1/roles/role-1") body = { id: "role-1", name: "Test role", code: "TEST_ROLE", roleType: "Functional" };
    else if (path === "/api/v1/permissions/permission-1") body = { id: "permission-1", name: "Test permission", code: "TEST_PERMISSION", description: "Test" };
    else if (path === "/api/v1/data-access-rules/rule-1") body = { id: "rule-1", ruleName: "Test rule", businessEntityName: "Test Enterprise", description: "Test", accessEntityType: "Product", accessLevel: "FULL_ACCESS", editable: false };
    else if (path === "/api/v1/propositions/options") body = { canCreate: true, defaultCurrency: "USD", brands: [], distributionPartners: [] };
    else if (path === "/api/v1/complaints/capabilities") body = { types: ["TENANT", "ECOSYSTEM"], read: true };
    else if (path === "/api/v1/complaints/complaint-1") body = {
      complaint: { id: "29e04cb4dbd7f82d077a612355de349a99075d0c362727c5b41fc642664339ea", subject: "lag", description: "lag", complaintType: "ECOSYSTEM", status: "RESOLVED", assignedTo: "6ae9f45eba03d21cd070ddb9", revision: 1,
        events: [
          { id: "e1", eventType: "CREATED", newStatus: "SUBMITTED", createdAt: "2026-11-27T00:44:16Z", note: "Complaint submitted" },
          { id: "e2", eventType: "ACCEPTED", previousStatus: "SUBMITTED", newStatus: "IN_PROGRESS", createdAt: "2026-11-27T00:45:37Z", note: "Assignee: UNASSIGNED -> 6ae9f45eba03d21cd070ddb9\nfixed" },
          { id: "e3", eventType: "ADMIN_REPLIED", previousStatus: "IN_PROGRESS", newStatus: "IN_PROGRESS", createdAt: "2026-11-27T00:45:59Z", note: "fixxed" },
          { id: "e4", eventType: "RESOLVED", previousStatus: "IN_PROGRESS", newStatus: "RESOLVED", createdAt: "2026-11-27T00:46:49Z", note: "aaa" },
        ] }, customerName: "", handling: { transitions: ["CLOSED"] },
    };
    else if (path === "/api/v1/customers/me/complaints" || path === "/api/v1/customers/me/complaints/customer-complaint") {
      const complaint = { id: "customer-complaint", subject: "Service follow-up", description: "Please check my order.", complaintType: "TENANT", status: "IN_PROGRESS", revision: 1, events: [
        { id: "customer-created", eventType: "CREATED", newStatus: "SUBMITTED", createdAt: "2026-11-27T00:00:00Z", note: "Complaint submitted" },
        { id: "customer-accepted", eventType: "ACCEPTED", previousStatus: "SUBMITTED", newStatus: "IN_PROGRESS", createdAt: "2026-11-27T01:00:00Z", note: "Assignee: UNASSIGNED -> private-handler-id\nWe have started processing your complaint." },
      ] };
      if (options.customerUpdatesDenied) { status = 403; body = {}; }
      else if (route.request().method() === "POST" && options.complaintLimit) { status = 429; body = { message: "Each account can have a maximum of 3 active complaints at a time" }; }
      else body = path.endsWith("customer-complaint") ? complaint : pageData(options.customerUpdatesEmpty ? [] : [complaint]);
    }
    else if (path === "/api/v1/customers/me") body = { id: "customer", tenantId: "tenant-a", firstName: "Test", lastName: "Customer", email: "customer@example.org", username: "customer", revision: 0 };
    else if (path.startsWith("/api/v1/dashboard/")) {
      if (options.dashboardDenied) { status = 403; body = { message: "Data scope denied" }; }
      else if (path.endsWith("/filters")) body = { currentTenantId: "tenant-a", tenants: [{ id: "tenant-a", name: "Test Enterprise" }], propositions: [], currencies: ["USD"], years: [2026], partnerComparisonAllowed: false };
      else {
        const metrics = Object.fromEntries(["totalSalesVolume", "profit", "ingredientCost", "platformCost"].map((name) => [name, { actual: 100, expected: 90, unit: name === "totalSalesVolume" ? "PLAN" : "USD", variance: 10, variancePercent: 11, achievementPercent: 111, actualStatus: "COMPLETE", expectedStatus: "CONFIGURED" }]));
        const summary = { metrics, selection: { year: 2026, period: "QUARTERLY", quarter: 4 }, lastUpdatedAt: "2026-11-27T00:00:00Z" };
        body = path.endsWith("/summary") ? summary : path.endsWith("/trends") ? [summary] : { byTenant: [], byProposition: [] };
      }
    }
    await route.fulfill({ status, contentType: "application/json", body: JSON.stringify(body) });
  });
  return { page, requests, errors };
}

test("redesign: navigation, scoped notifications, responsive pages and unchanged actions", async (t) => {
  const browser = await chromium.launch({ headless: true });
  await mkdir("test-results/redesign", { recursive: true });
  try {
    await t.test("complaint quota shows an English warning popup and preserves form input", async () => {
      const { page, requests, errors } = await setup(browser, { complaintLimit: true });
      await page.goto(`${fixture}?mode=customer&route=/customer/complaints`);
      await page.getByRole("button", { name: "New complaint", exact: true }).click();
      await page.getByLabel("Subject", { exact: true }).fill("Keep this subject");
      await page.getByLabel("Description", { exact: true }).fill("Keep this description");
      await page.getByRole("button", { name: "Submit complaint", exact: true }).click();
      const popup = page.getByRole("alertdialog", { name: "Warning", exact: true });
      await popup.getByText(/limit of 3 active complaints/).waitFor();
      assert.equal(await popup.evaluate(el => el.contains(document.activeElement)), true);
      await page.screenshot({ path: "test-results/redesign/feedback-warning-desktop.png", fullPage: true });
      await page.setViewportSize({ width: 390, height: 844 });
      const bounds = await popup.boundingBox(); assert.ok(bounds.x >= 0 && bounds.x + bounds.width <= 390);
      await page.screenshot({ path: "test-results/redesign/feedback-warning-mobile.png", fullPage: true });
      await popup.getByRole("button", { name: "Got it", exact: true }).click();
      assert.equal(await page.getByLabel("Subject", { exact: true }).inputValue(), "Keep this subject");
      assert.equal(await page.locator('form.complaint-form textarea[maxlength="10000"]').inputValue(), "Keep this description");
      const reopen = page.getByRole("button", { name: "View warning", exact: true });
      await reopen.click(); await popup.waitFor(); await page.keyboard.press("Escape");
      assert.equal(await reopen.evaluate(el => el === document.activeElement), true);
      assert.equal(requests.filter(r => r.path === "/api/v1/customers/me/complaints" && r.method === "POST").length, 1);
      assert.deepEqual(errors, []); await page.close();
    });
    await t.test("server failure uses Error popup and existing Retry action recovers", async () => {
      const { page, errors } = await setup(browser);
      let fail = true;
      await page.route("**/api/v1/products**", async route => {
        if (new URL(route.request().url()).pathname !== "/api/v1/products" || !fail) return route.fallback();
        await route.fulfill({ status: 500, contentType: "application/json", body: JSON.stringify({ message: "Product service is unavailable." }) });
      });
      await page.goto(`${fixture}?route=/product-library/products`);
      const popup = page.getByRole("alertdialog", { name: "Error", exact: true });
      await popup.getByText("Product service is unavailable.", { exact: false }).waitFor();
      await page.screenshot({ path: "test-results/redesign/feedback-error-desktop.png", fullPage: true });
      fail = false;
      await popup.getByRole("button", { name: "Retry", exact: true }).click();
      await popup.waitFor({ state: "hidden" });
      await page.getByText("Test product", { exact: true }).waitFor();
      assert.deepEqual(errors, []); await page.close();
    });
    await t.test("feedback queues concurrent failures and does not reopen the same dismissed error", async () => {
      const { page, errors } = await setup(browser);
      await page.goto(`${fixture}?route=/account`);
      await page.getByRole("heading", { name: "Account", exact: true }).waitFor();
      await page.evaluate(() => window.renderFeedbackTest(true));
      const warning = page.getByRole("alertdialog", { name: "Warning", exact: true });
      await warning.waitFor(); assert.equal(await page.getByRole("alertdialog").count(), 1);
      await warning.getByRole("button", { name: "Got it", exact: true }).click();
      const error = page.getByRole("alertdialog", { name: "Error", exact: true });
      await error.getByText("The service is unavailable. Please try again.", { exact: true }).waitFor();
      await page.keyboard.press("Tab");
      assert.equal(await error.evaluate(el => el.contains(document.activeElement)), true);
      await error.getByRole("button", { name: "Got it", exact: true }).click();
      await page.evaluate(async () => { window.renderFeedbackTest(true); await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))); });
      assert.equal(await page.getByRole("alertdialog").count(), 0);
      await page.getByRole("button", { name: "View error", exact: true }).click();
      await error.waitFor(); await page.keyboard.press("Escape");
      assert.deepEqual(errors, []); await page.close();
    });
    await t.test("customer receives complaint acceptance, uses own API and opens existing details", async () => {
      const { page, requests, errors } = await setup(browser);
      await page.goto(`${fixture}?mode=customer&route=/customer/complaints`);
      const bell = page.getByRole("button", { name: "Complaint updates", exact: true });
      await bell.click();
      const panel = page.getByRole("dialog", { name: "Complaint updates", exact: true });
      await panel.getByText("Complaint accepted", { exact: true }).waitFor();
      assert.equal(await panel.getByText("Service team", { exact: true }).count(), 1);
      assert.equal(await panel.getByText("private-handler-id", { exact: false }).count(), 0);
      assert.equal(requests.filter(r => r.path === "/api/v1/customers/me/complaints").length, 1);
      assert.equal(requests.some(r => r.path.startsWith("/api/v1/notifications") || r.path === "/api/v1/complaints/capabilities"), false);
      await page.screenshot({ path: "test-results/redesign/customer-complaint-updates-desktop.png", fullPage: true });
      await page.keyboard.press("Escape");
      assert.equal(await bell.evaluate(el => el === document.activeElement), true);
      await bell.click();
      await page.setViewportSize({ width: 390, height: 844 });
      const box = await panel.boundingBox();
      assert.ok(box.x >= 0 && box.x + box.width <= 390);
      await page.screenshot({ path: "test-results/redesign/customer-complaint-updates-mobile.png", fullPage: true });
      await panel.getByRole("link", { name: /Complaint accepted/ }).click();
      await page.getByRole("heading", { name: "Service follow-up", exact: true }).waitFor();
      assert.equal(await panel.count(), 0);
      assert.equal(new URL(page.url()).searchParams.get("complaintId"), "customer-complaint");
      await page.route("**/api/v1/customers/me/complaints/customer-complaint", route => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ id: "customer-complaint", subject: "Updated complaint details", description: "Latest response", complaintType: "TENANT", status: "IN_PROGRESS", revision: 2, events: [] }) }));
      await bell.click();
      await panel.getByRole("link", { name: /Complaint accepted/ }).click();
      await page.getByRole("heading", { name: "Updated complaint details", exact: true }).waitFor();
      assert.deepEqual(errors, []); await page.close();
    });
    await t.test("customer complaint updates preserve empty and denied states", async () => {
      for (const options of [{ customerUpdatesEmpty: true }, { customerUpdatesDenied: true }]) {
        const { page, errors } = await setup(browser, options);
        await page.goto(`${fixture}?mode=customer&route=/customer/profile`);
        await page.getByRole("button", { name: "Complaint updates", exact: true }).click();
        const panel = page.getByRole("dialog", { name: "Complaint updates", exact: true });
        if (options.customerUpdatesEmpty) await panel.getByRole("heading", { name: "No updates yet" }).waitFor();
        else { await page.getByRole("alertdialog").waitFor(); assert.equal(await panel.locator(".customer-complaint-updates__item").count(), 0); }
        await page.keyboard.press("Escape");
        assert.deepEqual(errors, []); await page.close();
      }
    });
    await t.test("404 route preserves tenant fallback and works on mobile", async () => {
      const { page, errors } = await setup(browser);
      await page.goto(`${fixture}?route=/404`);
      await page.getByRole("heading", { name: "This page could not be found", exact: true }).waitFor();
      assert.equal(await page.locator(".eco-sidebar").count(), 0);
      await page.screenshot({ path: "test-results/redesign/not-found-desktop.png", fullPage: true });
      await page.setViewportSize({ width: 390, height: 844 });
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
      await page.screenshot({ path: "test-results/redesign/not-found-mobile.png", fullPage: true });
      await page.getByRole("link", { name: "Back to Home", exact: true }).click();
      await page.locator(".eco-page-toggle").first().waitFor();
      await page.goto(`${fixture}?route=/existing-subtenant-suffix`);
      await page.locator(".eco-page-toggle").first().waitFor();
      await page.waitForURL(url => /\/harness\.html\/?$/.test(url.pathname));
      assert.deepEqual(errors, []); await page.close();
    });
    await t.test("loading page and pending table use shared UI without changing data flow", async () => {
      const { page, errors } = await setup(browser);
      await page.goto(`${fixture}?preview=loading`);
      await page.getByRole("status").filter({ hasText: "Preparing your workspace" }).waitFor();
      await page.screenshot({ path: "test-results/redesign/loading-desktop.png", fullPage: true });
      await page.setViewportSize({ width: 390, height: 844 });
      await page.emulateMedia({ reducedMotion: "reduce" });
      assert.equal(await page.locator(".fe-loading__indicator svg").evaluate(el => getComputedStyle(el).animationName), "none");
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
      await page.screenshot({ path: "test-results/redesign/loading-mobile.png", fullPage: true });
      let release;
      const pending = new Promise(resolve => { release = resolve; });
      await page.route("**/api/v1/products**", async route => {
        if (new URL(route.request().url()).pathname !== "/api/v1/products") return route.fallback();
        await pending;
        await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(pageData([])) });
      });
      try {
        await page.goto(`${fixture}?route=/product-library/products`);
        await page.locator(".fe-table .fe-loading").waitFor();
        assert.equal(await page.locator(".fe-table .fe-loading").getAttribute("role"), "status");
      } finally { release(); }
      await page.locator(".fe-table .fe-loading").waitFor({ state: "hidden" });
      await page.getByRole("heading", { name: "No products found", exact: true }).waitFor();
      assert.deepEqual(errors, []); await page.close();
    });
    await t.test("flat authorized navigation, footer order and nested active routes", async () => {
      const { page, errors } = await setup(browser);
      await page.goto(`${fixture}?route=/product-library/products`);
      await page.getByRole("heading", { name: "Products", exact: true }).waitFor();
      assert.equal(await page.locator(".eco-admin-shell .eco-topbar").count(), 0);
      assert.equal(await page.getByRole("link", { name: "Publish External API", exact: true }).count(), 0);
      assert.equal(await page.locator('.eco-sidebar__nav a[href$="/notifications"]').count(), 0);
      const footer = page.locator(".eco-sidebar__footer");
      assert.deepEqual(await footer.locator(":scope > *").evaluateAll((items) => items.map((item) => item.textContent.trim().replace(/\s+/g, " "))), ["Account", "Current TenantTest Enterprise", "Log out"]);
      const expanded = await page.locator(".eco-content").boundingBox();
      await page.getByRole("button", { name: "Collapse sidebar", exact: true }).click();
      const collapsed = await page.locator(".eco-content").boundingBox();
      assert.ok(collapsed.width > expanded.width);
      assert.equal(await page.getByRole("link", { name: "Products", exact: true }).getAttribute("aria-current"), "page");
      await page.getByRole("button", { name: "Expand sidebar", exact: true }).click();
      await page.getByRole("button", { name: "Create Product", exact: true }).click();
      assert.equal(await page.getByRole("link", { name: "Products", exact: true }).getAttribute("aria-current"), "page");
      await page.getByRole("button", { name: "Next", exact: true }).click();
      await page.getByRole("button", { name: "Next", exact: true }).click();
      await page.getByRole("alertdialog").waitFor();
      assert.equal(await page.getByRole("button", { name: "Submit for review", exact: true }).count(), 0);
      assert.deepEqual(errors, []); await page.close();
    });
    await t.test("popup overlays without resetting page state; details, Escape and focus", async () => {
      const { page, errors } = await setup(browser);
      await page.goto(`${fixture}?route=/product-library/products`);
      await page.getByPlaceholder("Search name or code...").fill("kept search");
      const before = await page.locator(".eco-content").boundingBox();
      const bell = page.getByRole("button", { name: "Notifications", exact: true });
      await bell.click();
      await page.locator(".eco-notification-item").first().waitFor();
      assert.equal(await page.locator(".eco-notification-item").count(), 10);
      assert.deepEqual(await page.locator(".eco-content").boundingBox(), before);
      assert.equal(await page.getByPlaceholder("Search name or code...").inputValue(), "kept search");
      await page.screenshot({ path: "test-results/redesign/notifications-desktop.png" });
      await page.locator(".eco-notification-item").first().click();
      await page.getByRole("dialog", { name: "Notification details", exact: true }).waitFor();
      await page.getByText("<script>unsafe()</script>", { exact: true }).waitFor();
      assert.equal(await page.locator(".notification-detail script").count(), 0);
      await page.keyboard.press("Escape");
      assert.equal(await page.locator(".notification-detail-dialog").count(), 0);
      assert.equal(await bell.evaluate((element) => document.activeElement === element), true);
      await bell.click(); await page.keyboard.press("Escape");
      assert.equal(await page.locator("#notification-popup").count(), 0);
      await bell.click(); await page.locator(".eco-content").click({ position: { x: 900, y: 600 } });
      assert.equal(await page.locator("#notification-popup").count(), 0);
      assert.deepEqual(errors, []); await page.close();
    });
    await t.test("view all keeps full delivery history and duplicate retry confirmation", async () => {
      const { page, requests, errors } = await setup(browser);
      await page.goto(fixture); await page.getByRole("button", { name: "Notifications", exact: true }).click();
      await page.getByRole("button", { name: "View all notifications", exact: true }).click();
      await page.getByRole("heading", { name: "Notifications", exact: true }).waitFor();
      assert.equal(await page.locator("#notification-popup").count(), 0);
      const retry = page.getByRole("button", { name: "Retry", exact: true });
      await retry.waitFor();
      page.once("dialog", (dialog) => dialog.dismiss()); await retry.click();
      assert.equal(requests.filter((r) => r.path.endsWith("/retry")).length, 0);
      page.once("dialog", (dialog) => dialog.accept());
      await Promise.all([page.waitForResponse((response) => response.url().endsWith("/delivery-0/retry")), retry.click()]);
      assert.equal(requests.filter((r) => r.path.endsWith("/retry")).length, 1);
      assert.deepEqual(errors, []); await page.close();
    });
    await t.test("tenant identity changes close popup and do not reuse previous tenant history", async () => {
      const { page, requests } = await setup(browser);
      await page.goto(fixture); await page.getByRole("button", { name: "Notifications", exact: true }).click();
      await page.locator(".eco-notification-item").first().waitFor();
      const before = requests.filter((r) => r.path === "/api/v1/notifications").length;
      await page.evaluate(() => window.setTestIdentity("tenant-b"));
      assert.equal(await page.locator("#notification-popup").count(), 0);
      await page.getByRole("button", { name: "Notifications", exact: true }).click();
      await page.locator(".eco-notification-item").first().waitFor();
      assert.ok(requests.filter((r) => r.path === "/api/v1/notifications").length > before);
      await page.close();
    });
    await t.test("popup shares the full page query and polling timer", async () => {
      const { page, requests } = await setup(browser);
      await page.clock.install();
      await page.goto(`${fixture}?route=/notifications`);
      await page.getByRole("button", { name: "Delivery details", exact: true }).first().waitFor();
      const before = requests.filter((r) => r.path === "/api/v1/notifications").length;
      await page.getByRole("button", { name: "Notifications", exact: true }).click();
      await page.locator(".eco-notification-item").first().waitFor();
      assert.equal(requests.filter((r) => r.path === "/api/v1/notifications").length, before);
      await Promise.all([page.waitForResponse((response) => new URL(response.url()).pathname === "/api/v1/notifications"), page.clock.fastForward(15001)]);
      assert.equal(requests.filter((r) => r.path === "/api/v1/notifications").length, before + 1);
      await page.close();
    });
    await t.test("permission denied, empty and error notification states", async () => {
      for (const options of [{ denied: true }, { empty: true }, { notificationError: true }]) {
        const { page, requests } = await setup(browser, options);
        await page.goto(fixture); await page.getByRole("button", { name: "Notifications", exact: true }).click();
        if (options.denied) { await page.getByText("You do not have notification access in this tenant.").waitFor(); assert.equal(requests.some((r) => r.path === "/api/v1/notifications"), false); }
        if (options.empty) await page.getByText("No notifications yet.").waitFor();
        if (options.notificationError) await page.getByRole("button", { name: "Try again", exact: true }).waitFor();
        await page.close();
      }
      const { page, requests } = await setup(browser);
      await page.goto(`${fixture}?mode=employee`);
      await page.getByRole("heading", { name: "Welcome to EcoFood", exact: true }).waitFor();
      assert.equal(await page.getByRole("button", { name: "Notifications", exact: true }).count(), 0);
      assert.equal(requests.some((r) => r.path.includes("/notifications")), false);
      assert.equal(await page.getByRole("navigation", { name: "Main navigation" }).getByRole("link", { name: "Users", exact: true }).count(), 0);
      await page.close();
    });
    await t.test("KPI selection, invoice details and data access denial keep manager tabs", async () => {
      const { page, errors } = await setup(browser);
      await page.goto(`${fixture}?route=/manager`);
      await page.getByTestId("kpi-profit").click();
      assert.equal(await page.getByTestId("kpi-profit").getAttribute("aria-pressed"), "true");
      assert.equal(await page.getByLabel("Chart metric").inputValue(), "profit");
      await page.screenshot({ path: "test-results/redesign/dashboard-desktop.png", fullPage: true });
      await page.getByRole("tab", { name: "Invoice", exact: true }).click();
      await page.getByRole("button", { name: "View", exact: true }).click();
      await page.getByRole("dialog", { name: "Invoice details", exact: true }).waitFor();
      assert.deepEqual(errors, []); await page.close();
      const restricted = await setup(browser, { dashboardDenied: true });
      await restricted.page.goto(`${fixture}?route=/manager`);
      await restricted.page.getByRole("alertdialog").waitFor();
      assert.equal(await restricted.page.getByRole("tab", { name: "Dashboard", exact: true }).count(), 1);
      assert.equal(await restricted.page.getByTestId("kpi-profit").count(), 0);
      await restricted.page.close();
    });
    await t.test("mobile drawer, popup fit and no page overflow across feature routes", async () => {
      const { page, errors } = await setup(browser);
      await page.setViewportSize({ width: 390, height: 844 });
      for (const path of ["/", "/manager", "/partner/tenants", "/partner/tenants/onboarding", "/product-library/products", "/product-library/products/new", "/product-library/propositions", "/complaints", "/notifications", "/users", "/users/data-access-rules", "/audit-log", "/account"]) {
        await page.goto(`${fixture}?route=${encodeURIComponent(path)}`);
        await page.locator(".eco-page-toggle").first().waitFor().catch(async (error) => {
          await page.screenshot({ path: "test-results/redesign/mobile-failure.png", fullPage: true });
          throw new Error(`${path}: ${error.message}; page errors: ${errors.join(", ")}`);
        });
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, path);
      }
      await page.getByRole("button", { name: "Open navigation", exact: true }).click();
      await page.getByRole("button", { name: "Notifications", exact: true }).click();
      await page.locator(".eco-notification-item").first().waitFor();
      const box = await page.locator("#notification-popup").boundingBox();
      assert.ok(box.x >= 0 && box.x + box.width <= 390);
      await page.screenshot({ path: "test-results/redesign/notifications-mobile.png" });
      await page.keyboard.press("Escape");
      assert.equal(await page.locator("#notification-popup").count(), 0);
      await page.keyboard.press("Escape");
      assert.equal(await page.locator(".eco-shell--mobile-open").count(), 0);
      assert.deepEqual(errors, []); await page.close();
    });
    await t.test("customer portal retains separate navigation and mobile profile", async () => {
      const { page, errors } = await setup(browser);
      await page.setViewportSize({ width: 390, height: 844 });
      await page.goto(`${fixture}?mode=customer&route=/customer/profile`);
      await page.getByLabel("First name", { exact: true }).waitFor();
      assert.equal(await page.locator(".eco-admin-shell").count(), 0);
      assert.equal(await page.locator(".customer-shell").count(), 1);
      assert.equal(await page.getByLabel("Email", { exact: true }).getAttribute("readonly"), "");
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
      await page.screenshot({ path: "test-results/redesign/customer-mobile.png", fullPage: true });
      assert.deepEqual(errors, []); await page.close();
    });
    await t.test("access administration and tenant tabs preserve read-only fields on mobile", async () => {
      const { page, errors } = await setup(browser);
      await page.setViewportSize({ width: 390, height: 844 });
      for (const path of ["/users/roles", "/users/permissions", "/users/roles/role-1", "/users/permissions/permission-1", "/users/user-1", "/users/data-access-rules/rule-1", "/partner/tenants/tenant-a"]) {
        await page.goto(`${fixture}?mode=eco&route=${encodeURIComponent(path)}`);
        await page.locator(".eco-page-toggle").first().waitFor();
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, path);
        if (path === "/users/user-1") { await page.getByLabel("Username", { exact: true }).waitFor(); assert.equal(await page.getByLabel("Username", { exact: true }).isDisabled(), true); }
        if (path === "/users/data-access-rules/rule-1") { await page.getByLabel("Rule Name*", { exact: true }).waitFor(); assert.equal(await page.getByLabel("Rule Name*", { exact: true }).isDisabled(), true); }
        if (path === "/users/roles/role-1") { await page.getByRole("tab", { name: "Permissions", exact: true }).click(); await page.getByRole("button", { name: "Save", exact: true }).waitFor(); }
        if (path === "/partner/tenants/tenant-a") {
          await page.getByRole("tab", { name: "Configuration", exact: true }).click();
          assert.equal(await page.getByLabel("Domain", { exact: true }).isDisabled(), true);
          await page.getByRole("tab", { name: "Contact", exact: true }).click();
          await page.getByLabel("Contact first name", { exact: true }).waitFor();
          assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
        }
      }
      await page.getByRole("button", { name: "Open navigation", exact: true }).click();
      const footer = await page.locator(".eco-sidebar__footer").boundingBox();
      assert.ok(footer.y + footer.height <= 844);
      assert.equal(await page.locator(".eco-sidebar__nav").evaluate((element) => element.scrollHeight > element.clientHeight), true);
      assert.deepEqual(errors, []); await page.close();
    });
    await t.test("complaint details, timeline and response layout preserve notes and fit mobile", async () => {
      const { page, errors } = await setup(browser);
      await page.goto(`${fixture}?mode=eco&route=${encodeURIComponent("/complaints?complaintId=complaint-1")}`);
      await page.getByRole("heading", { name: "lag", exact: true }).waitFor();
      await page.getByText("Not provided", { exact: true }).waitFor();
      assert.equal(await page.locator(".fe-timeline__item").count(), 4);
      assert.equal(await page.locator(".complaint-history__unchanged").innerText(), "Status unchanged");
      assert.equal(await page.locator(".complaint-history__assignee").count(), 1);
      assert.equal(await page.getByText("fixed", { exact: true }).count(), 1);
      const response = page.getByLabel("Response / outcome", { exact: true });
      assert.equal(await page.getByRole("button", { name: "Close complaint", exact: true }).isDisabled(), true);
      await response.fill("Outcome retained");
      assert.equal(await page.getByRole("button", { name: "Close complaint", exact: true }).isEnabled(), true);
      await page.screenshot({ path: "test-results/redesign/complaint-detail-desktop.png", fullPage: true });
      await page.setViewportSize({ width: 390, height: 844 });
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
      await page.screenshot({ path: "test-results/redesign/complaint-detail-mobile.png", fullPage: true });
      await page.getByRole("button", { name: "Back to complaints", exact: true }).click();
      await page.getByRole("navigation", { name: "Complaint pagination", exact: true }).waitFor();
      assert.deepEqual(errors, []); await page.close();
    });
    await t.test("back links stay within their tab and loading captions use English", async () => {
      const { page, errors } = await setup(browser);
      await page.goto(`${fixture}?route=/product-library/products/new`);
      await page.getByRole("link", { name: "Back to products", exact: true }).click();
      await page.getByRole("heading", { name: "Products", exact: true }).waitFor();
      await page.goto(`${fixture}?mode=eco&route=/users/roles/role-1`);
      await page.getByRole("link", { name: "Back to roles", exact: true }).click();
      await page.getByRole("heading", { name: "Roles", exact: true }).waitFor();
      assert.equal(await page.getByRole("link", { name: "Back to users", exact: true }).count(), 0);
      await page.evaluate(() => window.renderLoadingButton());
      const loading = page.getByRole("button", { name: "Processing…", exact: true });
      await loading.waitFor(); assert.equal(await loading.isDisabled(), true); assert.equal(await loading.getAttribute("aria-busy"), "true");
      assert.deepEqual(errors, []); await page.close();
    });
  } finally { await browser.close(); }
});
