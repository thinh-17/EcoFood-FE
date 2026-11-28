import test from "node:test";
import assert from "node:assert/strict";
import { ROUTES } from "../../../constants/routes.js";
import { propositionPaths, tabFromSearch } from "./propositionRoutes.js";

test("Proposition, Plan and Sale Orchestrator each get their own /{id} URL", () => {
  assert.equal(propositionPaths.list(), ROUTES.PROPOSITIONS);
  assert.equal(propositionPaths.create(), "/product-library/propositions/new");
  assert.equal(propositionPaths.detail("p1"), "/product-library/propositions/p1");
  assert.equal(propositionPaths.edit("p1"), "/product-library/propositions/p1/edit");
  assert.equal(propositionPaths.plan("p1", "pl1"), "/product-library/propositions/p1/plans/pl1");
  assert.equal(propositionPaths.plan("p1"), "/product-library/propositions/p1/plans/new");
  assert.equal(propositionPaths.saleOrchestrator("p1", "o1"), "/product-library/propositions/p1/sale-orchestrators/o1");
  assert.equal(propositionPaths.saleOrchestrator("p1", null), "/product-library/propositions/p1/sale-orchestrators/new");
});

test("ids are URL-encoded", () => {
  assert.equal(propositionPaths.plan("a/b", "c d"), "/product-library/propositions/a%2Fb/plans/c%20d");
});

test("the detail tab round-trips through ?tab=, the default tab stays out of the URL", () => {
  assert.equal(propositionPaths.detail("p1", "plans"), "/product-library/propositions/p1");
  assert.equal(propositionPaths.detail("p1", "orchestrator"), "/product-library/propositions/p1?tab=orchestrator");
  assert.equal(tabFromSearch("?tab=orchestrator"), "orchestrator");
  assert.equal(tabFromSearch("?tab=upload-transaction"), "upload-transaction");
  assert.equal(tabFromSearch(""), "plans");
  assert.equal(tabFromSearch("?tab=unknown"), "plans");
});
