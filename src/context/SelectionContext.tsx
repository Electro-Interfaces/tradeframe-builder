import React, { createContext, useContext, useEffect, useState } from "react";

type SelectionContextValue = {
  selectedNetwork: string;
  setSelectedNetwork: (v: string) => void;
  selectedTradingPoint: string;
  setSelectedTradingPoint: (v: string) => void;
};

const SelectionContext = createContext<SelectionContextValue | undefined>(undefined);

export function SelectionProvider({ children }: { children: React.ReactNode }) {
  const [selectedNetwork, setSelectedNetwork] = useState<string>("");
  const [selectedTradingPoint, setSelectedTradingPoint] = useState<string>("");

  // Hydrate from localStorage on first mount
  useEffect(() => {
    try {
      const n = localStorage.getItem("tc:selectedNetwork") || "";
      const p = localStorage.getItem("tc:selectedTradingPoint") || "";
      if (n) setSelectedNetwork(n);
      if (p) setSelectedTradingPoint(p);
    } catch {}
  }, []);

  // Persist to localStorage
  useEffect(() => {
    try {
      localStorage.setItem("tc:selectedNetwork", selectedNetwork || "");
    } catch {}
  }, [selectedNetwork]);

  useEffect(() => {
    try {
      localStorage.setItem("tc:selectedTradingPoint", selectedTradingPoint || "");
    } catch {}
  }, [selectedTradingPoint]);

  const value: SelectionContextValue = {
    selectedNetwork,
    setSelectedNetwork,
    selectedTradingPoint,
    setSelectedTradingPoint,
  };

  return (
    <SelectionContext.Provider value={value}>{children}</SelectionContext.Provider>
  );
}

export function useSelection() {
  const ctx = useContext(SelectionContext);
  if (!ctx) throw new Error("useSelection must be used within SelectionProvider");
  return ctx;
}

