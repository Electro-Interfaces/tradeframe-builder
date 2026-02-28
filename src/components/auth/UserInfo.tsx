import React from 'react';
import { useNewAuth } from '@/contexts/NewAuthContext';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { User, Shield, Clock, Phone, Mail } from 'lucide-react';

export function UserInfo() {
  const { user } = useNewAuth();

  if (!user) {
    return null;
  }

  const getScopeColor = (scope: string) => {
    switch (scope) {
      case 'Global':
        return 'bg-red-100 dark:bg-red-500/20 text-red-600 dark:text-red-400 border-red-500/30';
      case 'Network':
        return 'bg-blue-100 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 border-blue-500/30';
      case 'Trading Point':
        return 'bg-emerald-100 dark:bg-emerald-500/20 text-green-600 dark:text-green-400 border-green-500/30';
      case 'Assigned':
        return 'bg-yellow-100 dark:bg-yellow-500/20 text-yellow-600 dark:text-yellow-400 border-yellow-500/30';
      default:
        return 'bg-muted-foreground/20 text-muted-foreground border-border/30';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-emerald-100 dark:bg-emerald-500/20 text-green-600 dark:text-green-400 border-green-500/30';
      case 'inactive':
        return 'bg-yellow-100 dark:bg-yellow-500/20 text-yellow-600 dark:text-yellow-400 border-yellow-500/30';
      case 'blocked':
        return 'bg-red-100 dark:bg-red-500/20 text-red-600 dark:text-red-400 border-red-500/30';
      default:
        return 'bg-muted-foreground/20 text-muted-foreground border-border/30';
    }
  };

  return (
    <Card className="bg-card border-border">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-foreground">
          <User className="h-5 w-5" />
          Информация о пользователе
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Основная информация */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-foreground">
              {user.firstName} {user.lastName}
            </span>
            <Badge variant="secondary" className={getStatusColor(user.status)}>
              {user.status === 'active' ? '✓ Активен' : 
               user.status === 'inactive' ? '⏸ Неактивен' : '✗ Заблокирован'}
            </Badge>
          </div>
          
          <div className="flex items-center gap-2 text-muted-foreground">
            <Mail className="h-4 w-4" />
            <span className="text-sm">{user.email}</span>
          </div>
          
          {user.phone && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Phone className="h-4 w-4" />
              <span className="text-sm">{user.phone}</span>
            </div>
          )}
          
          {user.lastLogin && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Clock className="h-4 w-4" />
              <span className="text-sm">Последний вход: {user.lastLogin}</span>
            </div>
          )}
        </div>

        {/* Роли */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Shield className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            <span className="text-sm font-medium text-foreground">Роли</span>
          </div>
          
          <div className="space-y-2">
            {user.roles.map((role, index) => (
              <div key={index} className="p-2 bg-secondary rounded border border-border">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-medium text-foreground text-sm">{role.roleName}</span>
                  <Badge variant="secondary" className={getScopeColor(role.scope)}>
                    {role.scope}
                  </Badge>
                </div>
                {role.scopeValue && (
                  <div className="text-xs text-muted-foreground">
                    Область: {role.scopeValue}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Ключевые разрешения */}
        <div className="space-y-2">
          <div className="text-sm font-medium text-foreground">Основные разрешения</div>
          <div className="flex flex-wrap gap-1">
            {user.permissions.slice(0, 6).map((permission) => (
              <Badge
                key={permission}
                variant="secondary"
                className="bg-secondary text-foreground/80 border-border text-xs"
              >
                {permission}
              </Badge>
            ))}
            {user.permissions.length > 6 && (
              <Badge variant="secondary" className="bg-secondary text-foreground/80 border-border text-xs">
                +{user.permissions.length - 6}
              </Badge>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default UserInfo;