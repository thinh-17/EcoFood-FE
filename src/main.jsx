import React from "react";
import { createRoot } from "react-dom/client";

import "@thinh-17/fe-core/style.css";

import { AppProviders } from "./app/AppProviders/AppProviders.jsx";

import { AppRouter } from "./app/AppRouter/AppRouter.jsx";

import "./index.css";

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <AppProviders>
      <AppRouter />
    </AppProviders>
  </React.StrictMode>
);