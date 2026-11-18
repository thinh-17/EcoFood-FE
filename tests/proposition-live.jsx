// Opt-in test against real Spring HTTP and an isolated Mongo database; no API mocks.
import React from "react";
import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import "@thinh-17/fe-core/style.css";
import "../src/index.css";
import { PropositionDirectory } from "../src/features/proposition/pages/PropositionPage.jsx";
import { apiClient } from "../src/services/apiClient.js";
import { useAuthStore } from "../src/features/auth/store/authStore.js";
const pause = () => new Promise((resolve) => setTimeout(resolve, 100));
const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};
async function until(find, message) {
  for (let count = 0; count < 150; count++) {
    const found = find();
    if (found) return found;
    await pause();
  }
  throw new Error(message);
}
const button = (text) =>
  [...document.querySelectorAll("button")].find(
    (element) => element.textContent.trim() === text,
  );
async function click(text) {
  const target = await until(() => button(text), `Missing button: ${text}`);
  assert(!target.disabled, `Disabled button: ${text}`);
  target.click();
  await pause();
}
const field = (text) =>
  [...document.querySelectorAll("label")]
    .find((label) => label.textContent.trim().startsWith(text))
    ?.querySelector("input,select,textarea") ??
  [...document.querySelectorAll("input[aria-label]")].find(
    (element) => element.getAttribute("aria-label") === text,
  );
async function fill(label, value) {
  const element = await until(() => field(label), `Missing field: ${label}`);
  const prototype =
    element.tagName === "SELECT"
      ? HTMLSelectElement.prototype
      : element.tagName === "TEXTAREA"
        ? HTMLTextAreaElement.prototype
        : HTMLInputElement.prototype;
  Object.getOwnPropertyDescriptor(prototype, "value").set.call(element, value);
  element.dispatchEvent(
    new Event(element.tagName === "SELECT" ? "change" : "input", {
      bubbles: true,
    }),
  );
  await pause();
}
const check = async (label) => {
  const element = await until(() => field(label), `Missing checkbox: ${label}`);
  element.click();
  await pause();
};
try {
  const response = await fetch("/tests/proposition-live-config.json");
  assert(
    response.ok,
    "Run PropositionMongoIT to generate temporary test configuration.",
  );
  const fixture = await response.json();
  apiClient.defaults.baseURL = fixture.baseURL;
  useAuthStore.setState({
    internalAccessToken: fixture.token,
    tenantId: "integration",
    status: "authenticated",
  });
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  createRoot(document.getElementById("root")).render(
    <QueryClientProvider client={client}>
      <PropositionDirectory scope="real-backend-integration" />
    </QueryClientProvider>,
  );
  await click("Create Proposition");
  assert(
    !document.querySelector('[role="dialog"]'),
    "Creation stays in the page",
  );
  await until(
    () =>
      field("Approved ProductProcess")?.querySelector(
        `option[value="${fixture.processId}"]`,
      ),
    "Approved source version did not load",
  );
  await fill("Approved ProductProcess", fixture.processId);
  await fill("Proposition name", "Browser distribution");
  assert(
    document.querySelectorAll(".prop-revenue-table input").length === 12,
    "Default revenue period is 12 quarters",
  );
  await fill(
    document
      .querySelector(".prop-revenue-table input")
      .getAttribute("aria-label"),
    "1000",
  );
  await fill("enterprise profit share", "60");
  await fill("platform profit share", "10");
  await fill("Partner profit share", "30");
  await check("Integration Distributor");
  await click("Create Draft Proposition");
  await until(() => button("Edit Proposition"), "Create did not show detail");
  await click("Edit Proposition");
  await fill("Proposition name", "Browser distribution updated");
  await click("Save changes");
  await until(() => button("Edit Proposition"), "Edit failed");
  await click("Add Plan");
  await fill("Plan name", "Browser Vietnam Plan");
  await fill("Country of Sale", "VN");
  await check("Integration Distributor");
  await check("Set market pricing now");
  await fill("Sale price", "25.10");
  await fill("Tax (%)", "8");
  await fill("Additional fees", "1");
  await check("Confirm market configuration preview");
  await click("Save Draft Plan");
  await until(() => button("Edit Draft"), "Plan save failed");
  await click("Edit Draft");
  await fill("Plan name", "Browser Vietnam Plan updated");
  await check("Confirm market configuration preview");
  await click("Save Draft Plan");
  await until(() => button("Submit Plan for Review"), "Plan edit failed");
  await click("Submit Plan for Review");
  await click("Confirm");
  await until(() => button("Approve Plan"), "Plan submission failed");
  await click("Approve Plan");
  await click("Confirm");
  await until(
    () => document.querySelector(".prop-approved"),
    "Plan approval failed",
  );
  assert(
    document.body.textContent.includes("waiting for Proposition approval"),
    "Approved Plan stays inactive before Proposition approval",
  );
  await click("Submit Proposition for Review");
  await click("Confirm");
  await until(
    () => button("Approve Proposition"),
    "Proposition submission failed",
  );
  await click("Approve Proposition");
  await click("Confirm");
  await until(
    () =>
      !document.body.textContent.includes("waiting for Proposition approval"),
    "Proposition approval did not release the Plan",
  );
  assert(
    document.body.textContent.includes("USD 28.11"),
    "Server price is displayed",
  );
  assert(!button("Edit Draft"), "Approved Plan is read-only");
  await click("Back to Propositions");
  await click("Browser distribution updated");
  await until(
    () => document.querySelector(".prop-approved"),
    "Reload lost persisted approval",
  );
  assert(
    document.body.textContent.includes("Browser Vietnam Plan updated"),
    "Plan edits persisted",
  );
  document.body.dataset.testResult = "passed";
} catch (error) {
  document.body.dataset.testResult = "failed";
  const message = document.createElement("pre");
  message.textContent = error.stack;
  document.body.append(message);
} finally {
  useAuthStore.setState({ internalAccessToken: "" });
}
