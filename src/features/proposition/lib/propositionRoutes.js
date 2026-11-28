// URL shape for the Proposition area — every Proposition, Plan and Sale
// Orchestrator opened from a list has its own /{id} URL, so refresh, the
// browser Back button and shared links all land on the same screen.
//   /product-library/propositions                                   list
//   /product-library/propositions/new                               create
//   /product-library/propositions/:propositionId[?tab=…]            detail
//   /product-library/propositions/:propositionId/edit               edit
//   /product-library/propositions/:propositionId/plans/new          create Plan
//   /product-library/propositions/:propositionId/plans/:planId      Plan
//   /product-library/propositions/:propositionId/sale-orchestrators/new
//   /product-library/propositions/:propositionId/sale-orchestrators/:orchestratorId
import { ROUTES } from "../../../constants/routes.js";

const BASE = ROUTES.PROPOSITIONS;
const seg = (value) => encodeURIComponent(value);

// Detail-page tabs (PropositionDetail's TABS ids); "plans" is the default
// and is left out of the URL.
export const PROPOSITION_TABS = ["plans", "orchestrator", "upload-transaction"];
export const DEFAULT_PROPOSITION_TAB = PROPOSITION_TABS[0];

export const propositionPaths = {
  list: () => BASE,
  create: () => `${BASE}/new`,
  detail: (id, tab) =>
    `${BASE}/${seg(id)}${tab && tab !== DEFAULT_PROPOSITION_TAB ? `?tab=${seg(tab)}` : ""}`,
  edit: (id) => `${BASE}/${seg(id)}/edit`,
  plan: (id, planId) => `${BASE}/${seg(id)}/plans/${planId ? seg(planId) : "new"}`,
  saleOrchestrator: (id, orchestratorId) =>
    `${BASE}/${seg(id)}/sale-orchestrators/${orchestratorId ? seg(orchestratorId) : "new"}`,
};

/** The active detail tab from a `?tab=` query string; unknown values fall back to the default. */
export function tabFromSearch(search) {
  const tab = new URLSearchParams(search ?? "").get("tab");
  return PROPOSITION_TABS.includes(tab) ? tab : DEFAULT_PROPOSITION_TAB;
}
