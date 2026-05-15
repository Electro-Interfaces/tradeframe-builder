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
import { Edit, Trash2, User } from "lucide-react";
import { User as UserType } from "@/types/auth";
import { formatDate } from "../utils/formatters";

interface UsersTableProps {
  users: UserType[];
  isLoading: boolean;
  onEdit: (user: UserType) => void;
  onDelete: (user: UserType) => void;
}

export function UsersTable({
  users,
  isLoading,
  onEdit,
  onDelete
}: UsersTableProps) {
  if (isLoading) {
    return (
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[23%]">Пользователь</TableHead>
            <TableHead className="w-[20%]">Email</TableHead>
            <TableHead className="w-[10%]">Статус</TableHead>
            <TableHead className="w-[19%]">Роли</TableHead>
            <TableHead className="w-[15%]">Последний вход</TableHead>
            <TableHead className="w-[13%] text-right">Действия</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
            {[...Array(5)].map((_, i) => (
              <TableRow key={i}>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Skeleton className="w-7 h-7 rounded-lg bg-secondary" />
                    <Skeleton className="h-4 w-32 bg-secondary" />
                  </div>
                </TableCell>
                <TableCell><Skeleton className="h-4 w-40 bg-secondary" /></TableCell>
                <TableCell><Skeleton className="h-5 w-16 bg-secondary" /></TableCell>
                <TableCell><Skeleton className="h-5 w-20 bg-secondary" /></TableCell>
                <TableCell><Skeleton className="h-4 w-24 bg-secondary" /></TableCell>
                <TableCell><Skeleton className="h-7 w-24 bg-secondary ml-auto" /></TableCell>
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
          <TableHead className="w-[23%]">Пользователь</TableHead>
          <TableHead className="w-[20%]">Email</TableHead>
          <TableHead className="w-[10%]">Статус</TableHead>
          <TableHead className="w-[19%]">Роли</TableHead>
          <TableHead className="w-[15%]">Последний вход</TableHead>
          <TableHead className="w-[13%] text-right">Действия</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
          {users.map((user) => (
            <TableRow key={user.id}>
              <TableCell>
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 bg-secondary rounded-lg flex items-center justify-center flex-shrink-0">
                    <User className="w-3.5 h-3.5 text-foreground/80" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="font-medium text-foreground text-sm truncate">
                      {user.name}
                    </div>
                  </div>
                </div>
              </TableCell>
              <TableCell>
                <div className="text-foreground/80 text-sm truncate">{user.email}</div>
              </TableCell>
              <TableCell>
                <Badge
                  variant="outline"
                  className={user.status === 'active'
                    ? 'text-xs border-border bg-secondary text-foreground'
                    : 'text-xs border-red-200 bg-red-50 text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300'}
                >
                  {user.status === 'active' ? 'Активен' : 'Неактивен'}
                </Badge>
              </TableCell>
              <TableCell>
                <div className="flex flex-wrap gap-1">
                  {user.roles?.map((role, index) => (
                    <Badge key={`${role.role_id}-${index}`} variant="outline" className="text-xs border-border text-foreground/80">
                      {role.role_name}
                    </Badge>
                  ))}
                </div>
              </TableCell>
              <TableCell>
                <div className="text-foreground/80 text-sm">{formatDate(user.last_login)}</div>
              </TableCell>
              <TableCell className="text-right">
                <div className="flex items-center justify-end gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onEdit(user)}
                    className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground hover:bg-secondary"
                    title="Редактировать пользователя"
                  >
                    <Edit className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onDelete(user)}
                    className="h-7 w-7 p-0 text-muted-foreground hover:text-red-400 hover:bg-secondary"
                    title="Удалить пользователя"
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
