/**
 * Equipment Service - Barrel Export
 *
 * Re-exports all types, mock APIs, real APIs, and provides
 * conditional current* exports that switch between mock and real
 * based on environment/config.
 */

// Re-export all types
export type { ComponentHealthStatus } from './types';
export { ApiError } from './types';

// Re-export real API implementations
export {
  equipmentAPI,
  equipmentTemplatesAPI,
  getEquipmentComponentsHealth,
  realEquipmentAPI,
  realEquipmentTemplatesAPI
} from './realEquipment';

// Re-export mock API implementations
export {
  mockEquipmentAPI,
  mockEquipmentTemplatesAPI,
  dynamicEquipmentTemplatesAPI
} from './mockEquipment';

// Import for conditional switching
import { isApiMockMode } from '@/services/apiConfigService';
import { mockEquipmentAPI, dynamicEquipmentTemplatesAPI } from './mockEquipment';
import { realEquipmentAPI, realEquipmentTemplatesAPI } from './realEquipment';

// Import Supabase services
import {
  supabaseEquipmentAPI,
  supabaseEquipmentTemplatesAPI
} from '../equipmentSupabase';

// Export current implementation - prioritize Supabase over HTTP API
const useSupabase = import.meta.env.VITE_USE_SUPABASE_DIRECT === 'true';

export const currentEquipmentAPI = isApiMockMode() ?
  mockEquipmentAPI :
  (useSupabase ? supabaseEquipmentAPI : realEquipmentAPI);

export const currentEquipmentTemplatesAPI = isApiMockMode() ?
  dynamicEquipmentTemplatesAPI :
  (useSupabase ? supabaseEquipmentTemplatesAPI : realEquipmentTemplatesAPI);
