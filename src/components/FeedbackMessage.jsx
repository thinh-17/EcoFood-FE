import { CoreFeedbackMessage } from "@thinh-17/fe-core";
import { Children } from "react";
import { feedbackIdentity, feedbackSeverity, feedbackText } from "../lib/feedbackSeverity.js";

/** Application adapter; content and API error mapping remain owned by each feature. */
export function FeedbackMessage({ children,error,tone,title }) {
  return <CoreFeedbackMessage tone={tone || feedbackSeverity(error)} title={title}
    notificationKey={feedbackIdentity(error) || (typeof children === "string" ? children : undefined)}>
    {Children.map(children, child => feedbackText(child, error))}
  </CoreFeedbackMessage>;
}
