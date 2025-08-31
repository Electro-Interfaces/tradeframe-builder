import { useState } from "react";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { tradingPointsStore } from "@/mock/tradingPointsStore";
import { Menu, MapPin } from "lucide-react";
import { Header } from "./Header";
import { AppSidebar } from "./AppSidebar";
import { useIsMobile } from "@/hooks/use-mobile";
import { useSelection } from "@/context/SelectionContext";

interface FullWidthLayoutProps {
  children: React.ReactNode;
}

export function FullWidthLayout({ children }: FullWidthLayoutProps) {
  const { selectedNetwork, setSelectedNetwork, selectedTradingPoint, setSelectedTradingPoint } = useSelection();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const isMobile = useIsMobile();

  const handleNetworkChange = (value: string) => {
    setSelectedNetwork(value);
  };

  const handleTradingPointChange = (value: string) => {
    setSelectedTradingPoint(value);
  };

  return (
    <SidebarProvider>
      <div className="min-h-screen bg-background text-foreground">
        <Header
          selectedNetwork={selectedNetwork?.id || ""}
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
            <div className="pt-header px-4 py-3 bg-gray-800 border-b border-gray-700">
              <Select 
                value={selectedTradingPoint} 
                onValueChange={handleTradingPointChange}
                disabled={!selectedNetwork}
              >
                <SelectTrigger className="w-full bg-gray-700 border-gray-600 text-white hover:bg-gray-600 focus:ring-blue-500">
                  <MapPin className="h-4 w-4 mr-2 text-blue-400" />
                  <SelectValue 
                    placeholder={selectedNetwork ? "Выберите торговую точку" : "Сначала выберите сеть"} 
                    className="text-white"
                  />
                </SelectTrigger>
                <SelectContent className="bg-gray-700 border-gray-600">
                  {tradingPointsStore.getByNetworkId(selectedNetwork?.id || "").map((point) => (
                    <SelectItem 
                      key={point.id} 
                      value={point.id}
                      className="text-white hover:bg-gray-600 focus:bg-blue-600"
                    >
                      {point.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <main className="w-full">
              {children}
            </main>
          </>
        ) : (
          // Desktop Layout with full width content
          <div className="flex w-full pt-header">
            <AppSidebar selectedTradingPoint={selectedTradingPoint} />
            
            <main className="flex-1 min-w-0">
              {children}
            </main>
          </div>
        )}
      </div>
    </SidebarProvider>
  );
}