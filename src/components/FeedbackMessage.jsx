import { CoreFeedbackMessage } from "@thinh-17/fe-core";
import { Children } from "react";
import { FiAlertCircle, FiAlertTriangle } from "react-icons/fi";
import { feedbackIdentity, feedbackSeverity, feedbackText } from "../lib/feedbackSeverity.js";
import "./FeedbackMessage.css";

/**
 * Application adapter; content and API error mapping remain owned by each feature.
 * fe-core renders the "View error" / "View warning" trigger as a plain secondary
 * button — the wrapper gives it the app's tone colour and icon (see
 * FeedbackMessage.css) without changing fe-core or how the dialog opens.
 */
export function FeedbackMessage({ children,error,tone,title }) {
  const resolvedTone = tone || feedbackSeverity(error);
  const Icon = resolvedTone === "warning" ? FiAlertTriangle : FiAlertCircle;
  return <span className={`eco-feedback-trigger eco-feedback-trigger--${resolvedTone === "warning" ? "warning" : "error"}`}>
    <Icon className="eco-feedback-trigger__icon" aria-hidden="true" />
    <CoreFeedbackMessage tone={resolvedTone} title={title}
      notificationKey={feedbackIdentity(error) || (typeof children === "string" ? children : undefined)}>
      {Children.map(children, child => feedbackText(child, error))}
    </CoreFeedbackMessage>
  </span>;
}
