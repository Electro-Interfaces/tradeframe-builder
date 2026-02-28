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
      <div className={`bg-background text-foreground w-full max-w-none ${fullWidth ? 'h-screen' : 'min-h-screen'} ${isMobile ? 'flex flex-col' : ''}`}>
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
              <SheetContent side="left" className="p-0 w-80 mobile-safe-left">
                <SheetTitle className="sr-only">Меню навигации</SheetTitle>
                <SheetDescription className="sr-only">
                  Навигационное меню с разделами торговых сетей, точек и администрирования
                </SheetDescription>
                <AppSidebar selectedTradingPoint={selectedTradingPoint} isMobile={true} setMobileMenuOpen={setMobileMenuOpen} />
              </SheetContent>
            </Sheet>

            <div className="flex flex-col flex-1 min-h-0">
              <main className="flex-1 min-h-0 min-w-0 w-full max-w-none overflow-y-auto" style={{ WebkitOverflowScrolling: 'touch', touchAction: 'pan-y' }}>
                <div className={fullWidth ? "w-full max-w-none min-h-full" : "w-full max-w-none"}>
                  {/* Mobile Trading Point Selector */}
                  {selectedNetwork && (
                    <div className="mx-3 mt-3 mb-0 px-3 py-3 bg-card border border-border rounded-xl shadow-sm">
                      <PointSelect
                        value={selectedTradingPoint}
                        onValueChange={handleTradingPointChange}
                        disabled={!selectedNetwork}
                        networkId={selectedNetwork.id}
                        className="w-full"
                      />
                    </div>
                  )}
                  {children}
                </div>
              </main>
            </div>
          </>
        ) : (
          // Desktop Layout
          <div className={`flex w-full max-w-none ${isMobile ? 'pt-0' : 'pt-header'} ${fullWidth ? 'h-full overflow-hidden' : ''}`}>
            <AppSidebar selectedTradingPoint={selectedTradingPoint} />

            <main className={`flex-1 min-w-0 w-full max-w-none overflow-y-auto ${fullWidth ? 'h-full' : ''}`}>
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
      <header className="h-16 bg-background border-b border-border flex items-center px-4">
        <div className="flex items-center gap-4">
          <h1 className="text-lg font-semibold text-foreground">TradeControl</h1>
        </div>
      </header>
      <main className="w-full px-4 md:px-6 lg:px-8">
        {children}
      </main>
    </>
  );
}
