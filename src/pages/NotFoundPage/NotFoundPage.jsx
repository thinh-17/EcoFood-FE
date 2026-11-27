import "./NotFoundPage.css";

import { Link } from "react-router-dom";
import { CoreNotFoundState } from "@thinh-17/fe-core";
import { FiHome } from "react-icons/fi";
import { EcoFoodBrand } from "../../components/EcoFoodBrand.jsx";

import { ROUTES } from "../../constants/routes.js";

export function NotFoundPage() {
  return (
    <div className="eco-not-found-page">
      <header><Link className="eco-brand" to={ROUTES.HOME} aria-label="EcoFood Home"><EcoFoodBrand /></Link></header>
      <main><CoreNotFoundState actions={
        <Link className="fe-button fe-button--primary fe-button--md" to={ROUTES.HOME}><FiHome aria-hidden="true" />Back to Home</Link>
      } /></main>
      <footer>EcoFood · Multi-tenant platform</footer>
    </div>
  );
}
