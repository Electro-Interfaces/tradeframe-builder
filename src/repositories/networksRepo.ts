import { Network, NetworkId, NetworkInput } from '@/types/network';
import { supabase } from '@/services/supabaseAuthService';

export interface NetworksRepo {
  list(): Promise<Network[]>;
  create(input: NetworkInput): Promise<Network>;
  update(id: NetworkId, input: NetworkInput): Promise<Network>;
  remove(id: NetworkId): Promise<void>; // каскад: удаляет связанные точки
  getPointsCount(id: NetworkId): Promise<number>;
}

class SupabaseNetworksRepo implements NetworksRepo {
  async list(): Promise<Network[]> {
    const { data, error } = await supabase
      .from('networks')
      .select(`
        *,
        trading_points!inner(count)
      `)
      .eq('is_active', true)
      .order('name');
    
    if (error) throw error;
    return data || [];
  }

  async create(input: NetworkInput): Promise<Network> {
    if (!input.name.trim()) {
      throw new Error('Название сети обязательно');
    }
    
    const { data, error } = await supabase
      .from('networks')
      .insert({
        name: input.name,
        description: input.description,
        is_active: true
      })
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }

  async update(id: NetworkId, input: NetworkInput): Promise<Network> {
    if (!input.name.trim()) {
      throw new Error('Название сети обязательно');
    }
    
    const { data, error } = await supabase
      .from('networks')
      .update({
        name: input.name,
        description: input.description,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    if (!data) throw new Error('Сеть не найдена');
    
    return data;
  }

  async remove(id: NetworkId): Promise<void> {
    // Check if network exists
    const { data: network, error: checkError } = await supabase
      .from('networks')
      .select('id')
      .eq('id', id)
      .single();
    
    if (checkError || !network) {
      throw new Error('Сеть не найдена');
    }
    
    // Cascade delete: remove all trading points first
    const { error: pointsError } = await supabase
      .from('trading_points')
      .delete()
      .eq('network_id', id);
    
    if (pointsError) throw pointsError;
    
    // Remove the network
    const { error } = await supabase
      .from('networks')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
  }

  async getPointsCount(id: NetworkId): Promise<number> {
    const { count, error } = await supabase
      .from('trading_points')
      .select('*', { count: 'exact', head: true })
      .eq('network_id', id)
      .eq('is_active', true);
    
    if (error) throw error;
    return count || 0;
  }
}

export function createNetworksRepo(): NetworksRepo {
  return new SupabaseNetworksRepo();
}