import { useState, useMemo, useEffect } from "react";
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
  Edit, 
  Trash2, 
  Shield,
  Settings,
  Plus,
  Search,
  MoreHorizontal,
  X,
  AlertTriangle
} from "lucide-react";
import { HelpButton } from "@/components/help/HelpButton";
import { errorLogService } from "@/services/errorLogService";
import { usersSupabaseService } from "@/services/usersSupabaseService";

// ❌ MOCK СИСТЕМНЫЕ РОЛИ ЗАБЛОКИРОВАНЫ ИЗ СООБРАЖЕНИЙ БЕЗОПАСНОСТИ
// ✅ Системные роли должны загружаться из базы данных Supabase
const systemRoles: any[] = [];

// ❌ MOCK КАСТОМНЫЕ РОЛИ ЗАБЛОКИРОВАНЫ ИЗ СООБРАЖЕНИЙ БЕЗОПАСНОСТИ  
// ✅ Кастомные роли должны загружаться из базы данных Supabase
const mockCustomRoles: any[] = [];

// ❌ КРИТИЧЕСКАЯ УЯЗВИМОСТЬ БЕЗОПАСНОСТИ УСТРАНЕНА!
// ❌ Mock пользователи с административными правами УДАЛЕНЫ
// ✅ ТОЛЬКО реальные пользователи из базы данных Supabase

