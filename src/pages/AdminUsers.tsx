import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { 
  Users, 
  Plus, 
  Search,
  MoreHorizontal,
  Shield,
  Mail,
  Calendar
} from "lucide-react";

const AdminUsers = () => {
  const users = [
    {
      id: 1,
      name: "Иван Петров",
      email: "ivan.petrov@example.com",
      role: "Администратор",
      status: "Активный",
      lastLogin: "2024-01-15",
      network: "Сеть А"
    },
    {
      id: 2,
      name: "Мария Сидорова",
      email: "maria.sidorova@example.com",
      role: "Оператор",
      status: "Активный",
      lastLogin: "2024-01-14",
      network: "Сеть Б"
    },
    {
      id: 3,
      name: "Алексей Смирнов",
      email: "alexey.smirnov@example.com",
      role: "Менеджер",
      status: "Неактивный",
      lastLogin: "2024-01-10",
      network: "Сеть А"
    }
  ];

  const getRoleColor = (role: string) => {
    switch (role) {
      case "Администратор": return "destructive";
      case "Менеджер": return "default";
      case "Оператор": return "secondary";
      default: return "outline";
    }
  };

  const getStatusColor = (status: string) => {
    return status === "Активный" ? "default" : "secondary";
  };

  return (
    <MainLayout>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex flex-col space-y-4 lg:flex-row lg:items-center lg:justify-between lg:space-y-0">
          <div className="space-y-2">
            <h1 className="text-4xl font-bold text-foreground flex items-center gap-3">
              <Users className="h-8 w-8" />
              Пользователи и роли
            </h1>
            <p className="text-muted-foreground text-lg">
              Управление пользователями системы и их правами доступа
            </p>
          </div>
          
          <Button className="gap-2 lg:w-auto w-full">
            <Plus className="h-4 w-4" />
            Добавить пользователя
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="shadow-soft border-border/50">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Users className="h-4 w-4" />
                Всего пользователей
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-foreground">127</div>
              <p className="text-xs text-success mt-1">+3 за неделю</p>
            </CardContent>
          </Card>

          <Card className="shadow-soft border-border/50">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Shield className="h-4 w-4" />
                Администраторы
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-foreground">8</div>
              <p className="text-xs text-muted-foreground mt-1">Активных ролей</p>
            </CardContent>
          </Card>

          <Card className="shadow-soft border-border/50">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Активных сегодня
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-foreground">45</div>
              <p className="text-xs text-success mt-1">+12% к вчера</p>
            </CardContent>
          </Card>

          <Card className="shadow-soft border-border/50">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Mail className="h-4 w-4" />
                Ожидают активации
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-warning">2</div>
              <p className="text-xs text-muted-foreground mt-1">Требуют действий</p>
            </CardContent>
          </Card>
        </div>

        {/* Users Table */}
        <Card className="shadow-soft border-border/50">
          <CardHeader>
            <div className="flex flex-col space-y-4 lg:flex-row lg:items-center lg:justify-between lg:space-y-0">
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Список пользователей
              </CardTitle>
              
              <div className="flex gap-2 w-full lg:w-auto">
                <div className="relative flex-1 lg:w-80">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input 
                    placeholder="Поиск пользователей..."
                    className="pl-10"
                  />
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Пользователь</TableHead>
                    <TableHead>Роль</TableHead>
                    <TableHead>Сеть</TableHead>
                    <TableHead>Статус</TableHead>
                    <TableHead>Последний вход</TableHead>
                    <TableHead className="text-right">Действия</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell>
                        <div className="space-y-1">
                          <div className="font-medium">{user.name}</div>
                          <div className="text-sm text-muted-foreground">{user.email}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={getRoleColor(user.role)}>
                          {user.role}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {user.network}
                      </TableCell>
                      <TableCell>
                        <Badge variant={getStatusColor(user.status)}>
                          {user.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {user.lastLogin}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
};

export default AdminUsers;