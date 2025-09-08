import { TradingPoint, TradingPointId, TradingPointInput, TradingPointUpdateInput, NetworkId } from '@/types/tradingpoint';
import { supabase } from '@/services/supabaseAuthService';

const MOCK_API_DELAY = 150;

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const tradingPointsRepo = {
  async getAll(): Promise<TradingPoint[]> {
    const { data, error } = await supabase
      .from('trading_points')
      .select('*')
      .eq('is_active', true)
      .order('name');
    
    if (error) throw error;
    return data || [];
  },

  async getById(id: TradingPointId): Promise<TradingPoint | null> {
    const { data, error } = await supabase
      .from('trading_points')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) return null;
    return data;
  },

  async getByNetworkId(networkId: NetworkId): Promise<TradingPoint[]> {
    const { data, error } = await supabase
      .from('trading_points')
      .select('*')
      .eq('network_id', networkId)
      .eq('is_active', true)
      .order('name');
    
    if (error) throw error;
    return data || [];
  },

  async create(networkId: NetworkId, input: TradingPointInput): Promise<TradingPoint> {
    if (!input.name?.trim()) {
      throw new Error('Название торговой точки обязательно');
    }

    const { data, error } = await supabase
      .from('trading_points')
      .insert({
        network_id: networkId,
        name: input.name,
        description: input.description,
        geolocation: input.geolocation,
        phone: input.phone,
        email: input.email,
        website: input.website,
        is_blocked: input.isBlocked,
        schedule: input.schedule,
        services: input.services,
        is_active: true
      })
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  async update(id: TradingPointId, input: TradingPointUpdateInput): Promise<TradingPoint> {
    if (!input.name?.trim()) {
      throw new Error('Название торговой точки обязательно');
    }

    const { data, error } = await supabase
      .from('trading_points')
      .update({
        name: input.name,
        description: input.description,
        geolocation: input.geolocation,
        phone: input.phone,
        email: input.email,
        website: input.website,
        is_blocked: input.isBlocked,
        schedule: input.schedule,
        services: input.services,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    if (!data) throw new Error('Торговая точка не найдена');
    
    return data;
  },

  async delete(id: TradingPointId): Promise<void> {
    const { error } = await supabase
      .from('trading_points')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
  },

  // Simplified methods - remove complex functionality for now
  async addExternalCode(pointId: TradingPointId, system: string, code: string, description?: string): Promise<TradingPoint> {
    const point = await this.getById(pointId);
    if (!point) {
      throw new Error('Торговая точка не найдена');
    }
    return point;
  },

  async removeExternalCode(pointId: TradingPointId, externalCodeId: string): Promise<TradingPoint> {
    const point = await this.getById(pointId);
    if (!point) {
      throw new Error('Торговая точка не найдена');
    }
    return point;
  }
};