export type NetworkId = string;

export interface Network {
  id: NetworkId;
  external_id?: string; // ID для синхронизации с торговым API
  name: string;
  description: string;
  type: string; // "АЗС" и т.п.
  pointsCount: number;
  code?: string; // Код сети для API
  status?: string; // Статус сети (active, inactive)
  settings?: Record<string, any>; // Настройки сети
  created_at?: string;
  updated_at?: string;
}

export interface NetworkInput {
  name: string;
  description?: string;
  type?: string;
  external_id?: string; // ID для синхронизации с торговым API
  code?: string; // Код сети для API
  status?: string; // Статус сети (active, inactive)
}