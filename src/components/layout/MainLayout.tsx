import { useState } from "react";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { Header } from "./Header";
import { AppSidebar } from "./AppSidebar";

interface MainLayoutProps {
  children: React.ReactNode;
}

export function MainLayout({ children }: MainLayoutProps) {
  const [selectedNetwork, setSelectedNetwork] = useState("");
  const [selectedTradingPoint, setSelectedTradingPoint] = useState("");

  const handleNetworkChange = (value: string) => {
    setSelectedNetwork(value);
    // Reset trading point when network changes
    if (selectedTradingPoint) {
      setSelectedTradingPoint("");
    }
  };

  const handleTradingPointChange = (value: string) => {
    setSelectedTradingPoint(value);
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header
        selectedNetwork={selectedNetwork}
        selectedTradingPoint={selectedTradingPoint}
        onNetworkChange={handleNetworkChange}
        onTradingPointChange={handleTradingPointChange}
      />
      
      <SidebarProvider>
        <div className="flex w-full pt-header">
          <AppSidebar selectedTradingPoint={selectedTradingPoint} />
          
          <main className="flex-1 p-6">
            <div className="mb-4">
              <SidebarTrigger className="md:hidden" />
            </div>
            {children}
          </main>
        </div>
      </SidebarProvider>
    </div>
  );
}