export type NetworkId = string;

export interface Network {
  id: NetworkId;
  name: string;
  description?: string;
  type?: string; // "АЗС" и т.п.
  pointsCount: number;
}

export interface NetworkInput {
  name: string;
  description?: string;
  type?: string;
}