import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
  onDelete
}: NetworksTableProps) {
  return (
    <div className="overflow-x-auto w-full rounded-lg border border-slate-600">
      <table className="w-full text-sm min-w-full table-fixed">
        <thead className="bg-slate-700">
          <tr>
            <th className="px-6 py-4 text-left text-slate-200 font-medium w-[8%]">API ID</th>
            <th className="px-6 py-4 text-left text-slate-200 font-medium w-[35%]">НАЗВАНИЕ</th>
            <th className="px-6 py-4 text-left text-slate-200 font-medium w-[12%]">ТИП</th>
            <th className="px-6 py-4 text-right text-slate-200 font-medium w-[12%]">ТОЧЕК</th>
            <th className="px-6 py-4 text-right text-slate-200 font-medium w-[18%]">ОБНОВЛЕНО</th>
            <th className="px-6 py-4 text-right text-slate-200 font-medium w-[15%]">ДЕЙСТВИЯ</th>
          </tr>
        </thead>
        <tbody className="bg-slate-800">
          {networks.map((network) => (
            <tr
              key={network.id}
              onClick={() => onSelect(network.id)}
              className={`border-b border-slate-600 cursor-pointer hover:bg-slate-700 transition-colors ${
                selectedNetworkId === network.id ? 'bg-blue-600/20 border-blue-500' : ''
              }`}
            >
              <td className="px-4 md:px-6 py-4">
                <span className="text-xs bg-blue-900/50 text-blue-300 px-2 py-1 rounded font-mono">
                  {network.external_id || 'не задан'}
                </span>
              </td>
              <td className="px-4 md:px-6 py-4">
                <div>
                  <div className="font-medium text-white text-base">{network.name}</div>
                  <div className="text-sm text-slate-400">{network.description}</div>
                </div>
              </td>
              <td className="px-4 md:px-6 py-4">
                <Badge variant="secondary" className="bg-slate-600 text-slate-200">
                  {network.type}
                </Badge>
              </td>
              <td className="px-6 py-4 text-right text-white font-medium">{network.pointsCount}</td>
              <td className="px-6 py-4 text-right text-slate-400">Сегодня</td>
              <td className="px-6 py-4 text-right">
                <div className="flex items-center justify-end gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0 text-slate-400 hover:text-white"
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
                    className="h-8 w-8 p-0 text-slate-400 hover:text-red-400"
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
