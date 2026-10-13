import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App.jsx";
import { AuthProvider } from "./features/auth/AuthProvider.jsx";
import "./styles/global.css";
import "./app.css";
import { registerPwa } from "./pwa.js";

registerPwa();

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <AuthProvider><App /></AuthProvider>
  </React.StrictMode>,
);
