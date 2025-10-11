import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Edit, Trash2, Shield } from "lucide-react";
import type { Role } from "@/types/auth";
import { formatRoleScope, getScopeBadgeColor, getStatusBadgeColor, formatRoleStatus } from "../utils/roleFormatters";

interface RolesTableProps {
  roles: Role[];
  isLoading: boolean;
  onEdit: (role: Role) => void;
  onDelete: (role: Role) => void;
}

export function RolesTable({
  roles,
  isLoading,
  onEdit,
  onDelete
}: RolesTableProps) {
  if (isLoading) {
    return (
      <div className="overflow-x-auto w-full rounded-lg border border-slate-600">
        <table className="w-full text-sm min-w-full table-fixed">
          <thead className="bg-slate-700">
            <tr>
              <th className="px-4 py-3 text-left text-slate-200 font-medium text-xs uppercase w-[25%]">Название роли</th>
              <th className="px-4 py-3 text-left text-slate-200 font-medium text-xs uppercase w-[15%]">Код</th>
              <th className="px-4 py-3 text-left text-slate-200 font-medium text-xs uppercase w-[15%]">Область</th>
              <th className="px-4 py-3 text-left text-slate-200 font-medium text-xs uppercase w-[15%]">Разрешения</th>
              <th className="px-4 py-3 text-left text-slate-200 font-medium text-xs uppercase w-[15%]">Статус</th>
              <th className="px-4 py-3 text-right text-slate-200 font-medium text-xs uppercase w-[15%]">Действия</th>
            </tr>
          </thead>
          <tbody className="bg-slate-800">
            {[...Array(5)].map((_, i) => (
              <tr key={i} className="border-b border-slate-600">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <Skeleton className="w-7 h-7 rounded-lg bg-slate-700" />
                    <div className="space-y-1">
                      <Skeleton className="h-4 w-32 bg-slate-700" />
                      <Skeleton className="h-3 w-48 bg-slate-700" />
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3"><Skeleton className="h-5 w-24 bg-slate-700" /></td>
                <td className="px-4 py-3"><Skeleton className="h-5 w-20 bg-slate-700" /></td>
                <td className="px-4 py-3"><Skeleton className="h-4 w-8 bg-slate-700" /></td>
                <td className="px-4 py-3"><Skeleton className="h-5 w-16 bg-slate-700" /></td>
                <td className="px-4 py-3"><Skeleton className="h-7 w-16 bg-slate-700 ml-auto" /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto w-full rounded-lg border border-slate-600">
      <table className="w-full text-sm min-w-full table-fixed">
        <thead className="bg-slate-700">
          <tr>
            <th className="px-4 py-3 text-left text-slate-200 font-medium text-xs uppercase w-[25%]">Название роли</th>
            <th className="px-4 py-3 text-left text-slate-200 font-medium text-xs uppercase w-[15%]">Код</th>
            <th className="px-4 py-3 text-left text-slate-200 font-medium text-xs uppercase w-[15%]">Область</th>
            <th className="px-4 py-3 text-left text-slate-200 font-medium text-xs uppercase w-[15%]">Разрешения</th>
            <th className="px-4 py-3 text-left text-slate-200 font-medium text-xs uppercase w-[15%]">Статус</th>
            <th className="px-4 py-3 text-right text-slate-200 font-medium text-xs uppercase w-[15%]">Действия</th>
          </tr>
        </thead>
        <tbody className="bg-slate-800">
          {roles.map((role) => (
            <tr
              key={role.id}
              className="border-b border-slate-600 hover:bg-slate-700 transition-colors"
            >
              <td className="px-4 py-3">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 bg-slate-700 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Shield className="w-3.5 h-3.5 text-slate-300" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="font-medium text-white text-sm truncate">
                      {role.name}
                    </div>
                    <div className="text-xs text-slate-400 truncate">
                      {role.description}
                    </div>
                  </div>
                </div>
              </td>
              <td className="px-4 py-3">
                <code className="bg-slate-600 text-slate-200 px-2 py-0.5 rounded text-xs">
                  {role.code}
                </code>
              </td>
              <td className="px-4 py-3">
                <Badge
                  variant="outline"
                  className={`text-xs ${getScopeBadgeColor(role.scope)}`}
                >
                  {formatRoleScope(role.scope)}
                </Badge>
              </td>
              <td className="px-4 py-3">
                <span className="text-white text-sm">{role.permissions.length}</span>
              </td>
              <td className="px-4 py-3">
                <Badge
                  variant="outline"
                  className={`text-xs ${getStatusBadgeColor(role.is_active)}`}
                >
                  {formatRoleStatus(role.is_active)}
                </Badge>
              </td>
              <td className="px-4 py-3 text-right">
                <div className="flex items-center justify-end gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0 text-slate-400 hover:text-white hover:bg-slate-700"
                    onClick={() => onEdit(role)}
                    title="Редактировать роль"
                  >
                    <Edit className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0 text-slate-400 hover:text-red-400 hover:bg-slate-700"
                    onClick={() => onDelete(role)}
                    title="Удалить роль"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
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
