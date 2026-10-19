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
        title={`${title} đang được phát triển`}
        description={
          "Module đã được cấu hình routing và navigation. " +
          "Các chức năng nghiệp vụ sẽ được tích hợp " +
          "trong những giai đoạn tiếp theo."
        }
      >
        <CoreButton
          variant="primary"
          onClick={() => navigate(ROUTES.HOME)}
        >
          Quay về Home
        </CoreButton>
      </CoreEmptyState>
    </div>
  );
}