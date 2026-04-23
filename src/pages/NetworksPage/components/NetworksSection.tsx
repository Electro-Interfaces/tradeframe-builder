import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { NetworksTable } from "./NetworksTable";
import { NetworksCards } from "./NetworksCards";
import { Network } from "@/types/network";

interface NetworksSectionProps {
  networks: Network[];
  loading: boolean;
  selectedNetworkId: string | null;
  actionLoading: string | null;
  isMobile: boolean;
  onSelect: (id: string) => void;
  onEdit: (network: Network) => void;
  onDelete: (network: Network) => void;
  onCreateClick: () => void;
}

export function NetworksSection({
  networks,
  loading,
  selectedNetworkId,
  actionLoading,
  isMobile,
  onSelect,
  onEdit,
  onDelete,
  onCreateClick
}: NetworksSectionProps) {
  if (loading) {
    return (
      <div className="bg-card mb-6 w-full rounded-lg">
        <div className="px-4 md:px-6 py-4">
          <div className="text-foreground">Загрузка...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-card mb-6 w-full rounded-lg">
      <div className="px-4 md:px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center flex-shrink-0">
              <span className="text-foreground text-sm">🏪</span>
            </div>
            <h2 className="text-lg font-semibold text-foreground">Торговые сети</h2>
          </div>
          <Button
            onClick={onCreateClick}
            disabled={actionLoading === 'create'}
            className="bg-primary hover:bg-primary/80 text-white px-4 py-2 rounded-lg font-medium flex-shrink-0"
          >
            {actionLoading === 'create' ? 'Создание...' : '+ Создать сеть'}
          </Button>
        </div>
      </div>

      {networks.length === 0 ? (
        <div className="px-4 md:px-6 pb-6">
          <EmptyState
            title="Нет торговых сетей"
            description="Создайте первую торговую сеть для начала работы"
            cta={
              <Button
                onClick={onCreateClick}
                className="bg-primary hover:bg-primary/80 text-white"
              >
                + Создать сеть
              </Button>
            }
            className="py-16"
          />
        </div>
      ) : (
        <>
          {/* Desktop таблица */}
          <div className="hidden md:block w-full">
            <NetworksTable
              networks={networks}
              selectedNetworkId={selectedNetworkId}
              actionLoading={actionLoading}
              onSelect={onSelect}
              onEdit={onEdit}
              onDelete={onDelete}
            />
          </div>

          {/* Mobile карточки */}
          <div className="md:hidden">
            <NetworksCards
              networks={networks}
              selectedNetworkId={selectedNetworkId}
              actionLoading={actionLoading}
              onSelect={onSelect}
              onEdit={onEdit}
              onDelete={onDelete}
            />
          </div>
        </>
      )}
    </div>
  );
}
