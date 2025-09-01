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

export default function AdminUsersAndRoles() {
  const [allRoles] = useState([...systemRoles, ...mockCustomRoles]);
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
  const roleAssignmentForm = useForm<RoleAssignmentData>({
    resolver: zodResolver(roleAssignmentSchema),
    defaultValues: { roleId: 0, scopeValue: "" },
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active": return "bg-success/20 text-success border-success/30";
      case "inactive": return "bg-muted/20 text-muted-foreground border-muted/30";
      case "blocked": return "bg-destructive/20 text-destructive border-destructive/30";
      default: return "bg-muted/20 text-muted-foreground border-muted/30";
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case "active": return "Активен";
      case "inactive": return "Неактивен";
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

  const selectedRoleForAssignment = roleAssignmentForm.watch("roleId");
  const roleForScopeSelection = allRoles.find(r => r.id === selectedRoleForAssignment);

  return (
    <MainLayout fullWidth={true}>
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

            {/* Search and Actions */}
            <div className={`${isMobile ? 'flex flex-col gap-4' : 'flex justify-between items-center'}`}>
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Поиск пользователей..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
                {statusFilter && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="absolute right-2 top-1/2 transform -translate-y-1/2"
                    onClick={() => setStatusFilter(null)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
              <Button 
                onClick={handleCreateUser}
                className={`${isMobile ? 'w-full' : ''}`}
              >
                <UserPlus className="w-4 h-4 mr-2" />
                Добавить пользователя
              </Button>
            </div>

            {isMobile ? (
              // Mobile: Card layout
              <div className="space-y-4">
                {filteredUsers.map((user) => (
                  <Card key={user.id} className="bg-card border-border">
                    <CardContent className="pt-4">
                      <div className="space-y-3">
                        <div className="flex justify-between items-start">
                          <div>
                            <h3 className="font-semibold text-foreground">{user.name} {user.surname}</h3>
                            <p className="text-sm text-muted-foreground">{user.email}</p>
                          </div>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <MoreHorizontal className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => handleEditUser(user)}>
                                <Edit className="w-4 h-4 mr-2" />
                                Редактировать
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleManageUserRoles(user)}>
                                <Settings className="w-4 h-4 mr-2" />
                                Управление ролями
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleDeleteUser(user)} className="text-destructive">
                                <Trash2 className="w-4 h-4 mr-2" />
                                Удалить
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                        
                        <div className="flex flex-wrap gap-1">
                          {user.roles.map((role, index) => (
                            <Badge key={index} variant="secondary" className="text-xs">
                              {role.roleName}
                              {role.scopeValue && ` (${role.scopeValue})`}
                            </Badge>
                          ))}
                        </div>
                        
                        <div className="flex items-center justify-between">
                          <Badge className={getStatusColor(user.status)}>
                            {getStatusText(user.status)}
                          </Badge>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              // Desktop: Table layout
              <Card className="bg-card border-border">
                <CardContent className="p-6">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Имя</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Роли</TableHead>
                        <TableHead>Статус</TableHead>
                        <TableHead>Действия</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredUsers.map((user) => (
                        <TableRow key={user.id}>
                          <TableCell className="font-medium">{user.name} {user.surname}</TableCell>
                          <TableCell>{user.email}</TableCell>
                          <TableCell>
                            <div className="flex flex-wrap gap-1">
                              {user.roles.map((role, index) => (
                                <Badge key={index} variant="secondary">
                                  {role.roleName}
                                  {role.scopeValue && ` (${role.scopeValue})`}
                                </Badge>
                              ))}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge className={getStatusColor(user.status)}>
                              {getStatusText(user.status)}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm">
                                  <MoreHorizontal className="w-4 h-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => handleEditUser(user)}>
                                  <Edit className="w-4 h-4 mr-2" />
                                  Редактировать
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleManageUserRoles(user)}>
                                  <Settings className="w-4 h-4 mr-2" />
                                  Управление ролями
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleDeleteUser(user)} className="text-destructive">
                                  <Trash2 className="w-4 h-4 mr-2" />
                                  Удалить
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Roles Tab */}
          <TabsContent value="roles" className="space-y-4">
            <div className={`${isMobile ? 'flex flex-col gap-4' : 'flex justify-between items-center'}`}>
              <div>
                <h2 className={`${isMobile ? 'text-lg' : 'text-xl'} font-semibold text-foreground`}>
                  Управление ролями
                </h2>
              </div>
              <Button 
                onClick={() => setRoleDialogOpen(true)}
                className={`${isMobile ? 'w-full' : ''}`}
              >
                <Plus className="w-4 h-4 mr-2" />
                Создать роль
              </Button>
            </div>

            {isMobile ? (
              // Mobile: Card layout
              <div className="space-y-4">
                {allRoles.map((role) => (
                  <Card key={role.id} className="bg-card border-border">
                    <CardContent className="pt-4">
                      <div className="space-y-3">
                        <div className="flex justify-between items-start">
                          <div>
                            <h3 className="font-semibold text-foreground">{role.name}</h3>
                            <p className="text-sm text-muted-foreground">{role.code}</p>
                          </div>
                          <Badge className={getRoleTypeColor(role.isSystem)}>
                            {role.isSystem ? "Системная" : "Кастомная"}
                          </Badge>
                        </div>
                        
                        <div className="text-sm">
                          <span className="text-muted-foreground">Область: </span>
                          <span className="text-foreground">{role.scope}</span>
                        </div>
                        
                        <div className="flex gap-1">
                          <Button variant="ghost" size="sm" onClick={() => handleViewPermissions(role)}>
                            <Eye className="w-4 h-4" />
                          </Button>
                          {!role.isSystem && (
                            <>
                              <Button variant="ghost" size="sm">
                                <Edit className="w-4 h-4" />
                              </Button>
                              <Button variant="ghost" size="sm">
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              // Desktop: Table layout
              <Card className="bg-card border-border">
                <CardContent className="p-6">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Название роли</TableHead>
                        <TableHead>Код</TableHead>
                        <TableHead>Область действия</TableHead>
                        <TableHead>Тип</TableHead>
                        <TableHead>Действия</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {allRoles.map((role) => (
                        <TableRow key={role.id}>
                          <TableCell className="font-medium">{role.name}</TableCell>
                          <TableCell className="font-mono text-sm">{role.code}</TableCell>
                          <TableCell>{role.scope}</TableCell>
                          <TableCell>
                            <Badge className={getRoleTypeColor(role.isSystem)}>
                              {role.isSystem ? "Системная" : "Кастомная"}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              <Button variant="ghost" size="sm" onClick={() => handleViewPermissions(role)}>
                                <Eye className="w-4 h-4" />
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                disabled={role.isSystem}
                                className={role.isSystem ? "opacity-50 cursor-not-allowed" : ""}
                              >
                                <Edit className="w-4 h-4" />
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                disabled={role.isSystem}
                                className={role.isSystem ? "opacity-50 cursor-not-allowed" : ""}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>

        {/* User Create/Edit Dialog */}
        <Dialog open={userDialogOpen} onOpenChange={setUserDialogOpen}>
          <DialogContent className={`${isMobile ? 'w-full mx-4' : 'max-w-md'}`}>
            <DialogHeader>
              <DialogTitle>{isEditing ? "Редактирование пользователя" : "Создание пользователя"}</DialogTitle>
            </DialogHeader>
            <form onSubmit={userForm.handleSubmit(onSubmitUser)} className="space-y-4">
              <div>
                <Label htmlFor="name">Имя *</Label>
                <Input
                  id="name"
                  {...userForm.register("name")}
                  placeholder="Введите имя"
                  className="mt-1"
                />
                {userForm.formState.errors.name && (
                  <p className="text-destructive text-sm mt-1">
                    {userForm.formState.errors.name.message}
                  </p>
                )}
              </div>

              <div>
                <Label htmlFor="surname">Фамилия *</Label>
                <Input
                  id="surname"
                  {...userForm.register("surname")}
                  placeholder="Введите фамилию"
                  className="mt-1"
                />
                {userForm.formState.errors.surname && (
                  <p className="text-destructive text-sm mt-1">
                    {userForm.formState.errors.surname.message}
                  </p>
                )}
              </div>
              
              <div>
                <Label htmlFor="email">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  {...userForm.register("email")}
                  placeholder="user@company.com"
                  className="mt-1"
                />
                {userForm.formState.errors.email && (
                  <p className="text-destructive text-sm mt-1">
                    {userForm.formState.errors.email.message}
                  </p>
                )}
              </div>

              <div>
                <Label htmlFor="status">Статус *</Label>
                <Select onValueChange={(value) => userForm.setValue("status", value)} value={userForm.watch("status")}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Выберите статус" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Активен</SelectItem>
                    <SelectItem value="pending">Ожидает активации</SelectItem>
                    <SelectItem value="blocked">Заблокирован</SelectItem>
                  </SelectContent>
                </Select>
                {userForm.formState.errors.status && (
                  <p className="text-destructive text-sm mt-1">
                    {userForm.formState.errors.status.message}
                  </p>
                )}
              </div>
              
              {!isEditing && (
                <div>
                  <Label htmlFor="password">Пароль *</Label>
                  <Input
                    id="password"
                    type="password"
                    {...userForm.register("password")}
                    placeholder="Минимум 6 символов"
                    className="mt-1"
                  />
                  {userForm.formState.errors.password && (
                    <p className="text-destructive text-sm mt-1">
                      {userForm.formState.errors.password.message}
                    </p>
                  )}
                </div>
              )}
              
              <div className="flex gap-2 pt-4">
                <Button type="button" variant="outline" onClick={() => setUserDialogOpen(false)} className="flex-1">
                  Отмена
                </Button>
                <Button type="submit" className="flex-1">
                  {isEditing ? "Обновить" : "Создать"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Подтверждение удаления</AlertDialogTitle>
              <AlertDialogDescription>
                Вы уверены, что хотите удалить пользователя "{userToDelete?.name} {userToDelete?.surname}"? 
                Это действие нельзя отменить.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Отмена</AlertDialogCancel>
              <AlertDialogAction onClick={confirmDeleteUser} className="bg-destructive hover:bg-destructive/90">
                Удалить
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Role Assignment Dialog */}
        <Dialog open={roleAssignmentOpen} onOpenChange={setRoleAssignmentOpen}>
          <DialogContent className={`${isMobile ? 'w-full mx-4 max-h-[80vh] overflow-y-auto' : 'max-w-2xl max-h-[80vh] overflow-y-auto'}`}>
            <DialogHeader>
              <DialogTitle>Управление ролями пользователя: {selectedUser?.name} {selectedUser?.surname}</DialogTitle>
            </DialogHeader>
            
            <div className="space-y-6">
              {/* Current Roles */}
              <div>
                <h3 className="font-semibold mb-3">Назначенные роли:</h3>
                {selectedUser?.roles.length > 0 ? (
                  <div className="space-y-2">
                    {selectedUser.roles.map((role: any, index: number) => (
                      <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                        <div>
                          <div className="font-medium">{role.roleName}</div>
                          {role.scopeValue && (
                            <div className="text-sm text-muted-foreground">{role.scopeValue}</div>
                          )}
                        </div>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => handleRemoveUserRole(selectedUser.id, index)}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground">Роли не назначены</p>
                )}
              </div>

              {/* Add New Role */}
              <div>
                <h3 className="font-semibold mb-3">Добавить новую роль:</h3>
                <form onSubmit={roleAssignmentForm.handleSubmit(onSubmitRoleAssignment)} className="space-y-4">
                  <div>
                    <Label htmlFor="role">Роль *</Label>
                    <Select onValueChange={(value) => roleAssignmentForm.setValue("roleId", parseInt(value))}>
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder="Выберите роль" />
                      </SelectTrigger>
                      <SelectContent>
                        {allRoles.map((role) => (
                          <SelectItem key={role.id} value={role.id.toString()}>
                            {role.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {roleForScopeSelection && (roleForScopeSelection.scope === "Network" || roleForScopeSelection.scope === "Trading Point") && (
                    <div>
                      <Label htmlFor="scopeValue">
                        {roleForScopeSelection.scope === "Network" ? "Сеть" : "Торговая точка"} *
                      </Label>
                      <Select onValueChange={(value) => roleAssignmentForm.setValue("scopeValue", value)}>
                        <SelectTrigger className="mt-1">
                          <SelectValue placeholder={`Выберите ${roleForScopeSelection.scope === "Network" ? "сеть" : "точку"}`} />
                        </SelectTrigger>
                        <SelectContent>
                          {(roleForScopeSelection.scope === "Network" ? mockNetworks : mockPoints).map((item) => (
                            <SelectItem key={item} value={item}>
                              {item}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                  
                  <div className="flex gap-2">
                    <Button type="button" variant="outline" onClick={() => setRoleAssignmentOpen(false)} className="flex-1">
                      Закрыть
                    </Button>
                    <Button type="submit" className="flex-1">
                      Назначить роль
                    </Button>
                  </div>
                </form>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Permissions Dialog */}
        <Dialog open={permissionsDialogOpen} onOpenChange={setPermissionsDialogOpen}>
          <DialogContent className={`${isMobile ? 'w-full mx-4 max-h-[80vh] overflow-y-auto' : 'max-w-4xl max-h-[80vh] overflow-y-auto'}`}>
            <DialogHeader>
              <DialogTitle>
                <div className="flex items-center gap-2">
                  <Grid3X3 className="w-5 h-5" />
                  Матрица прав доступа: {selectedRole?.name}
                </div>
              </DialogTitle>
            </DialogHeader>
            {selectedRole && (
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Код роли:</span>
                    <div className="font-mono">{selectedRole.code}</div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Область действия:</span>
                    <div>{selectedRole.scope}</div>
                  </div>
                </div>
                
                {selectedRole.description && (
                  <div>
                    <span className="text-muted-foreground">Описание:</span>
                    <div>{selectedRole.description}</div>
                  </div>
                )}

                <div>
                  <h3 className="font-semibold mb-4">Разрешения:</h3>
                  
                  {isMobile ? (
                    // Mobile: Accordion layout
                    <Accordion type="single" collapsible className="w-full">
                      {permissionModules.map((module) => (
                        <AccordionItem key={module.id} value={module.id}>
                          <AccordionTrigger className="text-left">
                            {module.name}
                          </AccordionTrigger>
                          <AccordionContent>
                            <div className="space-y-3 pt-2">
                              {module.permissions.map((permission) => (
                                <div key={permission.id} className="flex items-center justify-between">
                                  <Label htmlFor={permission.id} className="text-sm">
                                    {permission.name}
                                  </Label>
                                  <Checkbox
                                    id={permission.id}
                                    checked={rolePermissions[permission.id] || false}
                                    onCheckedChange={(checked) => handlePermissionChange(permission.id, !!checked)}
                                    disabled={selectedRole.isSystem}
                                  />
                                </div>
                              ))}
                            </div>
                          </AccordionContent>
                        </AccordionItem>
                      ))}
                    </Accordion>
                  ) : (
                    // Desktop: Table/Grid layout
                    <div className="border rounded-lg overflow-hidden">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-32">Модуль</TableHead>
                            {permissionModules[0].permissions.map((permission) => (
                              <TableHead key={permission.id} className="text-center min-w-32">
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
                                    onCheckedChange={(checked) => handlePermissionChange(permission.id, !!checked)}
                                    disabled={selectedRole.isSystem}
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
                
                {selectedRole.isSystem && (
                  <div className="text-sm text-muted-foreground bg-muted/50 p-3 rounded">
                    <ShieldCheck className="w-4 h-4 inline mr-2" />
                    Системная роль. Права доступа не могут быть изменены.
                  </div>
                )}

                {!selectedRole.isSystem && (
                  <div className="flex gap-2 pt-4">
                    <Button variant="outline" onClick={() => setPermissionsDialogOpen(false)} className="flex-1">
                      Отмена
                    </Button>
                    <Button className="flex-1">
                      Сохранить изменения
                    </Button>
                  </div>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </MainLayout>
  );
}