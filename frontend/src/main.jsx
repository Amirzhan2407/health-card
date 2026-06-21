import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";

// Intercept all fetch requests to inject Authorization and x-organization-id
const originalFetch = window.fetch;
window.fetch = async function (url, options = {}) {
  const token = localStorage.getItem("organizationToken");
  const orgUserStr = localStorage.getItem("organizationUser");
  
  options.headers = options.headers || {};
  if (token) {
    if (options.headers instanceof Headers) {
      options.headers.set("Authorization", `Bearer ${token}`);
    } else {
      options.headers["Authorization"] = `Bearer ${token}`;
    }
  }
  if (orgUserStr) {
    try {
      const orgUser = JSON.parse(orgUserStr);
      if (orgUser && orgUser.organization_id) {
        if (options.headers instanceof Headers) {
          options.headers.set("x-organization-id", orgUser.organization_id);
        } else {
          options.headers["x-organization-id"] = orgUser.organization_id;
        }
      }
    } catch (e) {}
  }
  return originalFetch(url, options);
};

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
);