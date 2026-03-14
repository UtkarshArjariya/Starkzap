import React from "react";
import ReactDOM from "react-dom/client";
import "@/index.css";
import App from "@/App";

// Suppress unhandled errors thrown by browser wallet extensions.
// These come from chrome-extension:// scripts injected into the page
// (Braavos, Argent X) and are NOT errors in our application.
window.addEventListener("error", (event) => {
  const src = event.filename || "";
  if (src.startsWith("chrome-extension://") || src.startsWith("moz-extension://")) {
    event.preventDefault();
    event.stopImmediatePropagation();
    return false;
  }
});
window.addEventListener("unhandledrejection", (event) => {
  const stack = event.reason?.stack || "";
  if (
    stack.includes("chrome-extension://") ||
    stack.includes("moz-extension://") ||
    event.reason?.message?.includes("Key ring is empty") ||
    event.reason?.message?.includes("TRPCClientError")
  ) {
    event.preventDefault();
    return false;
  }
});

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
