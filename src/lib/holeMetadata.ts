import AsyncStorage from '@react-native-async-storage/async-storage';
import defaultData from '../data/hole-metadata.json';

// ───────────────────────────────────────────────────────────────
// EXPANDED SCHEMA - StrackaLine-quality metadata
// ───────────────────────────────────────────────────────────────

// Fairway cross-section measurement
export interface FairwayPoint {
  distance: number;       // yards from tee
  offset: number;         // lateral offset of fairway center from hole centerline (-left, +right) in yards
  width: number;          // fairway width at this point in yards
}

// Green details
export interface GreenDetail {
  shape: 'round' | 'oval' | 'kidney' | 'tiered' | 'long_narrow' | 'wide_shallow' | 'peanut' | 'oblong' | 'horseshoe' | 'custom';
  depth: number;          // yards front to back
  width: number;          // yards left to right
  angle?: number;         // rotation degrees (0 = aligned with fairway)
  slope_direction?: string; // general slope: back_to_front, left_to_right, etc.
  // Custom outline points for real green shapes (normalized -1 to 1 coordinate space)
  // Origin (0,0) = center of green. Points trace the outline clockwise from front-center.
  outline?: Array<{ x: number; y: number }>;
}

// Precise hazard positioning
export interface HoleHazard {
  type: string;
  location: string;
  distance_from_tee?: number;
  distance_from_green?: number;
  carry_distance?: number;
  notes?: string;
  // New precise positioning
  lateral_offset?: number;   // yards from center of fairway (-left, +right)
  length?: number;           // yards long (for bunkers, water)
  width?: number;            // yards wide
  // Custom outline points (normalized -1 to 1, centered on hazard position)
  // When present, renders exact shape instead of generic blob
  outline?: Array<{ x: number; y: number }>;
}

// Tree line border definition
export interface TreeLine {
  side: 'left' | 'right';
  points: Array<{ distance: number; offset: number }>; // distance from tee, offset from center
}

// Distance marker on diagram
export interface DistanceMarker {
  distance: number;
  label: string;           // "150", "FB", "FW narrows", etc.
  side: 'left' | 'right';
}

// Legacy fields + new expanded fields (backward compatible)
export interface HoleDetail {
  // Basic (legacy)
  shape: string;
  green_shape?: string;
  fairway_width?: string;
  elevation_change?: string;
  notes?: string;
  hazards: HoleHazard[];
  user_modified?: boolean;
  
