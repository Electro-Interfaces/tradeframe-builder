/**
 * Хук для проверки видимости элементов меню на основе разрешений пользователя
 */

import { useMemo } from 'react'
import { useNewAuth } from '@/contexts/NewAuthContext'

console.log('📁 useMenuVisibility.ts: Module loaded!');

export interface MenuVisibilityConfig {
  networks: boolean
  tradingPoint: boolean
  admin: boolean
  settings: boolean
  prices: boolean
  tanks: boolean
  equipment: boolean
  reports: boolean
  analytics: boolean
  misc: boolean
}

export function useMenuVisibility(): MenuVisibilityConfig {
  const { user } = useNewAuth()

  return useMemo(() => {
    console.log('🔍 useMenuVisibility called with user:', user);
    
    if (!user) {
      console.log('❌ No user found - hiding all menu items');
      // Неавторизованные пользователи не видят меню
      return {
        networks: false,
        tradingPoint: false,
        admin: false,
        settings: false,
        prices: false,
        tanks: false,
        equipment: false,
        reports: false,
        analytics: false,
        misc: false
      }
    }
    
    console.log('👤 User role:', user.role);
    console.log('🔑 User permissions (raw):', user.permissions);
    console.log('🔑 User permissions (parsed):', user.permissions?.map(p => typeof p === 'string' ? p : JSON.stringify(p)));

    // Функция для проверки разрешения на видимость меню
    const hasMenuPermission = (menuResource: string): boolean => {
      console.log(`🔍 Checking permission for: ${menuResource}`);
      console.log('👤 User permissions:', user.permissions);
      
      if (!user.permissions) {
        console.log(`❌ No permissions found for ${menuResource}`);
        return false;
      }

      // Проверяем разрешение на просмотр конкретного меню
      const result = user.permissions.some(permission => {
        // Обрабатываем объектный формат разрешений
        if (typeof permission === 'object' && permission !== null && 'section' in permission) {
          const match = permission.section === 'menu_visibility' && 
                 permission.resource === menuResource &&
                 permission.actions?.includes('view_menu');
          console.log(`🔍 Object permission ${JSON.stringify(permission)} -> ${menuResource}: ${match}`);
          return match;
        }
        
        // Обрабатываем строковый формат разрешений (старый формат)
        if (typeof permission === 'string') {
          const match = permission === `menu_visibility.${menuResource}.view_menu`;
          if (permission.includes('menu_visibility') || match) {
            console.log(`🔍 String permission "${permission}" -> ${menuResource}: ${match}`);
          }
          return match;
        }
        
        return false;
      });
      
      console.log(`📊 Final result for ${menuResource}: ${result}`);
      return result;
    };

    // Системный администратор (супер админ) имеет доступ ко всем разделам
    if (user.role === 'super_admin' || user.role === 'system_admin') {
      console.log('🎯 User is super_admin/system_admin - showing all menus');
      return {
        networks: true,
        tradingPoint: true,
        admin: true,
        settings: true,
        prices: true,
        tanks: true,
        equipment: true,
        reports: true,
        analytics: true,
        misc: true
      }
    }

    // БТО менеджер - показываем только определенные разделы
    if (user.role === 'network_admin' || user.role === 'manager' || user.role_name === 'Менеджер БТО') {
      console.log('🎯 User is БТО manager - showing limited menus');
      return {
        networks: true,      // ТОРГОВЫЕ СЕТИ: Обзор, Операции
        tradingPoint: true,  // ТОРГОВАЯ ТОЧКА: Цены, Резервуары, Оборудование
        admin: false,
        settings: false,
        prices: false,       // Цены теперь в tradingPoint
        tanks: false,        // Резервуары теперь в tradingPoint  
        equipment: false,    // Оборудование теперь в tradingPoint
        reports: false,
        analytics: false,
        misc: false
      }
    }

    // Fallback: если у пользователя есть разрешение "all", показываем все меню  
    const hasAllPermission = user.permissions.some(permission => {
      if (typeof permission === 'string') {
        return permission === 'all';
      }
      return false;
    });
    
    if (hasAllPermission) {
      console.log('🎯 User has "all" permission - showing all menus');
      return {
        networks: true,
        tradingPoint: true,
        admin: true,
        settings: true,
        prices: true,
        tanks: true,
        equipment: true,
        reports: true,
        analytics: true,
        misc: true
      }
    }

    // Для всех остальных ролей используем разрешения из базы данных
    const menuConfig = {
      networks: hasMenuPermission('networks_menu'),
      tradingPoint: hasMenuPermission('trading_point_menu'),
      admin: hasMenuPermission('admin_menu'),
      settings: hasMenuPermission('settings_menu'),
      prices: hasMenuPermission('prices_menu'),
      tanks: hasMenuPermission('tanks_menu'),
      equipment: hasMenuPermission('equipment_menu'),
      reports: hasMenuPermission('reports_menu'),
      analytics: hasMenuPermission('analytics_menu'),
      misc: hasMenuPermission('misc_menu')
    };

    // Fallback: если ни одно меню не видимо, но пользователь имеет некоторые разрешения,
    // показываем базовые разделы для администратора сети
    const hasAnyMenu = Object.values(menuConfig).some(visible => visible);
    if (!hasAnyMenu && user.permissions.length > 0) {
      // Проверяем, есть ли у пользователя административные разрешения
      const hasAdminPermissions = user.permissions.some(permission => {
        if (typeof permission === 'string') {
          return permission.includes('network.manage') || 
                 permission.includes('points.manage') || 
                 permission.includes('users.manage') ||
                 permission.includes('admin');
        }
        return false;
      });

      if (hasAdminPermissions) {
        console.log('🎯 Пользователь с админ разрешениями - показываем админ разделы');
        return {
          networks: true,
          tradingPoint: true,
          admin: true,        // Админ доступ только при наличии админ разрешений
          settings: true,
          prices: true,
          tanks: true,
          equipment: true,
          reports: true,
          analytics: true,
          misc: true
        };
      }
    }

    console.log('✅ useMenuVisibility final result:', menuConfig);
    const visibleCount = Object.values(menuConfig).filter(v => v).length;
    console.log(`📊 Menu sections visible: ${visibleCount}/10`);
    
    // ВРЕМЕННЫЙ FALLBACK: если ни одного меню не видно, показываем разделы в зависимости от роли
    if (visibleCount === 0) {
      console.log('⚠️ FALLBACK: ни одного меню не видно, используем роль для определения доступа');
      
      // Для БТО менеджера показываем ограниченный набор
      if (user.role === 'network_admin' || user.role === 'manager' || user.role_name === 'Менеджер БТО') {
        console.log('🎯 FALLBACK: БТО manager - показываем ограниченные разделы');
        return {
          networks: true,      // ТОРГОВЫЕ СЕТИ: Обзор, Операции  
          tradingPoint: true,  // ТОРГОВАЯ ТОЧКА: Цены, Резервуары, Оборудование
          admin: false,
          settings: false,
          prices: false,       
          tanks: false,        
          equipment: false,    
          reports: false,
          analytics: false,
          misc: false
        };
      }
      
      // Для всех остальных пользователей без ролей - МИНИМАЛЬНЫЙ доступ
      console.log('⚠️ FALLBACK: пользователь без разрешений - минимальный доступ для роли:', user.role);
      return {
        networks: true,      // Базовый доступ к просмотру сетей
        tradingPoint: true,  // Базовый доступ к торговой точке
        admin: false,        // НЕТ админ доступа
        settings: false,     // НЕТ настроек
        prices: false,
        tanks: false,
        equipment: false,
        reports: false,
        analytics: false,
        misc: false
      };
    }
    
    return menuConfig;

    // Оригинальная логика (закомментирована)
    /*
    if (!user || !user.permissions) {
      return {
        networks: false,
        tradingPoint: false,
        admin: false,
        settings: false,
        prices: false,
        tanks: false,
        equipment: false,
        reports: false,
        analytics: false
      }
    }

    const hasMenuPermission = (menuResource: string): boolean => {
      return user.permissions.includes(`menu_visibility.${menuResource}.view_menu`)
    }

    return {
      networks: hasMenuPermission('networks_menu'),
      tradingPoint: hasMenuPermission('trading_point_menu'),
      admin: hasMenuPermission('admin_menu'),
      settings: hasMenuPermission('settings_menu'),
      prices: hasMenuPermission('prices_menu'),
      tanks: hasMenuPermission('tanks_menu'),
      equipment: hasMenuPermission('equipment_menu'),
      reports: hasMenuPermission('reports_menu'),
      analytics: hasMenuPermission('analytics_menu')
    }
    */
  }, [user])
}

/**
 * Хук для проверки конкретного разрешения на видимость меню
 */
export function useHasMenuPermission(menuResource: string): boolean {
  const { user } = useNewAuth()

  return useMemo(() => {
    if (!user || !user.permissions) {
      return false
    }

    return user.permissions.includes(`menu_visibility.${menuResource}.view_menu`)
  }, [user, menuResource])
}