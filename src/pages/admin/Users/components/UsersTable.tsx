import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
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
      <div className="overflow-x-auto w-full rounded-lg border border-slate-600">
        <table className="w-full text-sm min-w-full table-fixed">
          <thead className="bg-slate-700">
            <tr>
              <th className="px-4 py-3 text-left text-slate-200 font-medium text-xs uppercase w-[23%]">Пользователь</th>
              <th className="px-4 py-3 text-left text-slate-200 font-medium text-xs uppercase w-[20%]">Email</th>
              <th className="px-4 py-3 text-left text-slate-200 font-medium text-xs uppercase w-[10%]">Статус</th>
              <th className="px-4 py-3 text-left text-slate-200 font-medium text-xs uppercase w-[19%]">Роли</th>
              <th className="px-4 py-3 text-left text-slate-200 font-medium text-xs uppercase w-[15%]">Последний вход</th>
              <th className="px-4 py-3 text-right text-slate-200 font-medium text-xs uppercase w-[13%]">Действия</th>
            </tr>
          </thead>
          <tbody className="bg-slate-800">
            {[...Array(5)].map((_, i) => (
              <tr key={i} className="border-b border-slate-600">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <Skeleton className="w-7 h-7 rounded-lg bg-slate-700" />
                    <Skeleton className="h-4 w-32 bg-slate-700" />
                  </div>
                </td>
                <td className="px-4 py-3"><Skeleton className="h-4 w-40 bg-slate-700" /></td>
                <td className="px-4 py-3"><Skeleton className="h-5 w-16 bg-slate-700" /></td>
                <td className="px-4 py-3"><Skeleton className="h-5 w-20 bg-slate-700" /></td>
                <td className="px-4 py-3"><Skeleton className="h-4 w-24 bg-slate-700" /></td>
                <td className="px-4 py-3"><Skeleton className="h-7 w-24 bg-slate-700 ml-auto" /></td>
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
            <th className="px-4 py-3 text-left text-slate-200 font-medium text-xs uppercase w-[23%]">Пользователь</th>
            <th className="px-4 py-3 text-left text-slate-200 font-medium text-xs uppercase w-[20%]">Email</th>
            <th className="px-4 py-3 text-left text-slate-200 font-medium text-xs uppercase w-[10%]">Статус</th>
            <th className="px-4 py-3 text-left text-slate-200 font-medium text-xs uppercase w-[19%]">Роли</th>
            <th className="px-4 py-3 text-left text-slate-200 font-medium text-xs uppercase w-[15%]">Последний вход</th>
            <th className="px-4 py-3 text-right text-slate-200 font-medium text-xs uppercase w-[13%]">Действия</th>
          </tr>
        </thead>
        <tbody className="bg-slate-800">
          {users.map((user) => (
            <tr key={user.id} className="border-b border-slate-600 hover:bg-slate-700 transition-colors">
              <td className="px-4 py-3">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 bg-slate-700 rounded-lg flex items-center justify-center flex-shrink-0">
                    <User className="w-3.5 h-3.5 text-slate-300" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="font-medium text-white text-sm truncate">
                      {user.name}
                    </div>
                  </div>
                </div>
              </td>
              <td className="px-4 py-3">
                <div className="text-slate-300 text-sm truncate">{user.email}</div>
              </td>
              <td className="px-4 py-3">
                <Badge
                  variant={user.status === 'active' ? 'default' : 'secondary'}
                  className={user.status === 'active' ? 'bg-green-600 text-xs' : 'bg-slate-600 text-xs'}
                >
                  {user.status === 'active' ? 'Активен' : 'Неактивен'}
                </Badge>
              </td>
              <td className="px-4 py-3">
                <div className="flex flex-wrap gap-1">
                  {user.roles?.map((role, index) => (
                    <Badge key={`${role.role_id}-${index}`} variant="outline" className="text-xs border-slate-500 text-slate-300">
                      {role.role_name}
                    </Badge>
                  ))}
                </div>
              </td>
              <td className="px-4 py-3">
                <div className="text-slate-300 text-sm">{formatDate(user.last_login)}</div>
              </td>
              <td className="px-4 py-3 text-right">
                <div className="flex items-center justify-end gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onEdit(user)}
                    className="h-7 w-7 p-0 text-slate-400 hover:text-white hover:bg-slate-700"
                    title="Редактировать пользователя"
                  >
                    <Edit className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onDelete(user)}
                    className="h-7 w-7 p-0 text-slate-400 hover:text-red-400 hover:bg-slate-700"
                    title="Удалить пользователя"
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
