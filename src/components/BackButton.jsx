import { Link } from "react-router-dom";
import { CoreBackButton } from "@thinh-17/fe-core";

export function BackButton({ to, onClick, children = "Back", disabled = false }) {
  return <CoreBackButton as={to ? Link : "button"} to={to} onClick={onClick} disabled={disabled}>{children}</CoreBackButton>;
}
