export const EQUIPMENT_CARD_CLASS = 'rounded-2xl border border-di-outline-variant';
export const EQUIPMENT_SURFACE_CARD_CLASS = `${EQUIPMENT_CARD_CLASS} bg-di-surface-mid`;
export const EQUIPMENT_SUBCARD_CLASS = `${EQUIPMENT_CARD_CLASS} bg-di-surface-low`;
export const EQUIPMENT_DIALOG_CARD_CLASS = `${EQUIPMENT_CARD_CLASS} bg-di-surface-low`;
export const EQUIPMENT_CARD_PADDING_CLASS = 'p-4 md:p-5';
export const EQUIPMENT_CARD_INNER_PADDING_CLASS = 'p-4';
export const EQUIPMENT_CONTROL_CONTENT_CLASS = 'gap-2';

export function getEquipmentControlHeightClass(isMobile: boolean): string {
  return isMobile ? 'h-10' : 'h-10';
}

export function getEquipmentIconButtonClass(isMobile: boolean): string {
  return `${getEquipmentControlHeightClass(isMobile)} ${isMobile ? 'w-11' : 'w-10'} p-0`;
}

export function getEquipmentActionButtonClass(isMobile: boolean): string {
  return `${getEquipmentControlHeightClass(isMobile)} ${EQUIPMENT_CONTROL_CONTENT_CLASS} px-3`;
}
