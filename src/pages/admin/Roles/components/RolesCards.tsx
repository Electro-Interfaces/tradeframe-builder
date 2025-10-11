import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
    <div className="space-y-2 px-4 pb-6">
      {roles.map((role) => (
        <div key={role.id} className="bg-slate-800 border border-slate-600 rounded-lg p-3 hover:bg-slate-700 transition-colors">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1.5">
                <div className="w-7 h-7 bg-slate-700 rounded-lg flex items-center justify-center">
                  <Shield className="w-3.5 h-3.5 text-slate-300" />
                </div>
                <div className="font-medium text-white text-sm">{role.name}</div>
              </div>

              <div className="text-xs text-slate-400 mb-2">{role.description}</div>

              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-500">Код:</span>
                  <code className="bg-slate-600 text-slate-200 px-1.5 py-0.5 rounded text-xs">
                    {role.code}
                  </code>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs text-slate-500">Область:</span>
                  <Badge
                    variant="outline"
                    className={`text-xs ${getScopeBadgeColor(role.scope)}`}
                  >
                    {formatRoleScope(role.scope)}
                  </Badge>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-500">Разрешений:</span>
                  <span className="text-white text-xs">{role.permissions.length}</span>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-500">Статус:</span>
                  <Badge
                    variant="outline"
                    className={`text-xs ${getStatusBadgeColor(role.is_active)}`}
                  >
                    {formatRoleStatus(role.is_active)}
                  </Badge>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-0.5">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onEdit(role)}
                className="h-7 w-7 p-0 text-slate-400 hover:text-white"
              >
                <Edit className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onDelete(role)}
                className="h-7 w-7 p-0 text-slate-400 hover:text-red-400"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
