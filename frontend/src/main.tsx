import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";

// Legacy-style Capacitor environment detection for robust native plugin support
if (typeof window !== "undefined" && (window as any).Capacitor) {
  (window as any).isCapacitor = true;
  (window as any).platform = (window as any).Capacitor.getPlatform();
  (window as any).isNative = (window as any).platform !== "web";
}

import { CapacitorEnvProvider } from "./utils/CapacitorEnvContext";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <CapacitorEnvProvider>
      <App />
    </CapacitorEnvProvider>
  </React.StrictMode>
);
