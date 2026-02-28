import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Edit, Trash2, User } from "lucide-react";
import { User as UserType } from "@/types/auth";
import { formatDate } from "../utils/formatters";

interface UsersCardsProps {
  users: UserType[];
  onEdit: (user: UserType) => void;
  onDelete: (user: UserType) => void;
}

export function UsersCards({ users, onEdit, onDelete }: UsersCardsProps) {
  return (
    <div className="space-y-2 px-4 pb-6">
      {users.map((user) => (
        <div key={user.id} className="bg-card border border-border rounded-lg p-3 hover:bg-secondary transition-colors">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1.5">
                <div className="w-7 h-7 bg-secondary rounded-lg flex items-center justify-center">
                  <User className="w-3.5 h-3.5 text-foreground/80" />
                </div>
                <div className="font-medium text-foreground text-sm">{user.name}</div>
              </div>
              <div className="text-xs text-muted-foreground mb-2">{user.email}</div>
              <div className="flex flex-wrap items-center gap-1.5 mb-1.5">
                <Badge
                  variant={user.status === 'active' ? 'default' : 'secondary'}
                  className={user.status === 'active' ? 'bg-emerald-600 text-xs' : 'bg-secondary text-xs'}
                >
                  {user.status === 'active' ? 'Активен' : 'Неактивен'}
                </Badge>
                {user.roles?.map((role, index) => (
                  <Badge key={`${role.role_id}-${index}`} variant="outline" className="text-xs border-border">
                    {role.role_name}
                  </Badge>
                ))}
              </div>
              <div className="text-xs text-muted-foreground">
                Последний вход: {formatDate(user.last_login)}
              </div>
            </div>
            <div className="flex flex-col gap-0.5">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onEdit(user)}
                className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
                title="Редактировать"
              >
                <Edit className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onDelete(user)}
                className="h-7 w-7 p-0 text-muted-foreground hover:text-red-400"
                title="Удалить"
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
