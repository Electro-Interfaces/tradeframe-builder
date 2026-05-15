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
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Пользователь</TableHead>
          <TableHead className="w-[88px] text-right">Действия</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {users.map((user) => (
          <TableRow key={user.id} className="align-top">
            <TableCell className="align-top">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 bg-secondary rounded-lg flex items-center justify-center">
                    <User className="w-3.5 h-3.5 text-foreground/80" />
                  </div>
                  <div className="font-medium text-foreground text-sm">{user.name}</div>
                </div>
                <div className="text-xs text-muted-foreground">{user.email}</div>
                <div className="flex flex-wrap items-center gap-1.5">
                  <Badge
                    variant="outline"
                    className={user.status === 'active'
                      ? 'text-xs border-border bg-secondary text-foreground'
                      : 'text-xs border-red-200 bg-red-50 text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300'}
                  >
                    {user.status === 'active' ? 'Активен' : 'Неактивен'}
                  </Badge>
                  {user.roles?.map((role, index) => (
                    <Badge key={`${role.role_id}-${index}`} variant="outline" className="text-xs border-border text-foreground/80">
                      {role.role_name}
                    </Badge>
                  ))}
                </div>
                <div className="text-xs text-muted-foreground">
                  Последний вход: {formatDate(user.last_login)}
                </div>
              </div>
            </TableCell>
            <TableCell className="text-right align-top">
              <div className="flex flex-col gap-0.5 items-end">
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
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
