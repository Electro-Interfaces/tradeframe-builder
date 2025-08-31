import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { User, Shield, Clock, Phone, Mail } from 'lucide-react';

export function UserInfo() {
  const { user } = useAuth();

  if (!user) {
    return null;
  }

  const getScopeColor = (scope: string) => {
    switch (scope) {
      case 'Global':
        return 'bg-red-500/20 text-red-400 border-red-500/30';
      case 'Network':
        return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      case 'Trading Point':
        return 'bg-green-500/20 text-green-400 border-green-500/30';
      case 'Assigned':
        return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
      default:
        return 'bg-slate-500/20 text-slate-400 border-slate-500/30';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-500/20 text-green-400 border-green-500/30';
      case 'inactive':
        return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
      case 'blocked':
        return 'bg-red-500/20 text-red-400 border-red-500/30';
      default:
        return 'bg-slate-500/20 text-slate-400 border-slate-500/30';
    }
  };

  return (
    <Card className="bg-slate-800 border-slate-700">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-white">
          <User className="h-5 w-5" />
          Информация о пользователе
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Основная информация */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-white">
              {user.firstName} {user.lastName}
            </span>
            <Badge variant="secondary" className={getStatusColor(user.status)}>
              {user.status === 'active' ? '✓ Активен' : 
               user.status === 'inactive' ? '⏸ Неактивен' : '✗ Заблокирован'}
            </Badge>
          </div>
          
          <div className="flex items-center gap-2 text-slate-400">
            <Mail className="h-4 w-4" />
            <span className="text-sm">{user.email}</span>
          </div>
          
          {user.phone && (
            <div className="flex items-center gap-2 text-slate-400">
              <Phone className="h-4 w-4" />
              <span className="text-sm">{user.phone}</span>
            </div>
          )}
          
          {user.lastLogin && (
            <div className="flex items-center gap-2 text-slate-400">
              <Clock className="h-4 w-4" />
              <span className="text-sm">Последний вход: {user.lastLogin}</span>
            </div>
          )}
        </div>

        {/* Роли */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Shield className="h-4 w-4 text-blue-400" />
            <span className="text-sm font-medium text-white">Роли</span>
          </div>
          
          <div className="space-y-2">
            {user.roles.map((role, index) => (
              <div key={index} className="p-2 bg-slate-700 rounded border border-slate-600">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-medium text-white text-sm">{role.roleName}</span>
                  <Badge variant="secondary" className={getScopeColor(role.scope)}>
                    {role.scope}
                  </Badge>
                </div>
                {role.scopeValue && (
                  <div className="text-xs text-slate-400">
                    Область: {role.scopeValue}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Ключевые разрешения */}
        <div className="space-y-2">
          <div className="text-sm font-medium text-white">Основные разрешения</div>
          <div className="flex flex-wrap gap-1">
            {user.permissions.slice(0, 6).map((permission) => (
              <Badge
                key={permission}
                variant="secondary"
                className="bg-slate-700 text-slate-300 border-slate-600 text-xs"
              >
                {permission}
              </Badge>
            ))}
            {user.permissions.length > 6 && (
              <Badge variant="secondary" className="bg-slate-700 text-slate-300 border-slate-600 text-xs">
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