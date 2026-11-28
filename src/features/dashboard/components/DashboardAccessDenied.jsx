import { CoreCard } from "@thinh-17/fe-core";
import { PageHeader as CorePageHeader } from "../../../components/PageHeader.jsx";
export function DashboardNoAccess() {
  return <div role="alert"><h2>No access</h2><p>You do not have permission to access this dashboard for the selected tenant scope.</p></div>;
}
export function DashboardAccessDenied({ title }) {
  return <section className="eco-module-page">
    <CorePageHeader eyebrow="EcoFood Platform" title={title} />
    <CoreCard><DashboardNoAccess /></CoreCard>
  </section>;
}
