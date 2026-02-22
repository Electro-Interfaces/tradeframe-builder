import { useState, useEffect, memo } from "react";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { Sheet, SheetContent, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Header } from "./Header";
import { AppSidebar } from "./AppSidebar";
import { useIsMobile } from "@/hooks/use-mobile";
import { useSelection } from "@/contexts/SelectionContext";
import { PointSelect } from "@/components/selects/PointSelect";

interface MainLayoutProps {
  children: React.ReactNode;
  fullWidth?: boolean;
}

const MainLayoutComponent = ({ children, fullWidth = false }: MainLayoutProps) => {
  const { selectedNetwork, setSelectedNetwork, selectedTradingPoint, setSelectedTradingPoint } = useSelection();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const isMobile = useIsMobile();

  // Логирование для мобильных устройств
  useEffect(() => {
    if (isMobile) {
    }
  }, [isMobile]);

  const handleNetworkChange = (value: string) => {
    setSelectedNetwork(value);
  };

  const handleTradingPointChange = (value: string) => {
    setSelectedTradingPoint(value);
  };


  return (
    <SidebarProvider>
      <div className={`bg-background text-foreground w-full max-w-none ${fullWidth ? 'h-screen overflow-hidden' : 'min-h-screen'}`}>
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
                <SheetTitle className="sr-only">Меню навигации</SheetTitle>
                <SheetDescription className="sr-only">
                  Навигационное меню с разделами торговых сетей, точек и администрирования
                </SheetDescription>
                <AppSidebar selectedTradingPoint={selectedTradingPoint} isMobile={true} setMobileMenuOpen={setMobileMenuOpen} />
              </SheetContent>
            </Sheet>
            
            <div className={`${isMobile ? 'pt-0' : 'pt-20'} bg-gray-900`}>
              {/* Mobile Trading Point Selector - отдельно от верхнего бара */}
              {selectedNetwork && (
                <div className="mx-4 pt-3 pb-4 px-3 bg-gray-800 border border-gray-600 rounded-lg shadow-lg mt-3">
                  <PointSelect
                    value={selectedTradingPoint}
                    onValueChange={handleTradingPointChange}
                    disabled={!selectedNetwork}
                    networkId={selectedNetwork.id}
                    className="w-full"
                  />
                </div>
              )}
            </div>

            <main className="flex-1 min-w-0 w-full max-w-none overflow-y-auto" style={{ WebkitOverflowScrolling: 'touch', touchAction: 'pan-y' }}>
              <div className={fullWidth ? "w-full max-w-none pt-4" : "px-0 md:px-6 lg:px-8 w-full max-w-none pt-4"}>
                {children}
              </div>
            </main>
          </>
        ) : (
          // Desktop Layout
          <div className={`flex w-full max-w-none ${isMobile ? 'pt-0' : 'pt-header'} ${fullWidth ? 'h-full overflow-hidden' : ''}`}>
            <AppSidebar selectedTradingPoint={selectedTradingPoint} />
            
            <main className="flex-1 min-w-0 w-full max-w-none overflow-hidden">
              <div className={fullWidth ? "w-full max-w-none h-full" : "px-4 md:px-6 lg:px-8 w-full max-w-none"}>
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
          <h1 className="text-lg font-semibold text-white">TradeFrame</h1>
        </div>
      </header>
      <main className="w-full px-4 md:px-6 lg:px-8">
        {children}
      </main>
    </>
  );
}