  // New expanded fields (StrackaLine-quality)
  fairway_points?: FairwayPoint[];
  green?: GreenDetail;
  tree_lines?: TreeLine[];
  distance_markers?: DistanceMarker[];
  landing_zone_distance?: number;  // yards from tee to center of ideal landing zone
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

// ───────────────────────────────────────────────────────────────
// OPTIONS FOR UI PICKERS
// ───────────────────────────────────────────────────────────────

export const SHAPE_OPTIONS = [
  { value: 'straight', label: 'Straight', icon: '⬆️' },
  { value: 'dogleg_left', label: 'Dogleg Left', icon: '↰' },
  { value: 'dogleg_right', label: 'Dogleg Right', icon: '↱' },
  { value: 'double_dogleg', label: 'Double Dogleg', icon: '🔀' },
  { value: 'slight_left', label: 'Slight Left', icon: '↖️' },
  { value: 'slight_right', label: 'Slight Right', icon: '↗️' },
];

export const GREEN_SHAPE_OPTIONS = [
  { value: 'round', label: 'Round' },
  { value: 'oval', label: 'Oval' },
  { value: 'kidney', label: 'Kidney' },
  { value: 'tiered', label: 'Tiered' },
  { value: 'long_narrow', label: 'Long & Narrow' },
  { value: 'wide_shallow', label: 'Wide & Shallow' },
  { value: 'peanut', label: 'Peanut' },
  { value: 'oblong', label: 'Oblong' },
  { value: 'horseshoe', label: 'Horseshoe' },
];

export const FAIRWAY_WIDTH_OPTIONS = [
  { value: '<30 yds', label: '<30 yds', icon: '▎' },
  { value: '30-50 yds', label: '30-50 yds', icon: '▌' },
  { value: '>50 yds', label: '>50 yds', icon: '█' },
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
  { value: 'lateral_water', label: 'Lateral Water', icon: '🌊' },
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

// ───────────────────────────────────────────────────────────────
// UTILITY: Generate fairway_points from legacy data
// ───────────────────────────────────────────────────────────────

export function generateFairwayPoints(
  yardage: number,
  shape: string,
  fairwayWidth: string,
  par: number
): FairwayPoint[] {
  // Base fairway width based on legacy setting
  let baseWidth: number;
  switch (fairwayWidth) {
    case '<30 yds': baseWidth = 25; break;
    case '>50 yds': baseWidth = 55; break;
    default: baseWidth = 40; break;
  }
  
  // Narrow for par 3s
  if (par === 3) baseWidth = Math.min(baseWidth, 30);
  
  // Generate points every ~50 yards
  const points: FairwayPoint[] = [];
  const numPoints = Math.max(5, Math.ceil(yardage / 50));
  
  for (let i = 0; i <= numPoints; i++) {
    const t = i / numPoints;
    const distance = Math.round(t * yardage);
    
    // Calculate offset based on shape
    let offset = 0;
    switch (shape) {
      case 'dogleg_left':
        // Bends left in the middle portion
        if (t > 0.3 && t < 0.8) {
          offset = -15 * Math.sin((t - 0.3) / 0.5 * Math.PI);
        }
        break;
      case 'dogleg_right':
        if (t > 0.3 && t < 0.8) {
          offset = 15 * Math.sin((t - 0.3) / 0.5 * Math.PI);
        }
        break;
      case 'double_dogleg':
        offset = 12 * Math.sin(t * 2 * Math.PI);
        break;
      case 'slight_left':
        offset = -8 * t;
        break;
      case 'slight_right':
        offset = 8 * t;
        break;
    }
    
    // Width varies: narrower at tee and green, wider in landing zone
    let widthMultiplier = 1;
    if (par >= 4) {
      // Landing zone (around 250 yards or 60% of hole) is widest
      const landingT = par === 5 ? 0.45 : 0.55;
      widthMultiplier = 0.6 + 0.5 * Math.exp(-Math.pow((t - landingT) / 0.25, 2));
    } else {
      widthMultiplier = 0.5 + 0.5 * Math.sin(t * Math.PI);
    }
    
    points.push({
      distance,
      offset: Math.round(offset),
      width: Math.round(baseWidth * widthMultiplier),
    });
  }
  
  return points;
}

// Generate reasonable tree lines based on shape
export function generateTreeLines(
  yardage: number,
  shape: string,
  fairwayWidth: string
): TreeLine[] {
  let baseOffset: number;
  switch (fairwayWidth) {
    case '<30 yds': baseOffset = 22; break;
    case '>50 yds': baseOffset = 45; break;
    default: baseOffset = 32; break;
  }
  
  const numPoints = Math.max(4, Math.ceil(yardage / 80));
  const leftPoints: Array<{ distance: number; offset: number }> = [];
  const rightPoints: Array<{ distance: number; offset: number }> = [];
  
  for (let i = 0; i <= numPoints; i++) {
    const t = i / numPoints;
    const distance = Math.round(t * yardage);
    
    let shapeOffset = 0;
    switch (shape) {
      case 'dogleg_left':
        if (t > 0.3 && t < 0.8) shapeOffset = -15 * Math.sin((t - 0.3) / 0.5 * Math.PI);
        break;
      case 'dogleg_right':
        if (t > 0.3 && t < 0.8) shapeOffset = 15 * Math.sin((t - 0.3) / 0.5 * Math.PI);
        break;
      case 'double_dogleg':
        shapeOffset = 12 * Math.sin(t * 2 * Math.PI);
        break;
    }
    
    // Add organic variation
    const wobble = 5 * Math.sin(t * 7 + 1.3);
    
    leftPoints.push({ distance, offset: Math.round(-baseOffset + shapeOffset - wobble) });
    rightPoints.push({ distance, offset: Math.round(baseOffset + shapeOffset + wobble) });
  }
  
  return [
    { side: 'left', points: leftPoints },
    { side: 'right', points: rightPoints },
  ];
}
