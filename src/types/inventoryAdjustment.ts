export type InventoryAdjustmentStatus = 'draft' | 'sent' | 'cancelled';

export type InventoryAdjustmentEmailStatus = 'pending' | 'sent' | 'failed' | null;

export interface InventoryAdjustmentItem {
  id?: string;
  adjustmentId?: string;
  tankNumber: number;
  fuelName: string;
  bookVolumeL: number;
  bookMassKg: number | null;
  factVolumeL: number | null;
  factMassKg: number | null;
  deltaVolumeL: number | null;
  deltaMassKg: number | null;
}

export interface InventoryAdjustment {
  id: string;
  networkId: string;
  networkName: string | null;
  tradingPointId: string;
  tradingPointName: string | null;
  tradingPointAddress: string | null;
  orderNumber: string;
  orderDate: string;
  inventoryDate: string;
  effectiveAt: string;
  comment: string | null;
  status: InventoryAdjustmentStatus;
  createdByUserId: string;
  createdByName: string | null;
  createdByEmail: string | null;
  createdAt: string;
  updatedAt: string;
  sentByUserId: string | null;
  sentByName: string | null;
  sentByEmail: string | null;
  sentAt: string | null;
  cancelledByUserId: string | null;
  cancelledByName: string | null;
  cancelledByEmail: string | null;
  cancelledAt: string | null;
  cancelReason: string | null;
  pdfPath: string | null;
  emailTo: string[] | null;
  emailStatus: InventoryAdjustmentEmailStatus;
  emailError: string | null;
  totalDeltaVolumeL?: number;
  filledItemsCount?: number;
  items?: InventoryAdjustmentItem[];
}

export interface CreateInventoryAdjustmentPayload {
  networkId: string;
  tradingPointId: string;
  orderNumber: string;
  orderDate: string;
  inventoryDate: string;
  effectiveAt: string;
  comment?: string | null;
  items: Array<Pick<InventoryAdjustmentItem, 'tankNumber' | 'fuelName' | 'bookVolumeL' | 'bookMassKg' | 'factVolumeL' | 'factMassKg'>>;
}

export interface UpdateInventoryAdjustmentPayload {
  orderNumber?: string;
  orderDate?: string;
  inventoryDate?: string;
  effectiveAt?: string;
  comment?: string | null;
  items?: Array<Pick<InventoryAdjustmentItem, 'tankNumber' | 'fuelName' | 'bookVolumeL' | 'bookMassKg' | 'factVolumeL' | 'factMassKg'>>;
}

export interface InventoryAdjustmentsListFilters {
  networkId?: string;
  tradingPointId?: string;
  status?: InventoryAdjustmentStatus;
  limit?: number;
  offset?: number;
}
