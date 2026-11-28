import { FiAlertCircle, FiBriefcase, FiInfo, FiLock, FiMail, FiShield, FiUser } from "react-icons/fi";
import { useQuery } from "@tanstack/react-query";

import { CoreEmptyState, CoreLoadingState, CoreStatusBadge } from "@thinh-17/fe-core";
import { PageHeader as CorePageHeader } from "../../../../components/PageHeader.jsx";
import { useAuthStore } from "../../../auth/store/authStore.js";
import { decodeJwt } from "../../../auth/lib/jwt.js";
import { getUserById } from "../../../user/api/user.api.js";
import { accountDisplayName, accountInitials, accountMemberships, roleLabel } from "../../lib/account.lib.js";
import "./AccountPage.css";

// The internal access token's own claims (see InternalTokenService.buildBaseClaims)
// carry email/roles/tenant already, but not firstName/lastName — those only live on
// the UserDetailResponse backing GET /api/v1/users/{id}, so this page still
// needs one read of the user's own record (sub = userId).
function currentClaims(token) {
  try {
    return token ? decodeJwt(token) : {};
  } catch {
    return {};
  }
}

function Fact({ label, children }) {
  return (
    <div className="account-fact">
      <dt>{label}</dt>
      <dd>{children || <span className="account-muted">—</span>}</dd>
    </div>
  );
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
      <CorePageHeader title="Account" description="Your profile and workspace access." />

      {profile.isPending ? (
        <CoreLoadingState title="Loading account" />
      ) : profile.isError ? (
        <CoreEmptyState
          icon={FiAlertCircle}
          title="Unable to load account"
          description="Something went wrong loading your account information. Please try again later."
        />
      ) : (
        <AccountDetails user={profile.data} claims={claims} roles={roles} />
      )}
    </div>
  );
}

function AccountDetails({ user, claims, roles }) {
  const email = user.email || claims.email;
  const memberships = accountMemberships(user.tenantAssignments, claims.tenantId);
  const current = memberships.find((m) => m.current);
  return (
    <>
      <section className="account-panel account-hero" aria-label="Profile summary">
        <span className="account-avatar" aria-hidden="true">{accountInitials({ ...user, email })}</span>
        <div className="account-hero__title">
          <h2>{accountDisplayName({ ...user, email })}</h2>
          {email && <p><FiMail aria-hidden="true" /> {email}</p>}
          {current && <p><FiBriefcase aria-hidden="true" /> {current.tenantName}</p>}
        </div>
        <span className="account-readonly"><FiLock aria-hidden="true" /> Read-only</span>
      </section>

      <div className="account-grid">
        <section className="account-panel">
          <header className="account-panel__heading"><FiUser aria-hidden="true" /><h3>Personal information</h3></header>
          <dl className="account-facts">
            <Fact label="First name">{user.firstName}</Fact>
            <Fact label="Last name">{user.lastName}</Fact>
            <Fact label="Email">{email}</Fact>
            <Fact label="Username">{user.username || claims.code}</Fact>
          </dl>
        </section>

        <section className="account-panel">
          <header className="account-panel__heading"><FiShield aria-hidden="true" /><h3>Current workspace</h3></header>
          <dl className="account-facts">
            <Fact label="Workspace">{current?.tenantName}</Fact>
            <Fact label="Workspace code">{claims.tenantCode && <code>{claims.tenantCode}</code>}</Fact>
            <div className="account-fact account-fact--wide">
              <dt>Roles in this workspace</dt>
              <dd className="account-roles">
                {roles.length
                  ? roles.map((role) => <CoreStatusBadge key={role} tone="info" label={roleLabel(role)} title={role} />)
                  : <span className="account-muted">—</span>}
              </dd>
            </div>
          </dl>
        </section>
      </div>

      {memberships.length > 1 && (
        <section className="account-panel">
          <header className="account-panel__heading"><FiBriefcase aria-hidden="true" /><h3>Workspace memberships</h3><span>{memberships.length}</span></header>
          <ul className="account-memberships">
            {memberships.map((m) => (
              <li key={m.tenantId} className={m.current ? "is-current" : ""}>
                <div className="account-memberships__name">
                  <strong>{m.tenantName}</strong>
                  {m.current && <CoreStatusBadge tone="success" label="Current" />}
                </div>
                <div className="account-roles">
                  {m.roles.length ? m.roles.map((role) => <CoreStatusBadge key={role} tone="neutral" label={role} />) : <span className="account-muted">No roles</span>}
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      <p className="account-note"><FiInfo aria-hidden="true" /> Your profile is managed by your organization's administrator. Contact them to change these details.</p>
    </>
  );
}
