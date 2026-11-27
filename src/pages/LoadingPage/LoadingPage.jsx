import { CoreLoadingState } from "@thinh-17/fe-core";
import "./LoadingPage.css";

export function LoadingPage({ title = "Preparing your workspace", description, fullscreen = false }) {
  return <div className={`eco-loading-page${fullscreen ? " eco-loading-page--fullscreen" : ""}`}>
    <CoreLoadingState variant="page" title={title} description={description} />
  </div>;
}
