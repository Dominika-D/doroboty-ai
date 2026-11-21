import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { initAnalytics } from "./lib/analytics";
import { App } from "./features/prototype/app";
import "./app/globals.css";
initAnalytics();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
