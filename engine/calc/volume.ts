import type { Stand } from "../inventory/types";
import type { InventoryEligibilityEntry } from "../rules/eligibility";

export interface StandVolume {
  id: string;
  quarterNumber: number;
  standNumber: number;
  volumeM3: number;
  flagged: boolean;
}

/** docs/spec.md: volume = stock per hectare × geometric area, with no intermediate rounding. */
export function calculateStandVolumeM3(stand: Stand): number | null {
  if (stand.stockM3Ha === null) return null;
  return stand.stockM3Ha * stand.areaHa;
}

export function calculateEligibleVolumes(
  entries: readonly InventoryEligibilityEntry[],
): StandVolume[] {
  return entries.flatMap((entry) => {
    if (!entry.verdict.eligible) return [];
    const volumeM3 = calculateStandVolumeM3(entry.stand);
    if (volumeM3 === null) return [];
    return [
      {
        id: entry.id,
        quarterNumber: entry.quarterNumber,
        standNumber: entry.stand.number,
        volumeM3,
        flagged: entry.stand.flags.includes("protection-zone"),
      },
    ];
  });
}

export function sumVolumeM3(volumes: readonly StandVolume[]): number {
  return volumes.reduce((sum, entry) => sum + entry.volumeM3, 0);
}
