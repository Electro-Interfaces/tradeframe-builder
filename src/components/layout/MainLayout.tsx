import { useState } from "react";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Menu, MapPin } from "lucide-react";
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

  const tradingPoints = [
    { value: "point1", label: "АЗС №001 - Центральная" },
    { value: "point2", label: "АЗС №002 - Северная" },
    { value: "point3", label: "АЗС №003 - Южная" },
  ];

  return (
    <SidebarProvider>
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
                <AppSidebar selectedTradingPoint={selectedTradingPoint} isMobile={true} setMobileMenuOpen={setMobileMenuOpen} />
              </SheetContent>
            </Sheet>
            
            {/* Mobile Trading Point Selector */}
            <div className="pt-header px-4 py-3 bg-card border-b border-border">
              <Select 
                value={selectedTradingPoint} 
                onValueChange={handleTradingPointChange}
                disabled={!selectedNetwork}
              >
                <SelectTrigger className="w-full">
                  <MapPin className="h-4 w-4 mr-2 text-muted-foreground" />
                  <SelectValue 
                    placeholder={selectedNetwork ? "Выберите торговую точку" : "Сначала выберите сеть"} 
                  />
                </SelectTrigger>
                <SelectContent>
                  {tradingPoints.map((point) => (
                    <SelectItem key={point.value} value={point.value}>
                      {point.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedTradingPoint && (
                <div className="mt-2 flex justify-center">
                  <span className="bg-blue-600 text-white px-3 py-1 rounded text-xs font-medium">
                    Торговая точка выбрана
                  </span>
                </div>
              )}
            </div>
            
            <main className="px-4 pb-6">
              {children}
            </main>
          </>
        ) : (
          // Desktop Layout
          <div className="flex w-full pt-header">
            <AppSidebar selectedTradingPoint={selectedTradingPoint} />
            
            <main className="flex-1 p-8">
              {children}
            </main>
          </div>
        )}
      </div>
    </SidebarProvider>
  );
}