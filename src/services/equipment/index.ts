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

// Export current implementation — всегда через backend API
export const currentEquipmentAPI = isApiMockMode() ?
  mockEquipmentAPI : realEquipmentAPI;

export const currentEquipmentTemplatesAPI = isApiMockMode() ?
  dynamicEquipmentTemplatesAPI : realEquipmentTemplatesAPI;
