import { useState, useEffect, memo } from "react";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { tradingPointsService } from "@/services/tradingPointsService";
import { TradingPoint } from "@/types/tradingpoint";
import { Menu, MapPin } from "lucide-react";
import { Header } from "./Header";
import { AppSidebar } from "./AppSidebar";
import { useIsMobile } from "@/hooks/use-mobile";
import { useSelection } from "@/context/SelectionContext";

interface MainLayoutProps {
  children: React.ReactNode;
  fullWidth?: boolean;
}

const MainLayoutComponent = ({ children, fullWidth = false }: MainLayoutProps) => {
  const { selectedNetwork, setSelectedNetwork, selectedTradingPoint, setSelectedTradingPoint } = useSelection();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [tradingPoints, setTradingPoints] = useState<TradingPoint[]>([]);
  const isMobile = useIsMobile();
  
  useEffect(() => {
    if (selectedNetwork?.id) {
      tradingPointsService.getByNetworkId(selectedNetwork.id).then(points => {
        setTradingPoints(points);
      });
    } else {
      setTradingPoints([]);
    }
  }, [selectedNetwork?.id]);

  const handleNetworkChange = (value: string) => {
    setSelectedNetwork(value);
  };

  const handleTradingPointChange = (value: string) => {
    setSelectedTradingPoint(value);
  };


  return (
    <SidebarProvider>
      <div className="min-h-screen bg-background text-foreground w-full max-w-none">
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
                  <SelectItem 
                    value="all"
                    className="text-white hover:bg-gray-600 focus:bg-blue-600 font-medium border-b border-gray-600"
                  >
                    Все торговые точки
                  </SelectItem>
                  {tradingPoints.map((point) => (
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
            
            <main className="flex-1 min-w-0 w-full max-w-none">
              <div className={fullWidth ? "w-full max-w-none" : "px-4 md:px-6 lg:px-8 w-full max-w-none"}>
                {children}
              </div>
            </main>
          </>
        ) : (
          // Desktop Layout
          <div className="flex w-full max-w-none pt-header">
            <AppSidebar selectedTradingPoint={selectedTradingPoint} />
            
            <main className="flex-1 min-w-0 w-full max-w-none">
              <div className={fullWidth ? "w-full max-w-none" : "px-4 md:px-6 lg:px-8 w-full max-w-none"}>
                {children}
              </div>
            </main>
          </div>
        )}
      </div>
    </SidebarProvider>
  );
};

export const MainLayout = memo(MainLayoutComponent);

// Новый простой лэйаут для страниц без селекторов
export function SimpleLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <header className="h-16 bg-slate-900 border-b border-slate-700 flex items-center px-4">
        <div className="flex items-center gap-4">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-xs">DW</span>
          </div>
          <h1 className="text-lg font-semibold text-white">DW TradeFrame</h1>
        </div>
      </header>
      <main className="w-full px-4 md:px-6 lg:px-8">
        {children}
      </main>
    </>
  );
}
