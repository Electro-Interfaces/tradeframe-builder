import { useState, memo } from "react";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { Sheet, SheetContent, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Header } from "./Header";
import { AppSidebar } from "./AppSidebar";
import { BottomNav } from "./BottomNav";

import { useIsMobile } from "@/hooks/use-mobile";
import { useSelection } from "@/contexts/SelectionContext";
import { PointSelect } from "@/components/selects/PointSelect";

interface MainLayoutProps {
  children: React.ReactNode;
  fullWidth?: boolean;
}

const MainLayoutComponent = ({ children, fullWidth = false }: MainLayoutProps) => {
  const { selectedNetwork, setSelectedNetwork, selectedNetworkIds, setSelectedNetworkIds, selectedTradingPoint, selectedTradingPoints, setSelectedTradingPoints, setSelectedTradingPoint } = useSelection();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const isMobile = useIsMobile();

  const handleNetworkChange = (value: string) => {
    setSelectedNetwork(value);
  };

  const handleNetworkIdsChange = (values: string[]) => {
    setSelectedNetworkIds(values);
  };

  const handleTradingPointsChange = (values: string[]) => {
    setSelectedTradingPoints(values);
  };

  const handlePointClick = (pointId: string) => {
    setSelectedTradingPoint(pointId);
  };


  return (
    <SidebarProvider>
      <div className={`bg-background text-foreground w-full max-w-none overflow-x-hidden ${fullWidth ? 'h-screen' : 'min-h-screen'} ${isMobile ? 'flex flex-col' : ''}`}>
        <Header
          selectedNetwork={selectedNetwork?.id || ""}
          selectedNetworkIds={selectedNetworkIds}
          selectedTradingPoints={selectedTradingPoints}
          onNetworkChange={handleNetworkChange}
          onNetworkIdsChange={handleNetworkIdsChange}
          onTradingPointsChange={handleTradingPointsChange}
          onPointClick={handlePointClick}
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
              <main className="flex-1 min-h-0 min-w-0 w-full max-w-none overflow-y-auto overflow-x-hidden pb-32" style={{ WebkitOverflowScrolling: 'touch', touchAction: 'pan-y' }}>
                <div className={fullWidth ? "w-full max-w-none min-h-full" : "w-full max-w-none"}>
                  {children}
                </div>
              </main>
            </div>

            <BottomNav
              onMenuToggle={() => setMobileMenuOpen(!mobileMenuOpen)}
              showPointSelect={!!selectedNetwork}
              pointSelectProps={{
                values: selectedTradingPoints,
                onValuesChange: handleTradingPointsChange,
                onPointClick: handlePointClick,
                disabled: !selectedNetwork,
                networkIds: selectedNetworkIds,
              }}
            />
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
          <h1 className="text-lg font-semibold text-foreground">Monitor</h1>
        </div>
      </header>
      <main className="w-full px-4 md:px-6 lg:px-8">
        {children}
      </main>
    </>
  );
}
