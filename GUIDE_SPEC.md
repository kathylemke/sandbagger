# Course Guide Overhaul Specification

## Goal
Make hole diagrams look like StrackaLine yardage books — clean, to-scale, detailed 2D overhead views.

## What StrackaLine Books Show
- To-scale aerial view, tee at bottom, green at top
- **Fairway outline** traced from real satellite imagery — organic curves, accurate widths at multiple points
- **Tree lines** as solid organic borders along fairway edges (not individual circles)
- **Bunker shapes** that match real bunker outlines (kidney, crescent, etc.), not generic ellipses
- **Multiple distance markers** down both sides: distances from tee to specific points (bunker edges, fairway narrows, green front)
- **Landing zone** highlighted subtly
- **Green shape** accurately drawn with surrounding bunkers precisely placed
- **Fairway width labels** at multiple cross-sections
- **Muted professional palette**: dark olive rough, lighter sage fairway, tan bunkers, blue water, dark green trees
- **Minimal UI** — no gradients, no 3D effects, just clean flat 2D

## Expanded Metadata Schema

The current schema is too simple. New schema per hole:

```typescript
interface HoleMetadata {
  // Basic
  shape: 'straight' | 'dogleg_left' | 'dogleg_right' | 'double_dogleg' | 'slight_left' | 'slight_right';
  elevation_change: 'uphill' | 'downhill' | 'flat' | 'undulating';
  
  // Fairway outline — array of {distance_from_tee, center_offset, width} measurements
  // Used to draw accurate fairway shape at multiple cross-sections
  fairway_points: Array<{
    distance: number;       // yards from tee
    offset: number;         // lateral offset of fairway center from hole centerline (-left, +right) in yards
    width: number;          // fairway width at this point in yards
  }>;
  
  // Green
  green: {
    shape: 'round' | 'oval' | 'kidney' | 'tiered' | 'long_narrow' | 'wide_shallow' | 'peanut' | 'oblong';
    depth: number;          // yards front to back
    width: number;          // yards left to right
    angle: number;          // rotation degrees (0 = aligned with fairway)
    slope_direction?: string; // general slope: back_to_front, left_to_right, etc.
  };
  
  // Hazards with precise positioning
  hazards: Array<{
    type: 'fairway_bunker' | 'greenside_bunker' | 'water' | 'lateral_water' | 'waste_area' | 'ob' | 'trees' | 'forced_carry';
    distance_from_tee: number;
    side: 'left' | 'right' | 'center' | 'front' | 'back';
    lateral_offset: number;   // yards from center of fairway
    length: number;           // yards long
    width: number;            // yards wide
    carry_distance?: number;
    notes?: string;
  }>;
  
  // Tree lines — arrays of points defining tree border
  tree_lines: Array<{
    side: 'left' | 'right';
    points: Array<{ distance: number; offset: number }>; // distance from tee, offset from center
  }>;
  
  // Distance markers to show on the diagram
  distance_markers: Array<{
    distance: number;
    label: string;           // "150", "FB", "FW narrows", etc.
    side: 'left' | 'right';
  }>;
  
  notes?: string;
}
```

## Rendering Approach
1. Calculate scale: fit hole length into SVG height with padding
2. Draw rough background (dark olive)
3. Draw tree lines as filled organic shapes
4. Draw fairway by interpolating through fairway_points with smooth curves
5. Draw hazards at precise positions with organic blob shapes
6. Draw green with accurate shape and size
7. Add distance markers along edges
8. Add subtle landing zone indicator
9. Flag on green

## Color Palette
- Background/rough: #3d5c32
- Trees: #2d4a24
- Fairway: #6aaa54  
- Green: #5cb848
- Green fringe: #4a9a3c
- Bunker fill: #e8dbb0
- Bunker stroke: #c4a868
- Water: #5a9cc4
- Distance text: rgba(255,255,255,0.6)
- OB stakes: #cc3333

## Research Sources for Each Course
1. **Google Earth** — satellite view for fairway shapes, tree lines, bunker outlines
2. **BlueGolf** — hole-by-hole descriptions, scorecards
3. **18Birdies** — course flyovers, distances
4. **Course websites** — hole descriptions, yardage guides
5. **GolfNow/GolfAdvisor** — course reviews with hole details
6. **PGA Tour** — for tour courses, detailed hole descriptions
