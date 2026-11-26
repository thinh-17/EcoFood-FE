import { CoreCard, CorePageHeader } from "@thinh-17/fe-core";
export function DashboardAccessDenied({ title }) {
  return <section className="eco-module-page">
    <CorePageHeader eyebrow="EcoFood Platform" title={title} />
    <CoreCard><p role="alert">You do not have permission to access this dashboard.</p></CoreCard>
  </section>;
}