// ❌ MOCK СЕТИ И ТОЧКИ ЗАБЛОКИРОВАНЫ ИЗ СООБРАЖЕНИЙ БЕЗОПАСНОСТИ
// ✅ Сети и торговые точки должны загружаться из базы данных Supabase
const mockNetworks: string[] = [];
const mockPoints: string[] = [];

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
  // ❌ MOCK РОЛИ ЗАБЛОКИРОВАНЫ - загружаются только из Supabase
  const [allRoles, setAllRoles] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
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

  // ✅ Загрузка ТОЛЬКО реальных пользователей из базы данных Supabase
  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Загружаем реальных пользователей из Supabase
      const realUsers = await usersSupabaseService.getUsers();
      console.log('✅ Загружены реальные пользователи:', realUsers.length);
      
      setUsers(realUsers);
    } catch (error) {
      console.error('❌ КРИТИЧНО: Не удалось загрузить пользователей:', error);
      
      // Логируем критическую ошибку
      await errorLogService.logCriticalError(
        'AdminUsers',
        'loadUsers',
        error instanceof Error ? error : new Error(String(error)),
        {
          metadata: { component: 'AdminUsers', action: 'loadUsers' }
        }
      );

      setError('Не удалось загрузить список пользователей');
      
      // ❌ БЕЗ FALLBACK на mock данные - показываем ошибку пользователю
      toast({
        title: "Критическая ошибка",
        description: "Не удалось загрузить пользователей из базы данных",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

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


  const onSubmitRole = (data: RoleFormData) => {
    if (selectedRole && !selectedRole.isSystem) {
      // Редактирование существующей роли
      setAllRoles(prev => prev.map(role => 
        role.id === selectedRole.id 
          ? { ...role, name: data.name, code: data.code, scope: data.scope, description: data.description || "" }
          : role
      ));
      toast({ title: "Роль обновлена" });
    } else {
      // Создание новой роли
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
      toast({ title: "Роль создана" });
    }
    
    setRoleDialogOpen(false);
    setSelectedRole(null);
    roleForm.reset();
  };

  const selectedRoleForAssignment = roleAssignmentForm.watch("roleId");
  const roleForScopeSelection = allRoles.find(r => r.id === selectedRoleForAssignment);

  return (
    <MainLayout fullWidth={true}>
      <div className="w-full h-full px-4 md:px-6 lg:px-8">
        {/* Заголовок страницы */}
        <div className="mb-6 pt-4">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-2xl font-semibold text-white">Пользователи и роли</h1>
              <p className="text-slate-400 mt-2">
                Управление пользователями, ролями и правами доступа в системе
              </p>
            </div>
            <HelpButton helpKey="admin-users" />
          </div>
        </div>

        {/* ❌ КРИТИЧЕСКАЯ ОШИБКА БЕЗОПАСНОСТИ - нет данных */}
        {error && (
          <div className="mb-6">
            <Card className="bg-red-900/20 border-red-700">
              <CardContent className="p-6">
                <div className="flex items-center gap-3">
                  <AlertTriangle className="w-6 h-6 text-red-500" />
                  <div>
                    <h3 className="text-lg font-semibold text-red-400">Критическая ошибка безопасности</h3>
                    <p className="text-red-300 mt-1">{error}</p>
                    <Button 
                      variant="destructive" 
                      className="mt-3"
                      onClick={loadUsers}
                    >
                      Повторить загрузку
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Загрузка */}
        {loading && !error && (
          <div className="mb-6">
            <Card className="bg-slate-800 border-slate-700">
              <CardContent className="p-6">
                <div className="text-center">
                  <div className="text-slate-400">Загрузка пользователей из базы данных...</div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        <Tabs defaultValue="users" className="space-y-6 w-full">
          <TabsList className="px-6 grid w-full grid-cols-2 h-14 bg-slate-800 border border-slate-700">
            <TabsTrigger 
              value="users" 
              className="text-base font-medium h-12 data-[state=active]:bg-blue-600 data-[state=active]:text-white data-[state=inactive]:text-slate-400 data-[state=inactive]:hover:text-white transition-all"
            >
              <Users className="w-5 h-5 mr-2" />
              Пользователи
            </TabsTrigger>
            <TabsTrigger 
              value="roles" 
              className="text-base font-medium h-12 data-[state=active]:bg-blue-600 data-[state=active]:text-white data-[state=inactive]:text-slate-400 data-[state=inactive]:hover:text-white transition-all"
            >
              <Shield className="w-5 h-5 mr-2" />
              Роли
            </TabsTrigger>
          </TabsList>

          {/* Users Tab */}
          <TabsContent value="users" className="space-y-0">
            {/* Панель управления */}
            <div className="bg-slate-800 mb-6 rounded-lg border border-slate-700">
              <div className="px-4 md:px-6 py-4">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center flex-shrink-0">
                      <Users className="w-4 h-4 text-white" />
                    </div>
                    <h2 className="text-lg font-semibold text-white">Пользователи</h2>
                    <div className="text-sm text-slate-400">
                      Всего: {filteredUsers.length} из {users.length}
                    </div>
                  </div>
                  <Button 
                    onClick={handleCreateUser}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium flex-shrink-0"
                    disabled={false}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Добавить пользователя
                  </Button>
                </div>
                
                {/* Фильтры */}
                <div className="flex flex-col md:flex-row gap-4">
                  <div className="relative flex-1">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" />
                    <Input 
                      placeholder="Поиск пользователей по имени, фамилии или email..." 
                      value={searchTerm} 
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="bg-slate-700 border-slate-600 text-white placeholder-slate-400 pl-10"
                    />
                  </div>
                  <Select value={statusFilter || "all"} onValueChange={(value: any) => setStatusFilter(value === "all" ? null : value)}>
                    <SelectTrigger className="bg-slate-700 border-slate-600 text-white w-full md:w-48">
                      <SelectValue placeholder="Все статусы" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Все статусы</SelectItem>
                      <SelectItem value="active">Активные</SelectItem>
                      <SelectItem value="pending">Ожидающие</SelectItem>
                      <SelectItem value="blocked">Заблокированные</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
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
              <div className="w-full">
                <div className="overflow-x-auto w-full rounded-lg border border-slate-600">
                  <table className="w-full text-sm min-w-full table-fixed">
                    <thead className="bg-slate-700/80">
                      <tr>
                        <th className="px-6 py-4 text-left text-slate-100 font-medium" style={{width: '30%'}}>ПОЛЬЗОВАТЕЛЬ</th>
                        <th className="px-6 py-4 text-left text-slate-100 font-medium" style={{width: '35%'}}>РОЛИ</th>
                        <th className="px-6 py-4 text-left text-slate-100 font-medium" style={{width: '20%'}}>СТАТУС</th>
                        <th className="px-6 py-4 text-right text-slate-100 font-medium" style={{width: '15%'}}>ДЕЙСТВИЯ</th>
                      </tr>
                    </thead>
                    <tbody className="bg-slate-800">
                      {filteredUsers.map((user) => (
                        <tr
                          key={user.id}
                          className="border-b border-slate-600 hover:bg-slate-700/50 transition-colors"
                        >
                          <td className="px-4 md:px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 bg-slate-700 rounded-lg flex items-center justify-center flex-shrink-0 border border-slate-600">
                                <Users className="w-4 h-4 text-slate-300" />
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="font-medium text-white text-base truncate">
                                  {user.name} {user.surname}
                                </div>
                                <div className="text-sm text-slate-300 truncate">{user.email}</div>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 md:px-6 py-4">
                            <div className="flex flex-wrap gap-1">
                              {user.roles.length === 0 ? (
                                <span className="text-slate-500 text-sm">Роли не назначены</span>
                              ) : (
                                user.roles.map((role, index) => (
                                  <Badge key={index} variant="secondary" className="bg-slate-600 text-slate-200 text-xs">
                                    {role.roleName}
                                    {role.scopeValue && <span className="ml-1">({role.scopeValue})</span>}
                                  </Badge>
                                ))
                              )}
                            </div>
                          </td>
                          <td className="px-4 md:px-6 py-4">
                            <Badge variant={user.status === 'active' ? "default" : "secondary"}>
                              {getStatusText(user.status)}
                            </Badge>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0 text-slate-400 hover:text-white"
                                onClick={() => handleEditUser(user)}
                                title="Редактировать"
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0 text-slate-400 hover:text-white"
                                onClick={() => handleManageUserRoles(user)}
                                title="Управление ролями"
                              >
                                <Settings className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0 text-slate-400 hover:text-red-400"
                                onClick={() => handleDeleteUser(user)}
                                title="Удалить"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </TabsContent>

          {/* Roles Tab */}
          <TabsContent value="roles" className="space-y-0">
            {/* Панель управления */}
            <div className="bg-slate-800 mb-6 rounded-lg border border-slate-700">
              <div className="px-4 md:px-6 py-4">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center flex-shrink-0">
                      <Shield className="w-4 h-4 text-white" />
                    </div>
                    <h2 className="text-lg font-semibold text-white">Роли системы</h2>
                    <div className="text-sm text-slate-400">
                      Всего: {allRoles.length}
                    </div>
                  </div>
                  <Button 
                    onClick={() => {
                      setSelectedRole(null);
                      roleForm.reset();
                      setRoleDialogOpen(true);
                    }}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium flex-shrink-0"
                    disabled={false}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Создать роль
                  </Button>
                </div>
              </div>
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
                            <>
                              <Button 
                                size="sm" 
                                variant="outline"
                                onClick={() => {
                                  setSelectedRole(role);
                                  roleForm.setValue("name", role.name);
                                  roleForm.setValue("code", role.code);
                                  roleForm.setValue("scope", role.scope);
                                  roleForm.setValue("description", role.description);
                                  setRoleDialogOpen(true);
                                }}
                              >
                                <Edit className="h-4 w-4 mr-1" />
                                Изменить
                              </Button>
                              <Button 
                                size="sm" 
                                variant="ghost" 
                                className="text-destructive"
                                onClick={() => {
                                  setAllRoles(prev => prev.filter(r => r.id !== role.id));
                                  toast({ title: "Роль удалена" });
                                }}
                              >
                                <Trash2 className="h-4 w-4" />
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
              <div className="w-full">
                <div className="overflow-x-auto w-full rounded-lg border border-slate-600">
                  <table className="w-full text-sm min-w-full table-fixed">
                    <thead className="bg-slate-700/80">
                      <tr>
                        <th className="px-6 py-4 text-left text-slate-100 font-medium" style={{width: '30%'}}>НАЗВАНИЕ РОЛИ</th>
                        <th className="px-6 py-4 text-left text-slate-100 font-medium" style={{width: '20%'}}>КОД</th>
                        <th className="px-6 py-4 text-left text-slate-100 font-medium" style={{width: '20%'}}>ОБЛАСТЬ ДЕЙСТВИЯ</th>
                        <th className="px-6 py-4 text-left text-slate-100 font-medium" style={{width: '15%'}}>ТИП</th>
                        <th className="px-6 py-4 text-right text-slate-100 font-medium" style={{width: '15%'}}>ДЕЙСТВИЯ</th>
                      </tr>
                    </thead>
                    <tbody className="bg-slate-800">
                      {allRoles.map((role) => (
                        <tr
                          key={role.id}
                          className="border-b border-slate-600 hover:bg-slate-700/50 transition-colors"
                        >
                          <td className="px-4 md:px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 bg-slate-700 rounded-lg flex items-center justify-center flex-shrink-0 border border-slate-600">
                                <Shield className="w-4 h-4 text-slate-300" />
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="font-medium text-white text-base truncate">
                                  {role.name}
                                </div>
                                {role.description && (
                                  <div className="text-sm text-slate-300 truncate">{role.description}</div>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="px-4 md:px-6 py-4">
                            <code className="bg-slate-600 text-slate-200 px-2 py-1 rounded text-xs">
                              {role.code}
                            </code>
                          </td>
                          <td className="px-4 md:px-6 py-4">
                            <Badge variant="secondary" className="bg-slate-600 text-slate-200">
                              {role.scope}
                            </Badge>
                          </td>
                          <td className="px-4 md:px-6 py-4">
                            <Badge variant={role.isSystem ? "default" : "secondary"}>
                              {role.isSystem ? 'Системная' : 'Кастомная'}
                            </Badge>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0 text-slate-400 hover:text-white"
                                onClick={() => handleViewPermissions(role)}
                                title="Просмотр прав"
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className={`h-8 w-8 p-0 ${
                                  role.isSystem 
                                    ? 'text-slate-600 cursor-not-allowed' 
                                    : 'text-slate-400 hover:text-white'
                                }`}
                                onClick={role.isSystem ? undefined : () => {
                                  setSelectedRole(role);
                                  roleForm.setValue("name", role.name);
                                  roleForm.setValue("code", role.code);
                                  roleForm.setValue("scope", role.scope);
                                  roleForm.setValue("description", role.description);
                                  setRoleDialogOpen(true);
                                }}
                                title={role.isSystem ? "Системную роль нельзя редактировать" : "Редактировать"}
                                disabled={role.isSystem}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className={`h-8 w-8 p-0 ${
                                  role.isSystem 
                                    ? 'text-slate-600 cursor-not-allowed' 
                                    : 'text-slate-400 hover:text-red-400'
                                }`}
                                onClick={role.isSystem ? undefined : () => {
                                  setAllRoles(prev => prev.filter(r => r.id !== role.id));
                                  toast({ title: "Роль удалена" });
                                }}
                                title={role.isSystem ? "Системную роль нельзя удалить" : "Удалить"}
                                disabled={role.isSystem}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
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
              <DialogTitle>
                {selectedRole ? 'Редактировать роль' : 'Создать роль'}
              </DialogTitle>
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
                <Button type="submit">
                  {selectedRole ? 'Сохранить' : 'Создать'}
                </Button>
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