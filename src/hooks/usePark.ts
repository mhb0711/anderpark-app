import { useCallback, useEffect, useState } from 'react';
import { getLine, MAX_INSTANCES_PER_LINE } from '../data/decorations';
import { FURNITURE_ITEMS, getFurniture } from '../data/furniture';
import { getOutfit, OUTFIT_ITEMS } from '../data/outfits';
import { getTheme, PARK_THEMES } from '../data/themes';

const STORAGE_KEY = 'anderpark-park';
export const MAX_ROOM_FURNITURE = 6;
export const PARK_EXPANSION_COSTS = [120, 280, 500];
export const MAX_PARK_EXPANSION_TIER = PARK_EXPANSION_COSTS.length;

export interface RoomFurnitureInstance {
  id: string;
  itemId: string;
  left: number;
  bottom: number;
}

export interface DecorationInstance {
  id: string;
  lineId: string;
  /** 0-indexed tier currently owned for this specific instance. */
  tier: number;
  left: number;
  bottom: number;
  /** Locked instances can't be dragged until unlocked again. */
  locked?: boolean;
  /** Only present for housing at Mansion tier or above. */
  room?: { furniture: RoomFurnitureInstance[] };
}

interface ParkState {
  coins: number;
  instances: DecorationInstance[];
  ownedOutfitIds: string[];
  equippedOutfitId: string | null;
  ownedThemeIds: string[];
  activeThemeId: string;
  parkExpansionTier: number;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function defaultPosition(index: number): { left: number; bottom: number } {
  return { left: 14 + ((index * 27) % 70), bottom: 6 + ((index * 11) % 16) };
}

function defaultRoomPosition(index: number): { left: number; bottom: number } {
  return { left: 10 + ((index * 23) % 76), bottom: 4 + ((index * 7) % 10) };
}

// Older saves owned at most one instance per line, keyed by lineId with a
// single tier count and position. Fold those into the new instance list so
// existing parks don't lose their decorations when this ships.
function migrateLegacy(parsed: Record<string, unknown>): DecorationInstance[] {
  const ownedTierByLine = (parsed.ownedTierByLine as Record<string, number>) ?? {};
  const decorationPositions = (parsed.decorationPositions as Record<string, { left: number; bottom: number }>) ?? {};
  const instances: DecorationInstance[] = [];
  Object.entries(ownedTierByLine).forEach(([lineId, owned], i) => {
    if (!owned || owned <= 0) return;
    const position = decorationPositions[lineId] ?? defaultPosition(i);
    instances.push({ id: crypto.randomUUID(), lineId, tier: owned - 1, left: position.left, bottom: position.bottom });
  });
  return instances;
}

function loadPark(): ParkState {
  const raw = localStorage.getItem(STORAGE_KEY);
  const fallback: ParkState = {
    coins: 0,
    instances: [],
    ownedOutfitIds: [],
    equippedOutfitId: null,
    ownedThemeIds: ['classic'],
    activeThemeId: 'classic',
    parkExpansionTier: 0,
  };
  if (!raw) return fallback;
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const instances = Array.isArray(parsed.instances)
      ? (parsed.instances as DecorationInstance[])
      : migrateLegacy(parsed);
    return {
      coins: (parsed.coins as number) ?? 0,
      instances,
      ownedOutfitIds: Array.isArray(parsed.ownedOutfitIds) ? (parsed.ownedOutfitIds as string[]) : [],
      equippedOutfitId: (parsed.equippedOutfitId as string | null) ?? null,
      ownedThemeIds: Array.isArray(parsed.ownedThemeIds) ? (parsed.ownedThemeIds as string[]) : ['classic'],
      activeThemeId: (parsed.activeThemeId as string) ?? 'classic',
      parkExpansionTier: (parsed.parkExpansionTier as number) ?? 0,
    };
  } catch {
    return fallback;
  }
}

// Housing instances at Mansion tier (index 2) or above get an interior room
// you can furnish separately from the park.
export function hasRoom(instance: DecorationInstance): boolean {
  return instance.lineId === 'doghouse' && instance.tier >= 2;
}

