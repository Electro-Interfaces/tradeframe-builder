/**
 * Сервис для работы с торговыми сетями.
 * Все запросы через backend API `/api/networks`.
 */

import { Network, NetworkId, NetworkInput } from '@/types/network';
import { orgApiRequest } from './orgApiClient';

export const networksService = {
  async getAll(userRole?: string): Promise<Network[]> {
    return orgApiRequest('/networks');
  },

  async getById(id: NetworkId): Promise<Network | null> {
    try {
      return await orgApiRequest(`/networks/${id}`);
    } catch {
      return null;
    }
  },

  async create(input: NetworkInput): Promise<Network> {
    return orgApiRequest('/networks', {
      method: 'POST',
      body: JSON.stringify(input),
    });
  },

  async update(id: NetworkId, input: NetworkInput): Promise<Network | null> {
    return orgApiRequest(`/networks/${id}`, {
      method: 'PUT',
      body: JSON.stringify(input),
    });
  },

  async remove(id: NetworkId): Promise<boolean> {
    await orgApiRequest(`/networks/${id}`, {
      method: 'DELETE',
    });
    return true;
  },

  async delete(id: NetworkId): Promise<boolean> {
    return this.remove(id);
  },

  async search(query: string): Promise<Network[]> {
    const networks = await this.getAll();
    if (!query.trim()) {
      return networks;
    }

    const lowerQuery = query.toLowerCase();
    return networks.filter((network) =>
      network.name.toLowerCase().includes(lowerQuery)
      || network.code?.toLowerCase().includes(lowerQuery)
      || network.external_id?.toLowerCase().includes(lowerQuery)
    );
  },

  async getStatistics(): Promise<{
    totalNetworks: number;
    totalPoints: number;
    averagePointsPerNetwork: number;
    networksByType: Record<string, number>;
  }> {
    const networks = await this.getAll();
    const totalNetworks = networks.length;
    const totalPoints = networks.reduce((sum, network) => sum + (network.pointsCount || 0), 0);
    const averagePointsPerNetwork = totalNetworks > 0
      ? Math.round((totalPoints / totalNetworks) * 100) / 100
      : 0;

    const networksByType: Record<string, number> = {};
    networks.forEach((network) => {
      networksByType[network.type] = (networksByType[network.type] || 0) + 1;
    });

    return {
      totalNetworks,
      totalPoints,
      averagePointsPerNetwork,
      networksByType,
    };
  },
};
