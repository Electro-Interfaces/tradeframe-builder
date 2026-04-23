import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Edit, Trash2 } from "lucide-react";
import { Network } from "@/types/network";

interface NetworksCardsProps {
  networks: Network[];
  selectedNetworkId: string | null;
  actionLoading: string | null;
  onSelect: (id: string) => void;
  onEdit: (network: Network) => void;
  onDelete: (network: Network) => void;
}

export function NetworksCards({
  networks,
  selectedNetworkId,
  actionLoading,
  onSelect,
  onEdit,
  onDelete
}: NetworksCardsProps) {
  return (
    <div className="space-y-3 px-4 pb-6">
      {networks.map((network) => (
        <div
          key={network.id}
          onClick={() => onSelect(network.id)}
          className={`bg-secondary rounded-lg p-4 cursor-pointer hover:bg-secondary transition-colors border-2 ${
            selectedNetworkId === network.id ? 'border-primary bg-primary/20' : 'border-transparent'
          }`}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="font-medium text-foreground text-base mb-1">{network.name}</div>
              <div className="text-sm text-muted-foreground mb-2">{network.description}</div>
              <div className="flex items-center gap-3 text-xs mb-2">
                <Badge variant="secondary" className="bg-secondary text-foreground">
                  {network.type}
                </Badge>
                <span className="text-muted-foreground">Точек: {network.pointsCount}</span>
                <span className="text-muted-foreground">Сегодня</span>
              </div>
              {network.external_id && (
                <div className="text-xs text-muted-foreground">
                  API ID: <span className="bg-primary/10 dark:bg-blue-900/50 text-primary dark:text-blue-300 px-1 py-0.5 rounded font-mono">{network.external_id}</span>
                </div>
              )}
            </div>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit(network);
                }}
                disabled={actionLoading === `update-${network.id}` || actionLoading === `delete-${network.id}`}
              >
                <Edit className="h-3 w-3" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0 text-muted-foreground hover:text-red-400"
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(network);
                }}
                disabled={actionLoading === `update-${network.id}` || actionLoading === `delete-${network.id}`}
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
