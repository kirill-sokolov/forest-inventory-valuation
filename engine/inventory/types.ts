export type StandFlag = "protection-zone" | "non-forest" | "no-formula";

export interface AreaBreakdown {
  forestHa: number;
  roadsHa: number;
  ditchesHa: number;
}

export interface ProtectionNote {
  code: string;
  text: string;
}

export interface StandNotes {
  lastFelling?: string;
  lastActivity?: string;
  restored?: string;
  protection?: ProtectionNote;
  areaBreakdown?: AreaBreakdown;
}

export interface Stand {
  number: number;
  areaHa: number;
  landKind: string;
  forestType: string | null;
  formulaRaw: string | null;
  origin: string | null;
  bonitate: string | null;
  heightM: number | null;
  diameterCm: number | null;
  ageYears: number | null;
  density: number | null;
  basalAreaM2Ha: number | null;
  treesPerHa: number | null;
  stockM3Ha: number | null;
  notes: StandNotes;
  flags: StandFlag[];
}

export interface Quarter {
  number: number;
  stands: Stand[];
}

export interface InventoryProperty {
  landUnit: string;
  propertyCadastre: string;
  propertyName: string;
  parish: string;
  farm: string;
  inventoryYear: number;
  reportDate?: string;
}

export interface InventoryTotals {
  totalHa: number;
  forestHa: number;
  roadsHa?: number;
  ditchesHa?: number;
}

export interface Inventory {
  property: InventoryProperty;
  totals: InventoryTotals;
  quarters: Quarter[];
}

export function allStands(inventory: Inventory): Stand[] {
  return inventory.quarters.flatMap((quarter) => quarter.stands);
}
