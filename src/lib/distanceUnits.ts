import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type DistanceUnit = 'yards' | 'meters';

const STORAGE_KEY = 'sb_distance_unit';
const YARDS_TO_METERS = 0.9144;

// Global listeners for unit changes
type UnitListener = (unit: DistanceUnit) => void;
const listeners = new Set<UnitListener>();

let cachedUnit: DistanceUnit | null = null;

/**
 * Hook to manage and access distance unit preference
 */
export function useDistanceUnit() {
  const [unit, setUnitState] = useState<DistanceUnit>(cachedUnit || 'yards');
  const [loading, setLoading] = useState(!cachedUnit);

  useEffect(() => {
    // Load from storage on mount
    const load = async () => {
      try {
        const stored = await AsyncStorage.getItem(STORAGE_KEY);
        const loadedUnit = (stored === 'meters' ? 'meters' : 'yards') as DistanceUnit;
        cachedUnit = loadedUnit;
        setUnitState(loadedUnit);
      } catch {
        // Default to yards
        setUnitState('yards');
      }
      setLoading(false);
    };

    if (!cachedUnit) {
      load();
    } else {
      setLoading(false);
    }

    // Subscribe to changes from other components
    const listener: UnitListener = (newUnit) => {
      setUnitState(newUnit);
    };
    listeners.add(listener);

    return () => {
      listeners.delete(listener);
    };
  }, []);

  const setUnit = useCallback(async (newUnit: DistanceUnit) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, newUnit);
      cachedUnit = newUnit;
      setUnitState(newUnit);
      // Notify all listeners
      listeners.forEach(l => l(newUnit));
    } catch (e) {
      console.error('Failed to save distance unit:', e);
    }
  }, []);

  const toggleUnit = useCallback(() => {
    const newUnit = unit === 'yards' ? 'meters' : 'yards';
    setUnit(newUnit);
  }, [unit, setUnit]);

  return { unit, setUnit, toggleUnit, loading };
}

/**
 * Convert yards to meters
 */
export function yardsToMeters(yards: number): number {
  return Math.round(yards * YARDS_TO_METERS);
}

/**
 * Convert meters to yards
 */
export function metersToYards(meters: number): number {
  return Math.round(meters / YARDS_TO_METERS);
}

/**
 * Format a distance with unit label
 * @param yards Distance in yards (always stored internally as yards)
 * @param unit Display unit preference
 * @param includeUnit Whether to include "yds" or "m" suffix
 */
export function formatDistance(
  yards: number | undefined | null,
  unit: DistanceUnit,
  includeUnit: boolean = true
): string {
  if (yards === undefined || yards === null) {
    return '—';
  }

  if (unit === 'meters') {
    const meters = yardsToMeters(yards);
    return includeUnit ? `${meters}m` : `${meters}`;
  }

  return includeUnit ? `${yards} yds` : `${yards}`;
}

/**
 * Get compact unit suffix
 */
export function getUnitSuffix(unit: DistanceUnit): string {
  return unit === 'meters' ? 'm' : 'yds';
}

/**
 * Get full unit label
 */
export function getUnitLabel(unit: DistanceUnit): string {
  return unit === 'meters' ? 'Meters' : 'Yards';
}

/**
 * Parse user input distance to yards (for storage)
 * If user is in meters mode, convert input to yards
 */
export function parseDistanceInput(value: string, currentUnit: DistanceUnit): number | null {
  const num = parseFloat(value);
  if (isNaN(num)) return null;
  
  if (currentUnit === 'meters') {
    return metersToYards(num);
  }
  return Math.round(num);
}
