import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[25%]">Название роли</TableHead>
            <TableHead className="w-[15%]">Код</TableHead>
            <TableHead className="w-[15%]">Область</TableHead>
            <TableHead className="w-[15%]">Разрешения</TableHead>
            <TableHead className="w-[15%]">Статус</TableHead>
            <TableHead className="w-[15%] text-right">Действия</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
            {[...Array(5)].map((_, i) => (
              <TableRow key={i}>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Skeleton className="w-7 h-7 rounded-lg bg-secondary" />
                    <div className="space-y-1">
                      <Skeleton className="h-4 w-32 bg-secondary" />
                      <Skeleton className="h-3 w-48 bg-secondary" />
                    </div>
                  </div>
                </TableCell>
                <TableCell><Skeleton className="h-5 w-24 bg-secondary" /></TableCell>
                <TableCell><Skeleton className="h-5 w-20 bg-secondary" /></TableCell>
                <TableCell><Skeleton className="h-4 w-8 bg-secondary" /></TableCell>
                <TableCell><Skeleton className="h-5 w-16 bg-secondary" /></TableCell>
                <TableCell><Skeleton className="h-7 w-16 bg-secondary ml-auto" /></TableCell>
              </TableRow>
            ))}
        </TableBody>
      </Table>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-[25%]">Название роли</TableHead>
          <TableHead className="w-[15%]">Код</TableHead>
          <TableHead className="w-[15%]">Область</TableHead>
          <TableHead className="w-[15%]">Разрешения</TableHead>
          <TableHead className="w-[15%]">Статус</TableHead>
          <TableHead className="w-[15%] text-right">Действия</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
          {roles.map((role) => (
            <TableRow
              key={role.id}
            >
              <TableCell>
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 bg-secondary rounded-lg flex items-center justify-center flex-shrink-0">
                    <Shield className="w-3.5 h-3.5 text-foreground/80" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="font-medium text-foreground text-sm truncate">
                      {role.name}
                    </div>
                    <div className="text-xs text-muted-foreground truncate">
                      {role.description}
                    </div>
                  </div>
                </div>
              </TableCell>
              <TableCell>
                <code className="bg-secondary text-foreground px-2 py-0.5 rounded text-xs">
                  {role.code}
                </code>
              </TableCell>
              <TableCell>
                <Badge
                  variant="outline"
                  className={`text-xs ${getScopeBadgeColor(role.scope)}`}
                >
                  {formatRoleScope(role.scope)}
                </Badge>
              </TableCell>
              <TableCell className="font-mono text-foreground/80">
                {role.permissions.length.toLocaleString('ru-RU', { maximumFractionDigits: 0 })}
              </TableCell>
              <TableCell>
                <Badge
                  variant="outline"
                  className={`text-xs ${getStatusBadgeColor(role.is_active)}`}
                >
                  {formatRoleStatus(role.is_active)}
                </Badge>
              </TableCell>
              <TableCell className="text-right">
                <div className="flex items-center justify-end gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground hover:bg-secondary"
                    onClick={() => onEdit(role)}
                    title="Редактировать роль"
                  >
                    <Edit className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0 text-muted-foreground hover:text-red-400 hover:bg-secondary"
                    onClick={() => onDelete(role)}
                    title="Удалить роль"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
      </TableBody>
    </Table>
  );
}
