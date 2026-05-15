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
  onDelete,
}: NetworksTableProps) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-[8%]">API ID</TableHead>
          <TableHead className="w-[35%]">Название</TableHead>
          <TableHead className="w-[12%]">Тип</TableHead>
          <TableHead className="w-[12%] text-right">Точек</TableHead>
          <TableHead className="w-[18%] text-right">Обновлено</TableHead>
          <TableHead className="w-[15%] text-right">Действия</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {networks.map((network) => (
          <TableRow
            key={network.id}
            onClick={() => onSelect(network.id)}
            data-state={selectedNetworkId === network.id ? 'selected' : undefined}
            className="cursor-pointer"
          >
            <TableCell>
              <span className="rounded bg-secondary px-2 py-1 font-mono text-xs text-foreground">
                {network.external_id || 'не задан'}
              </span>
            </TableCell>
            <TableCell>
              <div>
                <div className="text-base font-medium text-foreground">{network.name}</div>
                <div className="text-sm text-muted-foreground">{network.description}</div>
              </div>
            </TableCell>
            <TableCell>
              <Badge variant="outline" className="border-border bg-secondary text-foreground">
                {network.type}
              </Badge>
            </TableCell>
            <TableCell className="text-right font-mono text-foreground/80">
              {network.pointsCount.toLocaleString('ru-RU', { maximumFractionDigits: 0 })}
            </TableCell>
            <TableCell className="text-right text-muted-foreground">Сегодня</TableCell>
            <TableCell className="text-right">
              <div className="flex items-center justify-end gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0 text-muted-foreground hover:bg-secondary hover:text-foreground"
                  onClick={(event) => {
                    event.stopPropagation();
                    onEdit(network);
                  }}
                  disabled={actionLoading === `update-${network.id}` || actionLoading === `delete-${network.id}`}
                >
                  <Edit className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0 text-muted-foreground hover:bg-secondary hover:text-red-400"
                  onClick={(event) => {
                    event.stopPropagation();
                    onDelete(network);
                  }}
                  disabled={actionLoading === `update-${network.id}` || actionLoading === `delete-${network.id}`}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
