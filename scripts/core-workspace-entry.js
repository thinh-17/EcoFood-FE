// Local workspace integration only; feature code imports the public package API.
// Keep the installed package's newer APIs (e.g. Select/Toggle/ExpansionPanel).
// Override only the shared UI components maintained in the adjacent core source.
export * from "../node_modules/@thinh-17/fe-core/dist/index.js";
export { CoreButton, CoreFormActions, CoreTable, CoreBackButton, CorePagination, CoreStatusBadge, CoreTimeline, CoreLoadingState, CoreNotFoundState, CorePopover, CoreFeedbackDialog, CoreFeedbackProvider, CoreFeedbackMessage }
  from "../../corefe/src/index.js";
