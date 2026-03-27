/**
 * Equipment Service — всегда real API (mock удалён).
 */

export type { ComponentHealthStatus } from './types';
export { ApiError } from './types';

export {
  equipmentAPI,
  equipmentTemplatesAPI,
  getEquipmentComponentsHealth,
  realEquipmentAPI,
  realEquipmentTemplatesAPI
} from './realEquipment';

import { realEquipmentAPI, realEquipmentTemplatesAPI } from './realEquipment';

export const currentEquipmentAPI = realEquipmentAPI;
export const currentEquipmentTemplatesAPI = realEquipmentTemplatesAPI;
