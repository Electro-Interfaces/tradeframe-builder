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
import { Edit, Trash2, Shield } from "lucide-react";
import type { Role } from "@/types/auth";
import { formatRoleScope, getScopeBadgeColor, getStatusBadgeColor, formatRoleStatus } from "../utils/roleFormatters";

interface RolesCardsProps {
  roles: Role[];
  onEdit: (role: Role) => void;
  onDelete: (role: Role) => void;
}

export function RolesCards({ roles, onEdit, onDelete }: RolesCardsProps) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Роль</TableHead>
          <TableHead className="w-[88px] text-right">Действия</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {roles.map((role) => (
          <TableRow key={role.id} className="align-top">
            <TableCell className="align-top">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 bg-secondary rounded-lg flex items-center justify-center">
                    <Shield className="w-3.5 h-3.5 text-foreground/80" />
                  </div>
                  <div className="font-medium text-foreground text-sm">{role.name}</div>
                </div>

                <div className="text-xs text-muted-foreground">{role.description}</div>

                <div className="space-y-1.5 text-xs text-muted-foreground">
                  <div>
                    Код: <code className="bg-secondary text-foreground px-1.5 py-0.5 rounded">{role.code}</code>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span>Область:</span>
                    <Badge
                      variant="outline"
                      className={`text-xs ${getScopeBadgeColor(role.scope)}`}
                    >
                      {formatRoleScope(role.scope)}
                    </Badge>
                  </div>
                  <div>
                    Разрешений: <span className="font-mono text-foreground/80">{role.permissions.length.toLocaleString('ru-RU', { maximumFractionDigits: 0 })}</span>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span>Статус:</span>
                    <Badge
                      variant="outline"
                      className={`text-xs ${getStatusBadgeColor(role.is_active)}`}
                    >
                      {formatRoleStatus(role.is_active)}
                    </Badge>
                  </div>
                </div>
              </div>
            </TableCell>
            <TableCell className="text-right align-top">
              <div className="flex flex-col gap-0.5 items-end">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onEdit(role)}
                  className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
                >
                  <Edit className="h-3.5 w-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onDelete(role)}
                  className="h-7 w-7 p-0 text-muted-foreground hover:text-red-400"
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
