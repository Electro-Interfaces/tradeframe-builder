import { useState, useMemo } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "@/hooks/use-toast";
import { useIsMobile } from "@/hooks/use-mobile";
import { 
  Users, 
  UserPlus, 
  Edit, 
  Trash2, 
  Shield, 
  ShieldCheck,
  Eye,
  Settings,
  Plus,
  Search,
  MoreHorizontal,
  UserCheck,
  Clock,
  UserX,
  X,
  Grid3X3
} from "lucide-react";

// Mock system roles
const systemRoles = [
  {
    id: 1,
    name: "Супер Администратор",
    code: "super_admin",
    scope: "Global",
    description: "Полные права доступа ко всей системе",
    isSystem: true,
    permissions: ["all"]
  },
  {
    id: 2,
    name: "Администратор Сети",
    code: "network_admin",
    scope: "Network",
    description: "Администрирование конкретной сети АЗС",
    isSystem: true,
    permissions: ["network.manage", "points.manage", "users.manage"]
  },
  {
    id: 3,
    name: "Менеджер Точки",
    code: "point_manager",
    scope: "Trading Point",
    description: "Управление конкретной торговой точкой",
    isSystem: true,
    permissions: ["point.manage", "prices.edit", "reports.view"]
  },
  {
    id: 4,
    name: "Оператор / Кассир",
    code: "operator",
    scope: "Trading Point",
    description: "Операционная деятельность на торговой точке",
    isSystem: true,
    permissions: ["transactions.create", "shifts.manage", "reports.view"]
  },
  {
    id: 5,
    name: "Водитель Экспедитор",
    code: "driver",
    scope: "Assigned",
    description: "Регистрация сливов и транспортные операции",
    isSystem: true,
    permissions: ["deliveries.register", "fuel.unload"]
  }
];

// Mock custom roles
const mockCustomRoles = [
  {
    id: 6,
    name: "Аналитик",
    code: "analyst",
    scope: "Network",
    description: "Анализ данных и отчетность",
    isSystem: false,
    permissions: ["reports.view", "analytics.access", "data.export"]
  }
];

// Mock users with extended data
const mockUsersData = [
  {
    id: 1,
    name: "Иван",
    surname: "Иванов",
    email: "ivan@company.com",
    status: "active",
    roles: [
      { roleId: 1, roleName: "Супер Администратор", scope: "Global", scopeValue: null }
    ]
  },
  {
    id: 2,
    name: "Петр",
    surname: "Петров",
    email: "petr@company.com",
    status: "pending",
    roles: [
      { roleId: 2, roleName: "Администратор Сети", scope: "Network", scopeValue: "Сеть Центр" }
    ]
  },
  {
    id: 3,
    name: "Мария",
    surname: "Сидорова",
    email: "maria@company.com",
    status: "active",
    roles: [
      { roleId: 3, roleName: "Менеджер Точки", scope: "Trading Point", scopeValue: "АЗС-5 на Ленина" }
    ]
  },
  {
    id: 4,
    name: "Алексей",
    surname: "Козлов",
    email: "alexey@company.com",
    status: "blocked",
    roles: []
  },
  {
    id: 5,
    name: "Анна",
    surname: "Смирнова",
    email: "anna@company.com",
    status: "pending",
    roles: []
  }
];

// Mock networks and points for scope selection
const mockNetworks = ["Сеть Центр", "Сеть Запад", "Сеть Восток"];
const mockPoints = ["АЗС-1 на Московской", "АЗС-5 на Ленина", "АЗС-7 на Гагарина"];

