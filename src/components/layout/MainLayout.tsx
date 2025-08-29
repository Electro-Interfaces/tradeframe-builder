import { useState } from "react";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Menu } from "lucide-react";
import { Header } from "./Header";
import { AppSidebar } from "./AppSidebar";
import { useIsMobile } from "@/hooks/use-mobile";

interface MainLayoutProps {
  children: React.ReactNode;
}

export function MainLayout({ children }: MainLayoutProps) {
  const [selectedNetwork, setSelectedNetwork] = useState("");
  const [selectedTradingPoint, setSelectedTradingPoint] = useState("");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const isMobile = useIsMobile();

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
        onMobileMenuToggle={() => setMobileMenuOpen(!mobileMenuOpen)}
        isMobile={isMobile}
      />
      
      {isMobile ? (
        // Mobile Layout with Sheet
        <>
          <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
            <SheetContent side="left" className="p-0 w-80">
              <AppSidebar selectedTradingPoint={selectedTradingPoint} />
            </SheetContent>
          </Sheet>
          
          <main className="pt-header px-4 pb-6">
            {children}
          </main>
        </>
      ) : (
        // Desktop Layout with SidebarProvider
        <SidebarProvider>
          <div className="flex w-full pt-header">
            <AppSidebar selectedTradingPoint={selectedTradingPoint} />
            
            <main className="flex-1 p-8">
              {children}
            </main>
          </div>
        </SidebarProvider>
      )}
    </div>
  );
}