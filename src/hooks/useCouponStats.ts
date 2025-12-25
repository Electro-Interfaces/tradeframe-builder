/**
 * Хук для расчета статистики по купонам
 */

import { useMemo } from 'react';
import { useNewAuth } from '@/contexts/NewAuthContext';
import type {
  CouponsSearchResult,
  CouponsFilter,
  CouponWithAge
} from '@/types/coupons';

interface FuelStat {
  fuelType: string;
  totalCoupons: number;
  filteredCoupons: number;
  totalAmount: number;
  filteredAmount: number;
  totalLiters: number;
  filteredLiters: number;
}

export function useCouponStats(
  searchResult: CouponsSearchResult | null,
  filters: CouponsFilter,
  selectedKpiStates: Set<string>,
  selectedFuelType: string
) {
  const { user } = useNewAuth();

  // Вычисляем разрешенные номера станций из scopeValues ролей пользователя
  const allowedStationNumbers = useMemo(() => {
    if (!user?.roles) return null;

    const userScopeValues: string[] = [];
    user.roles.forEach(role => {
      if (role.scopeValues && role.scopeValues.length > 0) {
        userScopeValues.push(...role.scopeValues);
      }
    });

    // Если scopeValues пустой - полный доступ
    if (userScopeValues.length === 0) return null;

    // Извлекаем номера станций из scopeValues формата "{networkCode}-azs-{stationNumber}"
    const stationNumbers = new Set<string>();
    userScopeValues.forEach(scopeValue => {
      const parts = scopeValue.split('-azs-');
      if (parts.length === 2) {
        stationNumbers.add(parts[1]);
      }
    });

    return stationNumbers.size > 0 ? stationNumbers : null;
  }, [user?.roles]);

  // Получаем все купоны из результата поиска с фильтрацией по RBAC
  const allCoupons = useMemo(() => {
    let coupons = searchResult?.groups.flatMap(g => g.coupons) || [];

    // Фильтрация по разрешенным станциям (RBAC)
    if (allowedStationNumbers) {
      coupons = coupons.filter(coupon => {
        const stationNum = String(coupon.stationCode || '');
        return allowedStationNumbers.has(stationNum);
      });
    }

    return coupons;
  }, [searchResult, allowedStationNumbers]);

  // Отфильтрованные купоны (дополнительная фильтрация поверх API)
  const filteredCoupons = useMemo(() => {
    let filtered = allCoupons.filter(coupon => {
      // Фильтр по поиску (дополнительный)
      if (filters.search && !coupon.number.toLowerCase().includes(filters.search.toLowerCase())) {
        return false;
      }

      // KPI фильтры по статусам
      if (selectedKpiStates.size > 0 && !selectedKpiStates.has(coupon.state.name)) {
        return false;
      }

      // Фильтр по типу топлива
      if (selectedFuelType !== 'all' && coupon.service.service_name !== selectedFuelType) {
        return false;
      }

      return true;
    });

    // Сортировка по дате (свежие сверху)
    return filtered.sort((a, b) => {
      const dateA = new Date(a.dt);
      const dateB = new Date(b.dt);

      // Обрабатываем невалидные даты
      const timeA = isNaN(dateA.getTime()) ? 0 : dateA.getTime();
      const timeB = isNaN(dateB.getTime()) ? 0 : dateB.getTime();

      return timeB - timeA;
    });
  }, [allCoupons, filters.search, selectedKpiStates, selectedFuelType]);

  // Уникальные статусы
  const uniqueStates = useMemo(() => {
    const states = new Set(allCoupons.map(c => c.state.name));
    return Array.from(states).sort();
  }, [allCoupons]);

  // Уникальные типы топлива
  const uniqueFuelTypes = useMemo(() => {
    const fuelTypes = new Set(allCoupons.map(c => c.service.service_name));
    return Array.from(fuelTypes).sort();
  }, [allCoupons]);

  // Статистика по типам топлива
  const fuelStats = useMemo<FuelStat[]>(() => {
    return uniqueFuelTypes.map(fuelType => {
      const fuelCoupons = allCoupons.filter(c => c.service.service_name === fuelType);
      const filteredFuelCoupons = filteredCoupons.filter(c => c.service.service_name === fuelType);

      const totalAmount = fuelCoupons.reduce((sum, c) => sum + c.rest_summ, 0);
      const filteredAmount = filteredFuelCoupons.reduce((sum, c) => sum + c.rest_summ, 0);

      const totalLiters = fuelCoupons.reduce((sum, c) => sum + c.rest_qty, 0);
      const filteredLiters = filteredFuelCoupons.reduce((sum, c) => sum + c.rest_qty, 0);

      return {
        fuelType,
        totalCoupons: fuelCoupons.length,
        filteredCoupons: filteredFuelCoupons.length,
        totalAmount,
        filteredAmount,
        totalLiters,
        filteredLiters
      };
    });
  }, [allCoupons, filteredCoupons, uniqueFuelTypes]);

  // Вычисленные данные для карточек статистики
  const computedStats = useMemo(() => {
    const totalIssuedLiters = allCoupons.reduce((sum, c) => sum + c.qty_total, 0);
    const usedCouponsCount = allCoupons.filter(c => c.qty_used > 0).length;
    const activeCoupons = allCoupons.filter(c => c.isActive && !c.isOld);
    const activeCouponsLiters = activeCoupons.reduce((sum, c) => sum + c.rest_qty, 0);
    const activeCouponsAmount = activeCoupons.reduce((sum, c) => sum + c.rest_summ, 0);

    return {
      totalIssuedLiters,
      usedCouponsCount,
      activeCouponsCount: activeCoupons.length,
      activeCouponsLiters,
      activeCouponsAmount
    };
  }, [allCoupons]);

  return {
    allCoupons,
    filteredCoupons,
    uniqueStates,
    uniqueFuelTypes,
    fuelStats,
    computedStats
  };
}

export type { FuelStat };
