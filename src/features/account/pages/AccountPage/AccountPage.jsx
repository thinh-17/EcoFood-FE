import { FiAlertCircle } from "react-icons/fi";
import { useQuery } from "@tanstack/react-query";

import { CoreCard, CoreEmptyState, CoreLoadingState, CoreStatusBadge } from "@thinh-17/fe-core";
import { PageHeader as CorePageHeader } from "../../../../components/PageHeader.jsx";
import { useAuthStore } from "../../../auth/store/authStore.js";
import { decodeJwt } from "../../../auth/lib/jwt.js";
import { getUserById } from "../../../user/api/user.api.js";
import "./AccountPage.css";

// The internal access token's own claims (see InternalTokenService.buildBaseClaims)
// carry email/roles already, but not firstName/lastName — those only live on
// the UserDetailResponse backing GET /api/v1/users/{id}, so this page still
// needs one read of the user's own record (sub = userId).
function currentClaims(token) {
  try {
    return token ? decodeJwt(token) : {};
  } catch {
    return {};
  }
}

export function AccountPage() {
  const token = useAuthStore((s) => s.internalAccessToken);
  const claims = currentClaims(token);
  const userId = claims.sub;
  const roles = claims.roles ?? [];

  const profile = useQuery({
    queryKey: ["account-profile", userId],
    queryFn: () => getUserById(userId),
    enabled: !!userId,
  });

  return (
    <div className="eco-account-page">
      <CorePageHeader title="Account" description="Your account information. Read-only." />

      {profile.isPending ? (
        <CoreLoadingState title="Loading account" />
      ) : profile.isError ? (
        <CoreEmptyState
          icon={FiAlertCircle}
          title="Unable to load account"
          description="Something went wrong loading your account information. Please try again later."
        />
      ) : (
        <CoreCard title="Profile" description="Managed by your organization's administrator.">
          <div className="fe-detail-grid">
            <div className="fe-detail-field">
              <span className="fe-detail-field__label">First name</span>
              <span className="fe-detail-field__value">{profile.data.firstName || "—"}</span>
            </div>
            <div className="fe-detail-field">
              <span className="fe-detail-field__label">Last name</span>
              <span className="fe-detail-field__value">{profile.data.lastName || "—"}</span>
            </div>
            <div className="fe-detail-field">
              <span className="fe-detail-field__label">Email</span>
              <span className="fe-detail-field__value">{profile.data.email || "—"}</span>
            </div>
            <div className="fe-detail-field">
              <span className="fe-detail-field__label">Role</span>
              <span className="fe-detail-field__value account-roles">
                {roles.length ? (
                  roles.map((role) => <CoreStatusBadge key={role} tone="info" label={role} />)
                ) : (
                  "—"
                )}
              </span>
            </div>
          </div>
        </CoreCard>
      )}
    </div>
  );
}