// Permission matrix structure
const permissionModules = [
  {
    id: "equipment",
    name: "Оборудование",
    permissions: [
      { id: "equipment.view", name: "Просмотр" },
      { id: "equipment.edit", name: "Создание/Редактирование" },
      { id: "equipment.delete", name: "Удаление" },
      { id: "equipment.commands", name: "Выполнение команд" }
    ]
  },
  {
    id: "prices",
    name: "Цены",
    permissions: [
      { id: "prices.view", name: "Просмотр" },
      { id: "prices.edit", name: "Создание/Редактирование" },
      { id: "prices.delete", name: "Удаление" }
    ]
  },
  {
    id: "reports",
    name: "Отчеты",
    permissions: [
      { id: "reports.view", name: "Просмотр" },
      { id: "reports.create", name: "Создание/Редактирование" },
      { id: "reports.export", name: "Экспорт" }
    ]
  },
  {
    id: "users",
    name: "Пользователи",
    permissions: [
      { id: "users.view", name: "Просмотр" },
      { id: "users.edit", name: "Создание/Редактирование" },
      { id: "users.delete", name: "Удаление" },
      { id: "users.roles", name: "Управление ролями" }
    ]
  }
];

// Schemas
const userFormSchema = z.object({
  name: z.string().min(1, "Имя обязательно"),
  surname: z.string().min(1, "Фамилия обязательна"),
  email: z.string().email("Некорректный email"),
  password: z.string().min(6, "Пароль должен содержать минимум 6 символов").optional(),
  status: z.string().min(1, "Статус обязателен"),
});

const roleFormSchema = z.object({
  name: z.string().min(1, "Название роли обязательно"),
  code: z.string().min(1, "Код роли обязателен"),
  scope: z.string().min(1, "Область действия обязательна"),
  description: z.string().optional(),
});

const roleAssignmentSchema = z.object({
  roleId: z.number(),
  scopeValue: z.string().optional(),
});

type UserFormData = z.infer<typeof userFormSchema>;
type RoleFormData = z.infer<typeof roleFormSchema>;
type RoleAssignmentData = z.infer<typeof roleAssignmentSchema>;

