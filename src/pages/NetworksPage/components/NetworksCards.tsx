import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Сеть</TableHead>
          <TableHead className="w-[88px] text-right">Действия</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {networks.map((network) => (
          <TableRow
            key={network.id}
            onClick={() => onSelect(network.id)}
            data-state={selectedNetworkId === network.id ? 'selected' : undefined}
            className="cursor-pointer align-top"
          >
            <TableCell className="align-top">
              <div className="space-y-2">
                <div className="font-medium text-foreground text-base">{network.name}</div>
                <div className="text-sm text-muted-foreground">{network.description}</div>
                <div className="flex items-center gap-2 text-xs flex-wrap">
                  <Badge variant="outline" className="border-border bg-secondary text-foreground">
                    {network.type}
                  </Badge>
                  <span className="font-mono text-foreground/80">Точек: {network.pointsCount.toLocaleString('ru-RU', { maximumFractionDigits: 0 })}</span>
                </div>
                {network.external_id && (
                  <div className="text-xs text-muted-foreground">
                    API ID: <span className="bg-secondary text-foreground px-1 py-0.5 rounded font-mono">{network.external_id}</span>
                  </div>
                )}
              </div>
            </TableCell>
            <TableCell className="text-right align-top">
              <div className="flex items-center gap-1 justify-end">
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
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
