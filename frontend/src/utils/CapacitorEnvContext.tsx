import React, { createContext, useContext, useEffect, useState, ReactNode } from "react";

interface CapacitorEnv {
  isCapacitor: boolean;
  platform: string | undefined;
  isNative: boolean;
  Capacitor: any;
}

const getCapacitorEnv = (): CapacitorEnv => {
  const cap = (typeof window !== "undefined" && (window as any).Capacitor) || undefined;
  const platform =
    cap && typeof cap.getPlatform === "function" ? cap.getPlatform() : undefined;
  return {
    isCapacitor: !!cap,
    platform,
    isNative: !!cap && platform !== "web",
    Capacitor: cap,
  };
};

const CapacitorEnvContext = createContext<CapacitorEnv>(getCapacitorEnv());

export const CapacitorEnvProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [env, setEnv] = useState<CapacitorEnv>(getCapacitorEnv());

  useEffect(() => {
    // Update env if Capacitor becomes available after hydration
    const updateEnv = () => setEnv(getCapacitorEnv());
    if (typeof window !== "undefined") {
      // Listen for possible changes (e.g., after plugins load)
      window.addEventListener("capacitorReady", updateEnv);
      // Initial check
      updateEnv();
      return () => {
        window.removeEventListener("capacitorReady", updateEnv);
      };
    }
  }, []);

  return (
    <CapacitorEnvContext.Provider value={env}>
      {children}
    </CapacitorEnvContext.Provider>
  );
};

export const useCapacitorEnv = () => useContext(CapacitorEnvContext);
