/** Shared vector mark and wordmark for staff and customer navigation. */
export function EcoFoodBrand({ subtitle = "MULTI-TENANT PLATFORM" }) {
  return <>
    <span className="eco-brand__icon" aria-hidden="true">
      <img src={`${import.meta.env.BASE_URL}ecofood-logo.svg`} width="32" height="32" alt="" />
    </span>
    <span className="eco-brand__name eco-nav-label">
      <strong>Eco<span className="eco-brand__wordmark">Food</span></strong>
      <small>{subtitle}</small>
    </span>
  </>;
}
