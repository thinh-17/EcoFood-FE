import test from "node:test";
import assert from "node:assert/strict";
import { feedbackIdentity, feedbackSeverity, feedbackText } from "./feedbackSeverity.js";

test("actionable client failures display warnings while service/network failures display errors", () => {
  for (const status of [400,401,403,404,409,422,429]) assert.equal(feedbackSeverity({ response: { status } }), "warning");
  for (const status of [500,502,503]) assert.equal(feedbackSeverity({ response: { status } }), "error");
  assert.equal(feedbackSeverity(new Error("Network error")), "error");
});
test("equivalent failures from polling have stable identities and changed failures remain distinguishable", () => {
  const failure = () => ({ response: { status: 429, data: { message: "Active complaint limit reached" } }, message: "Request failed" });
  assert.equal(feedbackIdentity(failure()), feedbackIdentity(failure()));
  assert.notEqual(feedbackIdentity(failure()), feedbackIdentity({ response: { status: 403 }, message: "Forbidden" }));
  assert.equal(feedbackIdentity("Validation failed"), "Validation failed");
});
test("Vietnamese server captions use English fallbacks while existing English and user content are preserved", () => {
  const error = { response: { status: 409, data: { message: "Dữ liệu đã thay đổi" } } };
  assert.equal(feedbackText("Dữ liệu đã thay đổi", error), "This record has changed. Refresh before trying again.");
  assert.equal(feedbackText("My complaint description: món ăn chưa chín", error), "My complaint description: món ăn chưa chín");
  assert.equal(feedbackText("Active complaint limit reached", { response: { status: 429 } }), "Active complaint limit reached");
});
