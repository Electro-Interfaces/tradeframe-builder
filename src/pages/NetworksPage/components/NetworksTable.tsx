import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Edit, Trash2 } from "lucide-react";
import { Network } from "@/types/network";
import { useIsMobile } from "@/hooks/useIsMobile";

interface NetworksTableProps {
  networks: Network[];
  selectedNetworkId: string | null;
  actionLoading: string | null;
  onSelect: (id: string) => void;
  onEdit: (network: Network) => void;
  onDelete: (network: Network) => void;
}

export function NetworksTable({
  networks,
  selectedNetworkId,
  actionLoading,
  onSelect,
  onEdit,
  onDelete
}: NetworksTableProps) {
  const isMobile = useIsMobile();

  if (isMobile) {
    return (
      <div className="space-y-2">
        {networks.map((network) => (
          <div
            key={network.id}
            onClick={() => onSelect(network.id)}
            className={`rounded-lg border p-3 cursor-pointer transition-colors ${
              selectedNetworkId === network.id
                ? 'bg-blue-600/20 border-blue-500'
                : 'bg-card border-border hover:bg-secondary'
            }`}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <div className="font-medium text-foreground">{network.name}</div>
                {network.description && (
                  <div className="text-xs text-muted-foreground mt-0.5 truncate">{network.description}</div>
                )}
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
                  onClick={(e) => { e.stopPropagation(); onEdit(network); }}
                  disabled={actionLoading === `update-${network.id}` || actionLoading === `delete-${network.id}`}
                >
                  <Edit className="h-3.5 w-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 p-0 text-muted-foreground hover:text-red-400"
                  onClick={(e) => { e.stopPropagation(); onDelete(network); }}
                  disabled={actionLoading === `update-${network.id}` || actionLoading === `delete-${network.id}`}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              {network.external_id && (
                <span className="text-xs bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-300 px-1.5 py-0.5 rounded font-mono">
                  {network.external_id}
                </span>
              )}
              <Badge variant="secondary" className="bg-secondary text-foreground text-xs">
                {network.type}
              </Badge>
              <span className="text-xs text-muted-foreground">Точек: {network.pointsCount}</span>
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="overflow-x-auto w-full rounded-lg border border-border">
      <table className="w-full text-sm min-w-full table-fixed">
        <thead className="bg-secondary">
          <tr>
            <th className="px-6 py-4 text-left text-foreground font-medium w-[8%]">API ID</th>
            <th className="px-6 py-4 text-left text-foreground font-medium w-[35%]">НАЗВАНИЕ</th>
            <th className="px-6 py-4 text-left text-foreground font-medium w-[12%]">ТИП</th>
            <th className="px-6 py-4 text-right text-foreground font-medium w-[12%]">ТОЧЕК</th>
            <th className="px-6 py-4 text-right text-foreground font-medium w-[18%]">ОБНОВЛЕНО</th>
            <th className="px-6 py-4 text-right text-foreground font-medium w-[15%]">ДЕЙСТВИЯ</th>
          </tr>
        </thead>
        <tbody className="bg-card">
          {networks.map((network) => (
            <tr
              key={network.id}
              onClick={() => onSelect(network.id)}
              className={`border-b border-border cursor-pointer hover:bg-secondary transition-colors ${
                selectedNetworkId === network.id ? 'bg-blue-600/20 border-blue-500' : ''
              }`}
            >
              <td className="px-4 md:px-6 py-4">
                <span className="text-xs bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-300 px-2 py-1 rounded font-mono">
                  {network.external_id || 'не задан'}
                </span>
              </td>
              <td className="px-4 md:px-6 py-4">
                <div>
                  <div className="font-medium text-foreground text-base">{network.name}</div>
                  <div className="text-sm text-muted-foreground">{network.description}</div>
                </div>
              </td>
              <td className="px-4 md:px-6 py-4">
                <Badge variant="secondary" className="bg-secondary text-foreground">
                  {network.type}
                </Badge>
              </td>
              <td className="px-6 py-4 text-right text-foreground font-medium">{network.pointsCount}</td>
              <td className="px-6 py-4 text-right text-muted-foreground">Сегодня</td>
              <td className="px-6 py-4 text-right">
                <div className="flex items-center justify-end gap-2">
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
                    <Edit className="h-4 w-4" />
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
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