export function usePark() {
  const [park, setPark] = useState<ParkState>(loadPark);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(park));
  }, [park]);

  // Also used with a negative amount for struggle-drain — coins never go
  // below 0 either way.
  const earnCoins = useCallback((amount: number) => {
    setPark((p) => ({ ...p, coins: Math.max(0, p.coins + amount) }));
  }, []);

  // Buys a brand-new instance at tier 1 of a line — you can own several of
  // the same line at once (up to the cap), each upgraded independently.
  // Returns the new instance's id (for a first-appearance celebration), or
  // null if the purchase didn't go through.
  //
  // Eligibility is checked against `park` directly (not inside the setPark
  // updater) because a setState updater isn't guaranteed to run
  // synchronously — a `let` flipped inside it can't be trusted as a return
  // value read right after the setPark call returns.
  const buyNew = useCallback(
    (lineId: string): string | null => {
      const line = getLine(lineId);
      if (!line) return null;
      const owned = park.instances.filter((inst) => inst.lineId === lineId).length;
      if (owned >= MAX_INSTANCES_PER_LINE) return null;
      const firstTier = line.tiers[0];
      if (!firstTier || park.coins < firstTier.cost) return null;

      const id = crypto.randomUUID();
      const position = defaultPosition(park.instances.length);
      const instance: DecorationInstance = { id, lineId, tier: 0, left: position.left, bottom: position.bottom };
      setPark((p) => ({ ...p, coins: p.coins - firstTier.cost, instances: [...p.instances, instance] }));
      return id;
    },
    [park],
  );

  const upgradeInstance = useCallback((instanceId: string) => {
    setPark((p) => {
      const instance = p.instances.find((i) => i.id === instanceId);
      if (!instance) return p;
      const line = getLine(instance.lineId);
      const nextTier = line?.tiers[instance.tier + 1];
      if (!nextTier || p.coins < nextTier.cost) return p;
      return {
        ...p,
        coins: p.coins - nextTier.cost,
        instances: p.instances.map((i) => (i.id === instanceId ? { ...i, tier: i.tier + 1 } : i)),
      };
    });
  }, []);

  // Refunds half the cost of the tier the instance is currently at, then
  // removes it from the park.
  const sellInstance = useCallback((instanceId: string) => {
    setPark((p) => {
      const instance = p.instances.find((i) => i.id === instanceId);
      if (!instance) return p;
      const line = getLine(instance.lineId);
      const tier = line?.tiers[instance.tier];
      const refund = tier ? Math.floor(tier.cost / 2) : 0;
      return {
        ...p,
        coins: p.coins + refund,
        instances: p.instances.filter((i) => i.id !== instanceId),
      };
    });
  }, []);

  const toggleLock = useCallback((instanceId: string) => {
    setPark((p) => ({
      ...p,
      instances: p.instances.map((i) => (i.id === instanceId ? { ...i, locked: !i.locked } : i)),
    }));
  }, []);

  const moveDecoration = useCallback((instanceId: string, left: number, bottom: number) => {
    setPark((p) => ({
      ...p,
      instances: p.instances.map((i) =>
        i.id === instanceId && !i.locked ? { ...i, left: clamp(left, 2, 96), bottom: clamp(bottom, 2, 96) } : i,
      ),
    }));
  }, []);

  // Returns whether the purchase went through (same pattern as buyNew) so
  // callers — e.g. a purchase sound effect — only fire on an actual buy.
  const buyOutfit = useCallback(
    (outfitId: string): boolean => {
      if (park.ownedOutfitIds.includes(outfitId)) return false;
      const outfit = getOutfit(outfitId);
      if (!outfit || park.coins < outfit.cost) return false;
      setPark((p) => ({ ...p, coins: p.coins - outfit.cost, ownedOutfitIds: [...p.ownedOutfitIds, outfitId] }));
      return true;
    },
    [park],
  );

  const equipOutfit = useCallback((outfitId: string | null) => {
    setPark((p) => {
      if (outfitId !== null && !p.ownedOutfitIds.includes(outfitId)) return p;
      return { ...p, equippedOutfitId: outfitId };
    });
  }, []);

  const buyTheme = useCallback(
    (themeId: string): boolean => {
      if (park.ownedThemeIds.includes(themeId)) return false;
      const theme = getTheme(themeId);
      if (!theme || park.coins < theme.cost) return false;
      setPark((p) => ({ ...p, coins: p.coins - theme.cost, ownedThemeIds: [...p.ownedThemeIds, themeId] }));
      return true;
    },
    [park],
  );

  const setActiveTheme = useCallback((themeId: string) => {
    setPark((p) => (p.ownedThemeIds.includes(themeId) ? { ...p, activeThemeId: themeId } : p));
  }, []);

  const buyParkExpansion = useCallback((): boolean => {
    if (park.parkExpansionTier >= MAX_PARK_EXPANSION_TIER) return false;
    const cost = PARK_EXPANSION_COSTS[park.parkExpansionTier];
    if (park.coins < cost) return false;
    setPark((p) => ({ ...p, coins: p.coins - cost, parkExpansionTier: p.parkExpansionTier + 1 }));
    return true;
  }, [park]);

  const addRoomFurniture = useCallback((instanceId: string, itemId: string) => {
    setPark((p) => {
      const instance = p.instances.find((i) => i.id === instanceId);
      const item = getFurniture(itemId);
      if (!instance || !item || p.coins < item.cost) return p;
      const existing = instance.room?.furniture ?? [];
      if (existing.length >= MAX_ROOM_FURNITURE) return p;
      const position = defaultRoomPosition(existing.length);
      const piece: RoomFurnitureInstance = { id: crypto.randomUUID(), itemId, ...position };
      return {
        ...p,
        coins: p.coins - item.cost,
        instances: p.instances.map((i) =>
          i.id === instanceId ? { ...i, room: { furniture: [...existing, piece] } } : i,
        ),
      };
    });
  }, []);

  const moveRoomFurniture = useCallback((instanceId: string, furnitureId: string, left: number, bottom: number) => {
    setPark((p) => ({
      ...p,
      instances: p.instances.map((i) => {
        if (i.id !== instanceId || !i.room) return i;
        return {
          ...i,
          room: {
            furniture: i.room.furniture.map((f) =>
              f.id === furnitureId ? { ...f, left: clamp(left, 4, 92), bottom: clamp(bottom, 2, 44) } : f,
            ),
          },
        };
      }),
    }));
  }, []);

  return {
    coins: park.coins,
    instances: park.instances,
    ownedOutfitIds: park.ownedOutfitIds,
    equippedOutfitId: park.equippedOutfitId,
    ownedThemeIds: park.ownedThemeIds,
    activeThemeId: park.activeThemeId,
    parkExpansionTier: park.parkExpansionTier,
    earnCoins,
    buyNew,
    upgradeInstance,
    sellInstance,
    toggleLock,
    moveDecoration,
    buyOutfit,
    equipOutfit,
    buyTheme,
    setActiveTheme,
    buyParkExpansion,
    addRoomFurniture,
    moveRoomFurniture,
  };
}

export { FURNITURE_ITEMS, OUTFIT_ITEMS, PARK_THEMES };
