import { useContext } from "react";
import { CorePageHeader } from "@thinh-17/fe-core";
import { FiMenu } from "react-icons/fi";
import { useInRouterContext, useLocation } from "react-router-dom";
import { BackButton } from "./BackButton.jsx";
import { backDestination } from "../app/navigation/backDestination.js";
import { SidebarContext } from "../layouts/MainLayout/SidebarContext.js";
import "./PageHeader.css";

export function PageHeader(props) {
  const routed = useInRouterContext();
  return routed ? <RoutedPageHeader {...props} /> : <CorePageHeader {...props} />;
}

function RoutedPageHeader({ backTo, onBack, backLabel, ...props }) {
  const sidebar = useContext(SidebarContext);
  const location = useLocation();
  const destination = backDestination(location.pathname, location.search);
  const back = backTo || onBack || destination;
  return <>
    {back && <div className="eco-page-back"><BackButton to={onBack ? undefined : backTo || destination?.to} onClick={onBack}>{backLabel || destination?.label || "Back"}</BackButton></div>}
    <div className="eco-page-heading">
    {sidebar && <button type="button" className="eco-page-toggle" aria-label="Open navigation" aria-controls="admin-sidebar"
      aria-expanded={sidebar.mobileOpen} onClick={sidebar.openMobile}><FiMenu size={19} /></button>
    }
    <CorePageHeader {...props} />
  </div></>;
}
