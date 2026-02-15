import AsyncStorage from '@react-native-async-storage/async-storage';
import defaultData from '../data/hole-metadata.json';

export interface HoleHazard {
  type: string;
  location: string;
  distance_from_tee?: number;
  distance_from_green?: number;
  carry_distance?: number;
  notes?: string;
}

export interface HoleDetail {
  shape: string;
  green_shape?: string;
  fairway_width?: string;
  elevation_change?: string;
  notes?: string;
  hazards: HoleHazard[];
  user_modified?: boolean;
}

export type CourseMetadata = Record<string, HoleDetail>;

const STORAGE_KEY = 'sb_hole_metadata_overrides';

export async function getOverrides(): Promise<Record<string, CourseMetadata>> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch { return {}; }
}

export async function saveOverrides(overrides: Record<string, CourseMetadata>): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(overrides));
}

export async function getHoleDetails(courseId: string): Promise<CourseMetadata> {
  const defaults = (defaultData as any)[courseId] || {};
  const overrides = await getOverrides();
  const courseOverrides = overrides[courseId] || {};
  
  const merged: CourseMetadata = {};
  for (let i = 1; i <= 18; i++) {
    const key = String(i);
    if (courseOverrides[key]) {
      merged[key] = { ...courseOverrides[key], user_modified: true };
    } else if (defaults[key]) {
      merged[key] = { ...defaults[key], user_modified: false };
    } else {
      merged[key] = { shape: 'straight', hazards: [], user_modified: false };
    }
  }
  return merged;
}

export async function saveHoleDetail(courseId: string, holeNumber: number, detail: HoleDetail): Promise<void> {
  const overrides = await getOverrides();
  if (!overrides[courseId]) overrides[courseId] = {};
  overrides[courseId][String(holeNumber)] = { ...detail, user_modified: true };
  await saveOverrides(overrides);
}

export async function resetHoleDetail(courseId: string, holeNumber: number): Promise<void> {
  const overrides = await getOverrides();
  if (overrides[courseId]) {
    delete overrides[courseId][String(holeNumber)];
    if (Object.keys(overrides[courseId]).length === 0) delete overrides[courseId];
    await saveOverrides(overrides);
  }
}

export const SHAPE_OPTIONS = [
  { value: 'straight', label: 'Straight', icon: '⬆️' },
  { value: 'dogleg_left', label: 'Dogleg Left', icon: '↰' },
  { value: 'dogleg_right', label: 'Dogleg Right', icon: '↱' },
  { value: 'double_dogleg', label: 'Double Dogleg', icon: '🔀' },
];

export const GREEN_SHAPE_OPTIONS = [
  { value: 'round', label: 'Round' },
  { value: 'oval', label: 'Oval' },
  { value: 'kidney', label: 'Kidney' },
  { value: 'tiered', label: 'Tiered' },
  { value: 'long_narrow', label: 'Long & Narrow' },
  { value: 'wide_shallow', label: 'Wide & Shallow' },
];

export const FAIRWAY_WIDTH_OPTIONS = [
  { value: 'narrow', label: 'Narrow', icon: '▎' },
  { value: 'medium', label: 'Medium', icon: '▌' },
  { value: 'wide', label: 'Wide', icon: '█' },
];

export const ELEVATION_OPTIONS = [
  { value: 'uphill', label: 'Uphill', icon: '⛰️' },
  { value: 'downhill', label: 'Downhill', icon: '⬇️' },
  { value: 'flat', label: 'Flat', icon: '➡️' },
  { value: 'undulating', label: 'Undulating', icon: '〰️' },
];

export const HAZARD_TYPE_OPTIONS = [
  { value: 'fairway_bunker', label: 'Fairway Bunker', icon: '🏖️' },
  { value: 'greenside_bunker', label: 'Greenside Bunker', icon: '⛱️' },
  { value: 'water', label: 'Water', icon: '💧' },
  { value: 'waste_area', label: 'Waste Area', icon: '🏜️' },
  { value: 'ob', label: 'Out of Bounds', icon: '🚫' },
  { value: 'trees', label: 'Trees', icon: '🌳' },
  { value: 'forced_carry', label: 'Forced Carry', icon: '🎯' },
];

export const LOCATION_OPTIONS = [
  { value: 'left', label: 'Left' },
  { value: 'right', label: 'Right' },
  { value: 'center', label: 'Center' },
  { value: 'front', label: 'Front' },
  { value: 'back', label: 'Back' },
  { value: 'front_left', label: 'Front Left' },
  { value: 'front_right', label: 'Front Right' },
  { value: 'back_left', label: 'Back Left' },
  { value: 'back_right', label: 'Back Right' },
  { value: 'surrounds', label: 'Surrounds' },
];

export function getShapeIcon(shape: string): string {
  return SHAPE_OPTIONS.find(s => s.value === shape)?.icon || '⬆️';
}

export function getHazardIcon(type: string): string {
  return HAZARD_TYPE_OPTIONS.find(h => h.value === type)?.icon || '⚠️';
}

export function getHazardLabel(type: string): string {
  return HAZARD_TYPE_OPTIONS.find(h => h.value === type)?.label || type.replace(/_/g, ' ');
}

export function getLocationLabel(loc: string): string {
  return LOCATION_OPTIONS.find(l => l.value === loc)?.label || loc.replace(/_/g, ' ');
}