export default function AdminUsers() {
  const [allRoles, setAllRoles] = useState([...systemRoles, ...mockCustomRoles]);
  const [users, setUsers] = useState(mockUsersData);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [userDialogOpen, setUserDialogOpen] = useState(false);
  const [roleDialogOpen, setRoleDialogOpen] = useState(false);
  const [roleAssignmentOpen, setRoleAssignmentOpen] = useState(false);
  const [permissionsDialogOpen, setPermissionsDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [selectedRole, setSelectedRole] = useState<any>(null);
  const [userToDelete, setUserToDelete] = useState<any>(null);
  const [rolePermissions, setRolePermissions] = useState<{[key: string]: boolean}>({});
  const [isEditing, setIsEditing] = useState(false);
  const isMobile = useIsMobile();

  const userForm = useForm<UserFormData>({
    resolver: zodResolver(userFormSchema),
    defaultValues: { name: "", surname: "", email: "", password: "", status: "active" },
  });

  const roleForm = useForm<RoleFormData>({
    resolver: zodResolver(roleFormSchema),
    defaultValues: { name: "", code: "", scope: "", description: "" },
  });

  const roleAssignmentForm = useForm<RoleAssignmentData>({
    resolver: zodResolver(roleAssignmentSchema),
    defaultValues: { roleId: 0, scopeValue: "" },
  });

  // Filtered users based on search and status filter
  const filteredUsers = useMemo(() => {
    return users.filter(user => {
      const matchesSearch = searchTerm === "" || 
        user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.surname.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesStatus = statusFilter === null || user.status === statusFilter;
      
      return matchesSearch && matchesStatus;
    });
  }, [users, searchTerm, statusFilter]);

  // Calculate KPI statistics
  const userStats = useMemo(() => {
    return {
      total: users.length,
      active: users.filter(u => u.status === "active").length,
      pending: users.filter(u => u.status === "pending").length,
      blocked: users.filter(u => u.status === "blocked").length,
    };
  }, [users]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active": return "bg-success/20 text-success border-success/30";
      case "pending": return "bg-warning/20 text-warning border-warning/30";
      case "blocked": return "bg-destructive/20 text-destructive border-destructive/30";
      default: return "bg-muted/20 text-muted-foreground border-muted/30";
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case "active": return "Активен";
      case "pending": return "Ожидает активации";
      case "blocked": return "Заблокирован";
      default: return "Неизвестно";
    }
  };

  const getRoleTypeColor = (isSystem: boolean) => {
    return isSystem 
      ? "bg-primary/20 text-primary border-primary/30"
      : "bg-secondary/20 text-secondary-foreground border-secondary/30";
  };

  const handleEditUser = (user: any) => {
    setSelectedUser(user);
    setIsEditing(true);
    userForm.setValue("name", user.name);
    userForm.setValue("surname", user.surname);
    userForm.setValue("email", user.email);
    userForm.setValue("status", user.status);
    setUserDialogOpen(true);
  };

  const handleCreateUser = () => {
    setSelectedUser(null);
    setIsEditing(false);
    userForm.reset();
    setUserDialogOpen(true);
  };

  const onSubmitUser = (data: UserFormData) => {
    if (isEditing && selectedUser) {
      setUsers(prev => prev.map(user => 
        user.id === selectedUser.id 
          ? { ...user, name: data.name, surname: data.surname, email: data.email, status: data.status }
          : user
      ));
      toast({ title: "Пользователь обновлен" });
    } else {
      const newUser = {
        id: users.length + 1,
        name: data.name,
        surname: data.surname,
        email: data.email,
        status: data.status,
        roles: []
      };
      setUsers(prev => [...prev, newUser]);
      toast({ title: "Пользователь создан" });
    }
    setUserDialogOpen(false);
    userForm.reset();
  };

  const handleDeleteUser = (user: any) => {
    setUserToDelete(user);
    setDeleteDialogOpen(true);
  };

  const confirmDeleteUser = () => {
    if (userToDelete) {
      setUsers(prev => prev.filter(user => user.id !== userToDelete.id));
      toast({ title: "Пользователь удален" });
      setDeleteDialogOpen(false);
      setUserToDelete(null);
    }
  };

  const handleManageUserRoles = (user: any) => {
    setSelectedUser(user);
    roleAssignmentForm.reset();
    setRoleAssignmentOpen(true);
  };

  const onSubmitRoleAssignment = (data: RoleAssignmentData) => {
    const role = allRoles.find(r => r.id === data.roleId);
    if (!role || !selectedUser) return;

    const newRole = {
      roleId: role.id,
      roleName: role.name,
      scope: role.scope,
      scopeValue: data.scopeValue || null
    };

    setUsers(prev => prev.map(user => 
      user.id === selectedUser.id 
        ? { ...user, roles: [...user.roles, newRole] }
        : user
    ));

    setRoleAssignmentOpen(false);
    roleAssignmentForm.reset();
    toast({ title: "Роль назначена пользователю" });
  };

  const handleRemoveUserRole = (userId: number, roleIndex: number) => {
    setUsers(prev => prev.map(user => 
      user.id === userId 
        ? { ...user, roles: user.roles.filter((_, index) => index !== roleIndex) }
        : user
    ));
    toast({ title: "Роль удалена у пользователя" });
  };

  const handleViewPermissions = (role: any) => {
    setSelectedRole(role);
    // Initialize permissions state for the role
    const permissions: {[key: string]: boolean} = {};
    permissionModules.forEach(module => {
      module.permissions.forEach(permission => {
        permissions[permission.id] = role.permissions.includes(permission.id) || role.permissions.includes("all");
      });
    });
    setRolePermissions(permissions);
    setPermissionsDialogOpen(true);
  };

  const handlePermissionChange = (permissionId: string, checked: boolean) => {
    setRolePermissions(prev => ({
      ...prev,
      [permissionId]: checked
    }));
  };

  const handleKPICardClick = (status: string | null) => {
    setStatusFilter(status);
  };

  const onSubmitRole = (data: RoleFormData) => {
    const newRole = {
      id: allRoles.length + 1,
      name: data.name,
      code: data.code,
      scope: data.scope,
      description: data.description || "",
      isSystem: false,
      permissions: []
    };
    setAllRoles(prev => [...prev, newRole]);
    setRoleDialogOpen(false);
    roleForm.reset();
    toast({ title: "Роль создана" });
  };

  const selectedRoleForAssignment = roleAssignmentForm.watch("roleId");
  const roleForScopeSelection = allRoles.find(r => r.id === selectedRoleForAssignment);

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className={`${isMobile ? 'text-2xl' : 'text-3xl'} font-bold text-foreground`}>
            Пользователи и роли
          </h1>
          <p className={`text-muted-foreground ${isMobile ? 'text-sm' : ''}`}>
            Управление пользователями и ролями системы
          </p>
        </div>

        <Tabs defaultValue="users" className="space-y-6">
          <TabsList className={`grid w-full grid-cols-2 ${isMobile ? 'h-10' : 'h-12'}`}>
            <TabsTrigger value="users" className={isMobile ? 'text-sm' : ''}>
              <Users className="w-4 h-4 mr-2" />
              Пользователи
            </TabsTrigger>
            <TabsTrigger value="roles" className={isMobile ? 'text-sm' : ''}>
              <Shield className="w-4 h-4 mr-2" />
              Роли
            </TabsTrigger>
          </TabsList>

          {/* Users Tab */}
          <TabsContent value="users" className="space-y-6">
            {/* KPI Cards */}
            <div className={`grid gap-4 ${isMobile ? 'grid-cols-2' : 'grid-cols-4'}`}>
              <Card 
                className={`cursor-pointer transition-colors hover:bg-accent/50 ${statusFilter === null ? 'ring-2 ring-primary' : ''}`}
                onClick={() => handleKPICardClick(null)}
              >
                <CardContent className="pt-4">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-primary" />
                    <span className={`text-muted-foreground ${isMobile ? 'text-xs' : 'text-sm'}`}>Всего</span>
                  </div>
                  <div className={`${isMobile ? 'text-xl' : 'text-2xl'} font-bold text-foreground`}>
                    {userStats.total}
                  </div>
                </CardContent>
              </Card>

              <Card 
                className={`cursor-pointer transition-colors hover:bg-accent/50 ${statusFilter === 'active' ? 'ring-2 ring-primary' : ''}`}
                onClick={() => handleKPICardClick('active')}
              >
                <CardContent className="pt-4">
                  <div className="flex items-center gap-2">
                    <UserCheck className="h-4 w-4 text-success" />
                    <span className={`text-muted-foreground ${isMobile ? 'text-xs' : 'text-sm'}`}>Активных</span>
                  </div>
                  <div className={`${isMobile ? 'text-xl' : 'text-2xl'} font-bold text-foreground`}>
                    {userStats.active}
                  </div>
                </CardContent>
              </Card>

              <Card 
                className={`cursor-pointer transition-colors hover:bg-accent/50 ${statusFilter === 'pending' ? 'ring-2 ring-primary' : ''}`}
                onClick={() => handleKPICardClick('pending')}
              >
                <CardContent className="pt-4">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-warning" />
                    <span className={`text-muted-foreground ${isMobile ? 'text-xs' : 'text-sm'}`}>Ожидают</span>
                  </div>
                  <div className={`${isMobile ? 'text-xl' : 'text-2xl'} font-bold text-foreground`}>
                    {userStats.pending}
                  </div>
                </CardContent>
              </Card>

              <Card 
                className={`cursor-pointer transition-colors hover:bg-accent/50 ${statusFilter === 'blocked' ? 'ring-2 ring-primary' : ''}`}
                onClick={() => handleKPICardClick('blocked')}
              >
                <CardContent className="pt-4">
                  <div className="flex items-center gap-2">
                    <UserX className="h-4 w-4 text-destructive" />
                    <span className={`text-muted-foreground ${isMobile ? 'text-xs' : 'text-sm'}`}>Заблокированы</span>
                  </div>
                  <div className={`${isMobile ? 'text-xl' : 'text-2xl'} font-bold text-foreground`}>
                    {userStats.blocked}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Users Control Panel */}
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="relative flex-1 lg:max-w-sm">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input 
                  placeholder="Поиск пользователей..."
                  className="pl-10"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <Button onClick={handleCreateUser}>
                <UserPlus className="h-4 w-4 mr-2" />
                Добавить пользователя
              </Button>
            </div>

            {/* Users Table/Cards */}
            {isMobile ? (
              <div className="space-y-4">
                {filteredUsers.map((user) => (
                  <Card key={user.id}>
                    <CardContent className="pt-4">
                      <div className="space-y-3">
                        <div className="flex items-start justify-between">
                          <div>
                            <div className="font-medium">{user.name} {user.surname}</div>
                            <div className="text-sm text-muted-foreground">{user.email}</div>
                          </div>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => handleEditUser(user)}>
                                <Edit className="h-4 w-4 mr-2" />
                                Редактировать
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleManageUserRoles(user)}>
                                <Settings className="h-4 w-4 mr-2" />
                                Управление ролями
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleDeleteUser(user)} className="text-destructive">
                                <Trash2 className="h-4 w-4 mr-2" />
                                Удалить
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                        
                        <div className="flex flex-wrap gap-2">
                          {user.roles.map((role, index) => (
                            <Badge key={index} variant="secondary" className="text-xs">
                              {role.roleName}
                              {role.scopeValue && <span className="ml-1">({role.scopeValue})</span>}
                            </Badge>
                          ))}
                        </div>
                        
                        <div className="flex items-center justify-between">
                          <Badge className={`text-xs ${getStatusColor(user.status)}`}>
                            {getStatusText(user.status)}
                          </Badge>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <Card>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Пользователь</TableHead>
                      <TableHead>Роли</TableHead>
                      <TableHead>Статус</TableHead>
                      <TableHead className="text-right">Действия</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredUsers.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell>
                          <div>
                            <div className="font-medium">{user.name} {user.surname}</div>
                            <div className="text-sm text-muted-foreground">{user.email}</div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {user.roles.map((role, index) => (
                              <Badge key={index} variant="secondary" className="text-xs">
                                {role.roleName}
                                {role.scopeValue && <span className="ml-1">({role.scopeValue})</span>}
                              </Badge>
                            ))}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className={`${getStatusColor(user.status)}`}>
                            {getStatusText(user.status)}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => handleEditUser(user)}>
                                <Edit className="h-4 w-4 mr-2" />
                                Редактировать
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleManageUserRoles(user)}>
                                <Settings className="h-4 w-4 mr-2" />
                                Управление ролями
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleDeleteUser(user)} className="text-destructive">
                                <Trash2 className="h-4 w-4 mr-2" />
                                Удалить
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Card>
            )}
          </TabsContent>

          {/* Roles Tab */}
          <TabsContent value="roles" className="space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-xl font-semibold">Роли системы</h2>
                <p className="text-muted-foreground text-sm">Системные и пользовательские роли</p>
              </div>
              <Button onClick={() => setRoleDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Создать роль
              </Button>
            </div>

            {isMobile ? (
              <div className="space-y-4">
                {allRoles.map((role) => (
                  <Card key={role.id}>
                    <CardContent className="pt-4">
                      <div className="space-y-3">
                        <div className="flex items-start justify-between">
                          <div>
                            <div className="font-medium">{role.name}</div>
                            <div className="text-sm text-muted-foreground">{role.code}</div>
                          </div>
                          <Badge className={getRoleTypeColor(role.isSystem)}>
                            {role.isSystem ? 'Системная' : 'Кастомная'}
                          </Badge>
                        </div>
                        
                        <div className="text-sm">
                          <div><strong>Область:</strong> {role.scope}</div>
                          <div className="text-muted-foreground mt-1">{role.description}</div>
                        </div>
                        
                        <div className="flex gap-2">
                          <Button size="sm" variant="outline" onClick={() => handleViewPermissions(role)}>
                            <Eye className="h-4 w-4 mr-1" />
                            Права
                          </Button>
                          {!role.isSystem && (
                            <Button size="sm" variant="ghost" className="text-destructive">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <Card>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Название роли</TableHead>
                      <TableHead>Код</TableHead>
                      <TableHead>Область действия</TableHead>
                      <TableHead>Тип</TableHead>
                      <TableHead className="text-right">Действия</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {allRoles.map((role) => (
                      <TableRow key={role.id}>
                        <TableCell>
                          <div>
                            <div className="font-medium">{role.name}</div>
                            <div className="text-sm text-muted-foreground">{role.description}</div>
                          </div>
                        </TableCell>
                        <TableCell className="font-mono text-sm">{role.code}</TableCell>
                        <TableCell>{role.scope}</TableCell>
                        <TableCell>
                          <Badge className={getRoleTypeColor(role.isSystem)}>
                            {role.isSystem ? 'Системная' : 'Кастомная'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button size="sm" variant="outline" onClick={() => handleViewPermissions(role)}>
                              <Eye className="h-4 w-4" />
                            </Button>
                            {!role.isSystem && (
                              <>
                                <Button size="sm" variant="ghost">
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button size="sm" variant="ghost" className="text-destructive">
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Card>
            )}
          </TabsContent>
        </Tabs>

        {/* User Creation/Edit Dialog */}
        <Dialog open={userDialogOpen} onOpenChange={setUserDialogOpen}>
          <DialogContent className={isMobile ? "w-[95vw]" : ""}>
            <DialogHeader>
              <DialogTitle>
                {isEditing ? 'Редактировать пользователя' : 'Создать пользователя'}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={userForm.handleSubmit(onSubmitUser)} className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <Label htmlFor="name">Имя</Label>
                  <Input 
                    id="name" 
                    {...userForm.register("name")}
                    placeholder="Введите имя"
                  />
                  {userForm.formState.errors.name && (
                    <p className="text-sm text-destructive">{userForm.formState.errors.name.message}</p>
                  )}
                </div>
                <div>
                  <Label htmlFor="surname">Фамилия</Label>
                  <Input 
                    id="surname" 
                    {...userForm.register("surname")}
                    placeholder="Введите фамилию"
                  />
                  {userForm.formState.errors.surname && (
                    <p className="text-sm text-destructive">{userForm.formState.errors.surname.message}</p>
                  )}
                </div>
              </div>

              <div>
                <Label htmlFor="email">Email</Label>
                <Input 
                  id="email" 
                  type="email"
                  {...userForm.register("email")}
                  placeholder="user@example.com"
                />
                {userForm.formState.errors.email && (
                  <p className="text-sm text-destructive">{userForm.formState.errors.email.message}</p>
                )}
              </div>

              {!isEditing && (
                <div>
                  <Label htmlFor="password">Пароль</Label>
                  <Input 
                    id="password" 
                    type="password"
                    {...userForm.register("password")}
                    placeholder="Минимум 6 символов"
                  />
                  {userForm.formState.errors.password && (
                    <p className="text-sm text-destructive">{userForm.formState.errors.password.message}</p>
                  )}
                </div>
              )}

              <div>
                <Label htmlFor="status">Статус</Label>
                <Select onValueChange={(value) => userForm.setValue("status", value)} value={userForm.watch("status")}>
                  <SelectTrigger>
                    <SelectValue placeholder="Выберите статус" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Активен</SelectItem>
                    <SelectItem value="pending">Ожидает активации</SelectItem>
                    <SelectItem value="blocked">Заблокирован</SelectItem>
                  </SelectContent>
                </Select>
                {userForm.formState.errors.status && (
                  <p className="text-sm text-destructive">{userForm.formState.errors.status.message}</p>
                )}
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="outline" onClick={() => setUserDialogOpen(false)}>
                  Отмена
                </Button>
                <Button type="submit">
                  {isEditing ? 'Сохранить' : 'Создать'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        {/* Role Assignment Dialog */}
        <Dialog open={roleAssignmentOpen} onOpenChange={setRoleAssignmentOpen}>
          <DialogContent className={isMobile ? "w-[95vw]" : ""}>
            <DialogHeader>
              <DialogTitle>Управление ролями пользователя</DialogTitle>
            </DialogHeader>
            
            {selectedUser && (
              <div className="space-y-6">
                <div>
                  <h4 className="font-medium mb-2">Пользователь: {selectedUser.name} {selectedUser.surname}</h4>
                  <p className="text-sm text-muted-foreground">{selectedUser.email}</p>
                </div>

                <div>
                  <h4 className="font-medium mb-3">Назначенные роли:</h4>
                  {selectedUser.roles.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Роли не назначены</p>
                  ) : (
                    <div className="space-y-2">
                      {selectedUser.roles.map((role: any, index: number) => (
                        <div key={index} className="flex items-center justify-between p-2 bg-muted rounded">
                          <div>
                            <span className="font-medium">{role.roleName}</span>
                            {role.scopeValue && (
                              <span className="text-sm text-muted-foreground ml-2">({role.scopeValue})</span>
                            )}
                          </div>
                          <Button 
                            size="sm" 
                            variant="ghost" 
                            onClick={() => handleRemoveUserRole(selectedUser.id, index)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <form onSubmit={roleAssignmentForm.handleSubmit(onSubmitRoleAssignment)} className="space-y-4">
                  <div>
                    <Label>Добавить роль</Label>
                    <Select onValueChange={(value) => roleAssignmentForm.setValue("roleId", parseInt(value))}>
                      <SelectTrigger>
                        <SelectValue placeholder="Выберите роль" />
                      </SelectTrigger>
                      <SelectContent>
                        {allRoles.map((role) => (
                          <SelectItem key={role.id} value={role.id.toString()}>
                            {role.name} ({role.scope})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {roleForScopeSelection && roleForScopeSelection.scope === "Network" && (
                    <div>
                      <Label>Выберите сеть</Label>
                      <Select onValueChange={(value) => roleAssignmentForm.setValue("scopeValue", value)}>
                        <SelectTrigger>
                          <SelectValue placeholder="Выберите сеть" />
                        </SelectTrigger>
                        <SelectContent>
                          {mockNetworks.map((network) => (
                            <SelectItem key={network} value={network}>
                              {network}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  {roleForScopeSelection && roleForScopeSelection.scope === "Trading Point" && (
                    <div>
                      <Label>Выберите торговую точку</Label>
                      <Select onValueChange={(value) => roleAssignmentForm.setValue("scopeValue", value)}>
                        <SelectTrigger>
                          <SelectValue placeholder="Выберите точку" />
                        </SelectTrigger>
                        <SelectContent>
                          {mockPoints.map((point) => (
                            <SelectItem key={point} value={point}>
                              {point}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  <div className="flex justify-end gap-2 pt-4">
                    <Button type="button" variant="outline" onClick={() => setRoleAssignmentOpen(false)}>
                      Закрыть
                    </Button>
                    <Button type="submit">Назначить роль</Button>
                  </div>
                </form>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Role Creation Dialog */}
        <Dialog open={roleDialogOpen} onOpenChange={setRoleDialogOpen}>
          <DialogContent className={isMobile ? "w-[95vw]" : ""}>
            <DialogHeader>
              <DialogTitle>Создать роль</DialogTitle>
            </DialogHeader>
            <form onSubmit={roleForm.handleSubmit(onSubmitRole)} className="space-y-4">
              <div>
                <Label htmlFor="roleName">Название роли</Label>
                <Input 
                  id="roleName" 
                  {...roleForm.register("name")}
                  placeholder="Введите название роли"
                />
                {roleForm.formState.errors.name && (
                  <p className="text-sm text-destructive">{roleForm.formState.errors.name.message}</p>
                )}
              </div>

              <div>
                <Label htmlFor="roleCode">Код роли</Label>
                <Input 
                  id="roleCode" 
                  {...roleForm.register("code")}
                  placeholder="role_code"
                />
                {roleForm.formState.errors.code && (
                  <p className="text-sm text-destructive">{roleForm.formState.errors.code.message}</p>
                )}
              </div>

              <div>
                <Label htmlFor="roleScope">Область действия</Label>
                <Select onValueChange={(value) => roleForm.setValue("scope", value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Выберите область действия" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Global">Global (Вся система)</SelectItem>
                    <SelectItem value="Network">Network (Сеть)</SelectItem>
                    <SelectItem value="Trading Point">Trading Point (Торговая точка)</SelectItem>
                    <SelectItem value="Assigned">Assigned (Назначенная область)</SelectItem>
                  </SelectContent>
                </Select>
                {roleForm.formState.errors.scope && (
                  <p className="text-sm text-destructive">{roleForm.formState.errors.scope.message}</p>
                )}
              </div>

              <div>
                <Label htmlFor="roleDescription">Описание</Label>
                <Textarea 
                  id="roleDescription" 
                  {...roleForm.register("description")}
                  placeholder="Описание роли"
                />
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="outline" onClick={() => setRoleDialogOpen(false)}>
                  Отмена
                </Button>
                <Button type="submit">Создать</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        {/* Permissions Matrix Dialog */}
        <Dialog open={permissionsDialogOpen} onOpenChange={setPermissionsDialogOpen}>
          <DialogContent className={`${isMobile ? "w-[95vw] h-[90vh]" : "max-w-4xl max-h-[80vh]"} overflow-hidden`}>
            <DialogHeader>
              <DialogTitle>
                Права доступа роли: {selectedRole?.name}
              </DialogTitle>
            </DialogHeader>
            
            <div className="flex-1 overflow-auto">
              {isMobile ? (
                <Accordion type="single" collapsible className="space-y-2">
                  {permissionModules.map((module) => (
                    <AccordionItem key={module.id} value={module.id}>
                      <AccordionTrigger className="text-left">
                        {module.name}
                      </AccordionTrigger>
                      <AccordionContent>
                        <div className="space-y-3 pt-2">
                          {module.permissions.map((permission) => (
                            <div key={permission.id} className="flex items-center justify-between">
                              <label htmlFor={permission.id} className="text-sm">
                                {permission.name}
                              </label>
                              <Checkbox
                                id={permission.id}
                                checked={rolePermissions[permission.id] || false}
                                onCheckedChange={(checked) => 
                                  handlePermissionChange(permission.id, checked as boolean)
                                }
                                disabled={selectedRole?.isSystem}
                              />
                            </div>
                          ))}
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              ) : (
                <div className="border rounded-lg">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[200px]">Модуль</TableHead>
                        {permissionModules[0]?.permissions.map((permission) => (
                          <TableHead key={permission.id} className="text-center">
                            {permission.name}
                          </TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {permissionModules.map((module) => (
                        <TableRow key={module.id}>
                          <TableCell className="font-medium">{module.name}</TableCell>
                          {module.permissions.map((permission) => (
                            <TableCell key={permission.id} className="text-center">
                              <Checkbox
                                checked={rolePermissions[permission.id] || false}
                                onCheckedChange={(checked) => 
                                  handlePermissionChange(permission.id, checked as boolean)
                                }
                                disabled={selectedRole?.isSystem}
                              />
                            </TableCell>
                          ))}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t">
              <Button variant="outline" onClick={() => setPermissionsDialogOpen(false)}>
                Закрыть
              </Button>
              {!selectedRole?.isSystem && (
                <Button>Сохранить права</Button>
              )}
            </div>
          </DialogContent>
        </Dialog>

        {/* Delete User Dialog */}
        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Удалить пользователя?</AlertDialogTitle>
              <AlertDialogDescription>
                Вы уверены, что хотите удалить пользователя {userToDelete?.name} {userToDelete?.surname}? 
                Это действие нельзя отменить.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Отмена</AlertDialogCancel>
              <AlertDialogAction onClick={confirmDeleteUser}>Удалить</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </MainLayout>
  );
}