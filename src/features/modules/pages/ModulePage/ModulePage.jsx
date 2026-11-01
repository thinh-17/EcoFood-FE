import "./ModulePage.css";

import { useNavigate } from "react-router-dom";

import { FiTool } from "react-icons/fi";

import {
  CoreButton,
  CorePageHeader,
  CoreEmptyState,
} from "@thinh-17/fe-core";

import { ROUTES } from "../../../../constants/routes.js";

export function ModulePage({
  title,
  description,
}) {
  const navigate = useNavigate();

  return (
    <div className="eco-module-page">
      <CorePageHeader
        eyebrow="EcoFood Platform"
        title={title}
        description={description}
      />

      <CoreEmptyState
        icon={FiTool}
        title={`${title} is under development`}
        description={
          "Routing and navigation for this module are already set up. " +
          "Business features will be integrated " +
          "in upcoming phases."
        }
      >
        <CoreButton
          variant="primary"
          onClick={() => navigate(ROUTES.HOME)}
        >
          Back to Home
        </CoreButton>
      </CoreEmptyState>
    </div>
  );
}