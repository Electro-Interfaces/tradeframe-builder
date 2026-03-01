/**
 * Equipment Service Types
 *
 * Re-exports all types from @/types/equipment for convenience,
 * plus local service-specific types.
 */

// Re-export all types from the central types file
export type {
  EquipmentId,
  EquipmentTemplateId,
  EquipmentStatus,
  Equipment,
  EquipmentTemplate,
  EquipmentBindings,
  EquipmentComponent,
  CreateEquipmentRequest,
  UpdateEquipmentRequest,
  CreateEquipmentTemplateRequest,
  UpdateEquipmentTemplateRequest,
  EquipmentFilters,
  ListEquipmentParams,
  ListEquipmentResponse,
  EquipmentStatusAction,
  EquipmentEvent,
  TerminalEquipmentItem,
  TerminalState,
  PosTerminalInfo,
  TerminalInfo,
  FiscalRegisterDetails,
  TerminalDevice,
  BillAcceptorDetails,
  RestartTerminalResult,
  CashoutRecord,
  StationCashout
} from '@/types/equipment';

// Local service types
export type ComponentHealthStatus = 'healthy' | 'warning' | 'error';

// ApiError class used by mock implementations
export class ApiError extends Error {
  constructor(public status: number, public body: string) {
    super(`API Error ${status}: ${body}`);
    this.name = 'ApiError';
  }
}
