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
                  {tradingPoints.map((point) => (
                    <SelectItem 
                      key={point.value} 
                      value={point.value}
                      className="text-white hover:bg-gray-600 focus:bg-blue-600"
                    >
                      {point.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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

// Новый простой лэйаут для страниц без селекторов
export function SimpleLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <header className="h-16 bg-slate-900 border-b border-slate-700 flex items-center px-4">
        <div className="flex items-center gap-4">
          <h1 className="text-lg font-semibold text-white">TradeControl</h1>
        </div>
      </header>
      <main className="flex-1 min-w-0 w-full px-4 md:px-6 py-4">
        {children}
      </main>
    </>
  );
}