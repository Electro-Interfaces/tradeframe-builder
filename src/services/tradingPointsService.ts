/**
 * Сервис для работы с торговыми точками.
 * Все запросы через backend API `/api/trading-points`.
 */

import { NetworkId } from '@/types/network';
import { TradingPoint, TradingPointId, TradingPointInput, TradingPointExternalCode, TradingPointUpdateInput } from '@/types/tradingpoint';
import { orgApiRequest } from './orgApiClient';
import { createTtlCache } from './orgRefCache';

// Справочник точек запрашивают десятки экранов — кэшируем на 5 минут
const refCache = createTtlCache();

function mapTradingPointFromApi(point: any): TradingPoint {
  return {
    ...point,
    geolocation: point.geolocation || {},
    externalCodes: (point.externalCodes || []).map((externalCode: any) => ({
      ...externalCode,
      createdAt: new Date(externalCode.createdAt),
      updatedAt: externalCode.updatedAt ? new Date(externalCode.updatedAt) : undefined
    })),
    createdAt: new Date(point.createdAt),
    updatedAt: point.updatedAt ? new Date(point.updatedAt) : undefined
  };
}

function mapTradingPointsFromApi(points: any[]): TradingPoint[] {
  return (points || []).map(mapTradingPointFromApi);
}

export const tradingPointsService = {
  async getAll(): Promise<TradingPoint[]> {
    const points = await refCache.get<TradingPoint[]>('tp:all', async () =>
      mapTradingPointsFromApi(await orgApiRequest('/trading-points'))
    );
    // Копия на каждый вызов: страницы сортируют/фильтруют список на месте
    return [...points];
  },

  async getByNetworkId(networkId: NetworkId): Promise<TradingPoint[]> {
    const points = await refCache.get<TradingPoint[]>(`tp:network:${networkId}`, async () =>
      mapTradingPointsFromApi(
        await orgApiRequest(`/trading-points?networkId=${encodeURIComponent(networkId)}`)
      )
    );
    return [...points];
  },

  async getById(id: TradingPointId): Promise<TradingPoint | null> {
    try {
      return mapTradingPointFromApi(await orgApiRequest(`/trading-points/${id}`));
    } catch {
      return null;
    }
  },

  async create(input: TradingPointInput): Promise<TradingPoint> {
    const created = mapTradingPointFromApi(await orgApiRequest('/trading-points', {
      method: 'POST',
      body: JSON.stringify(input)
    }));
    refCache.invalidate('tp:');
    return created;
  },

  async update(id: TradingPointId, input: TradingPointUpdateInput): Promise<TradingPoint | null> {
    const updated = mapTradingPointFromApi(await orgApiRequest(`/trading-points/${id}`, {
      method: 'PUT',
      body: JSON.stringify(input)
    }));
    refCache.invalidate('tp:');
    return updated;
  },

  async remove(id: TradingPointId): Promise<boolean> {
    await orgApiRequest(`/trading-points/${id}`, { method: 'DELETE' });
    refCache.invalidate('tp:');
    return true;
  },

  async delete(id: TradingPointId): Promise<boolean> {
    return this.remove(id);
  },

  async search(query: string): Promise<TradingPoint[]> {
    const points = await this.getAll();
    if (!query.trim()) return points;

    const lowerQuery = query.toLowerCase();
    return points.filter((point) =>
      point.name?.toLowerCase().includes(lowerQuery)
      || point.code?.toLowerCase().includes(lowerQuery)
      || point.address?.toLowerCase().includes(lowerQuery)
    );
  },

  async getAllWithNetworks(): Promise<(TradingPoint & { networkName?: string })[]> {
    return mapTradingPointsFromApi(await orgApiRequest('/trading-points')) as (TradingPoint & { networkName?: string })[];
  },

  async getStatistics(): Promise<{
    totalPoints: number;
    activePoints: number;
    inactivePoints: number;
    pointsByNetwork: Record<string, number>;
  }> {
    const points = await this.getAllWithNetworks();
    const totalPoints = points.length;
    const activePoints = points.filter((p) => p.active !== false).length;
    const inactivePoints = totalPoints - activePoints;

    const pointsByNetwork: Record<string, number> = {};
    points.forEach((point) => {
      const networkName = point.networkName || point.networkId || 'Unknown';
      pointsByNetwork[networkName] = (pointsByNetwork[networkName] || 0) + 1;
    });

    return { totalPoints, activePoints, inactivePoints, pointsByNetwork };
  },

  async updateBillAcceptorThresholds(pointId: TradingPointId, thresholds: any): Promise<void> {
    await orgApiRequest(`/trading-points/${pointId}/bill-acceptor-thresholds`, {
      method: 'PUT',
      body: JSON.stringify(thresholds)
    });
    refCache.invalidate('tp:');
  },

  async updateFuelLevelThresholds(pointId: TradingPointId, thresholds: any): Promise<void> {
    await orgApiRequest(`/trading-points/${pointId}/fuel-level-thresholds`, {
      method: 'PUT',
      body: JSON.stringify(thresholds)
    });
    refCache.invalidate('tp:');
  },

  async addExternalCode(pointId: TradingPointId, system: string, code: string, description?: string): Promise<TradingPointExternalCode> {
    const externalCode = await orgApiRequest(`/trading-points/${pointId}/external-codes`, {
      method: 'POST',
      body: JSON.stringify({ system, code, description })
    });
    refCache.invalidate('tp:');
    return {
      ...externalCode,
      createdAt: new Date(externalCode.createdAt),
      updatedAt: externalCode.updatedAt ? new Date(externalCode.updatedAt) : undefined
    };
  },

  async updateExternalCode(
    pointId: TradingPointId,
    codeId: string,
    system: string,
    code: string,
    description?: string,
    isActive?: boolean
  ): Promise<TradingPointExternalCode> {
    const externalCode = await orgApiRequest(`/trading-points/${pointId}/external-codes/${codeId}`, {
      method: 'PUT',
      body: JSON.stringify({ system, code, description, isActive })
    });
    refCache.invalidate('tp:');
    return {
      ...externalCode,
      createdAt: new Date(externalCode.createdAt),
      updatedAt: externalCode.updatedAt ? new Date(externalCode.updatedAt) : undefined
    };
  },

  async removeExternalCode(pointId: TradingPointId, codeId: string): Promise<boolean> {
    await orgApiRequest(`/trading-points/${pointId}/external-codes/${codeId}`, {
      method: 'DELETE'
    });
    refCache.invalidate('tp:');
    return true;
  },
};
