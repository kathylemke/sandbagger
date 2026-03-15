import { View, StyleSheet } from 'react-native';
import Svg, { Path, Circle, Ellipse, G, Text as SvgText, Line, Rect, Defs, LinearGradient, Stop, Pattern } from 'react-native-svg';
import { HoleDetail, HoleHazard, FairwayPoint, TreeLine, generateFairwayPoints, generateTreeLines } from '../lib/holeMetadata';
import { useDistanceUnit, yardsToMeters } from '../lib/distanceUnits';

interface HoleInfo {
  hole_number: number;
  par: number;
  yardage: number;
  handicap_index?: number;
}

interface Props {
  hole: HoleInfo;
  metadata: HoleDetail;
  page: 'hole' | 'green';
}

// ─── PuttView Yardage Book Dimensions ───
// Professional yardage book style: clean, informative, premium feel
const PAGE_W = 280;
const PAGE_H = 420;
const PAD_TOP = 44;
const PAD_BOTTOM = 50;
const PAD_SIDE = 24;

// ─── PuttView Color Palette ───
// Clean, muted professional tones
const C = {
  pageBg:       '#f8f6f1',   // Warm off-white paper
  grid:         '#e8e4dc',   // Subtle grid
  fairway:      '#9cc78f',   // Soft grass green
  fairwayStroke:'#7aaa6d',   // Fairway edge
  rough:        '#c5d4a8',   // Light rough/first cut
  green:        '#68b858',   // Putting surface - brighter
  greenFringe:  '#82c474',   // Collar
  greenContour: 'rgba(45,90,35,0.35)', // Contour lines on green
  bunker:       '#f5e6c4',   // Warm sand
  bunkerStroke: '#d4c49a',   // Bunker outline
  water:        '#a8d4e6',   // Light blue water
  waterFill:    '#c4e4f2',   // Water fill - lighter
  waterStroke:  '#78b4d0',   // Water outline
  teeBox:       '#4a7a42',   // Dark green tee
  treeLine:     '#3d5c35',   // Dark tree mass
  treeCluster:  '#2d4a28',   // Darker tree blob
  ob:           '#c44',      // OB stakes
  text:         '#2a2a2a',   // Primary text
  textLight:    '#666666',   // Secondary text
  distLine:     '#888888',   // Distance marker lines
  distText:     '#444444',   // Distance text
  flagRed:      '#cc2222',
  contourLine:  'rgba(80,60,40,0.25)', // Elevation contours
  yardageMark:  '#555555',   // Yardage marker circles
};

// ─── Smooth curve through points (Catmull-Rom → Cubic Bezier) ───
type Pt = { x: number; y: number };

function smoothPath(points: Pt[], closed = false): string {
  if (points.length < 2) return '';
  if (points.length === 2) {
    return `M${p(points[0])} L${p(points[1])}`;
  }
  let d = `M${p(points[0])}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[Math.max(0, i - 1)];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[Math.min(points.length - 1, i + 2)];
    const t = 0.35;
    d += ` C${f(p1.x + (p2.x - p0.x) * t)} ${f(p1.y + (p2.y - p0.y) * t)} ${f(p2.x - (p3.x - p1.x) * t)} ${f(p2.y - (p3.y - p1.y) * t)} ${p(p2)}`;
  }
  if (closed) d += ' Z';
  return d;
}
function p(pt: Pt) { return `${f(pt.x)} ${f(pt.y)}`; }
function f(n: number) { return n.toFixed(1); }

// ─── Organic blob shape for bunkers/water with more natural variation ───
function blobPath(cx: number, cy: number, w: number, h: number, seed: number, complexity: number = 14): string {
  const pts: Pt[] = [];
  for (let i = 0; i < complexity; i++) {
    const a = (i / complexity) * Math.PI * 2;
    // Clean organic shape — subtle variation for professional look
    const wobble = 1 + 
      0.10 * Math.sin(a * 2.5 + seed) + 
      0.05 * Math.cos(a * 4 + seed * 1.3) +
      0.03 * Math.sin(a * 6 + seed * 0.7);
    pts.push({
      x: cx + (w / 2) * wobble * Math.cos(a),
      y: cy + (h / 2) * wobble * Math.sin(a),
    });
  }
  return smoothPath([...pts, pts[0]], true);
}

// ─── Water hazard with creek-like shape ───
function creekPath(cx: number, cy: number, w: number, h: number, seed: number, flowDir: 'horizontal' | 'vertical' = 'horizontal'): string {
  const pts: Pt[] = [];
  const n = 20;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    let rx = w / 2, ry = h / 2;
    // Gentle organic shoreline — subtle, clean, professional
    const wobble = 1 + 0.08 * Math.sin(a * 3 + seed) + 0.04 * Math.cos(a * 5 + seed * 0.8);
    if (flowDir === 'horizontal') {
      rx *= 1.2;
      ry *= 0.7;
    } else {
      rx *= 0.7;
      ry *= 1.2;
    }
    pts.push({
      x: cx + rx * wobble * Math.cos(a),
      y: cy + ry * wobble * Math.sin(a),
    });
  }
  return smoothPath([...pts, pts[0]], true);
}

// ─── Custom outline path from normalized points ───
function customOutlinePath(cx: number, cy: number, w: number, h: number, outline: Array<{x: number; y: number}>): string {
  if (outline.length < 3) return '';
  const pts: Pt[] = outline.map(p => ({
    x: cx + p.x * (w / 2),
    y: cy + p.y * (h / 2),
  }));
  return smoothPath([...pts, pts[0]], true);
}

// ─── Hazard shape: custom outline if available, else blob/creek ───
function hazardShapePath(cx: number, cy: number, w: number, h: number, seed: number, type: string, outline?: Array<{x: number; y: number}>): string {
  if (outline && outline.length >= 3) {
    return customOutlinePath(cx, cy, w, h, outline);
  }
  if (type === 'water' || type === 'lateral_water') {
    const flowDir = w > h ? 'horizontal' : 'vertical';
    return creekPath(cx, cy, w, h, seed, flowDir);
  }
  return blobPath(cx, cy, w, h, seed, 10);
}

// ─── Tree cluster as organic dark blob ───
function treeClusterPath(cx: number, cy: number, size: number, seed: number): string {
  const pts: Pt[] = [];
  const n = 10;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    const wobble = 0.7 + 0.4 * Math.sin(a * 2.3 + seed) + 0.2 * Math.cos(a * 3.7 + seed * 1.5);
    pts.push({
      x: cx + size * wobble * Math.cos(a),
      y: cy + size * wobble * Math.sin(a),
    });
  }
  return smoothPath([...pts, pts[0]], true);
}

// ─── Green shape path — PuttView-quality organic shapes ───
function greenShapePath(cx: number, cy: number, w: number, h: number, shape: string, angle: number = 0, outline?: Array<{x: number; y: number}>, scaleFactor: number = 1): string {
  // If custom outline points provided, use them directly
  if (outline && outline.length >= 3) {
    const hw = (w / 2) * scaleFactor, hh = (h / 2) * scaleFactor;
    let pts: Pt[] = outline.map(p => ({
      x: cx + p.x * hw,
      y: cy + p.y * hh,
    }));
    if (angle !== 0) {
      const rad = (angle * Math.PI) / 180;
      const cos = Math.cos(rad), sin = Math.sin(rad);
      pts = pts.map(pt => ({
        x: cx + (pt.x - cx) * cos - (pt.y - cy) * sin,
        y: cy + (pt.x - cx) * sin + (pt.y - cy) * cos,
      }));
    }
    return smoothPath([...pts, pts[0]], true);
  }

  // Enforce minimum aspect ratio so greens never look like skinny ovals
  const minW = Math.max(w * scaleFactor, h * scaleFactor * 0.7);
  const minH = Math.max(h * scaleFactor, w * scaleFactor * 0.6);
  const hw = minW / 2, hh = minH / 2;
  const n = 32; // More points = smoother shape
  let pts: Pt[] = [];
  
  for (let i = 0; i < n; i++) {
    const t = (i / n) * Math.PI * 2;
    let rx: number, ry: number;
    
    // All shapes get subtle organic wobble for natural look
    const wobble = 1 + 0.03 * Math.sin(t * 5.7) + 0.02 * Math.cos(t * 7.3);
    
    switch (shape) {
      case 'kidney':
        // Pronounced concave indent on one side, like a bean
        rx = hw * Math.cos(t);
        ry = hh * Math.sin(t);
        if (t > Math.PI * 0.15 && t < Math.PI * 0.65) {
          const indent = 0.55 + 0.15 * Math.sin((t - Math.PI * 0.15) / (Math.PI * 0.5) * Math.PI);
          rx *= indent;
        }
        // Bulge opposite side slightly
        if (t > Math.PI * 1.2 && t < Math.PI * 1.8) rx *= 1.1;
        break;
      case 'peanut':
        // Two-lobed shape, narrow waist
        rx = hw * (1 + 0.3 * Math.cos(2 * t)) * Math.cos(t);
        ry = hh * (1 - 0.22 * Math.abs(Math.cos(t))) * Math.sin(t);
        break;
      case 'long_narrow':
        // Elongated but still substantial width
        rx = hw * 0.65 * Math.cos(t);
        ry = hh * 1.2 * Math.sin(t);
        break;
      case 'wide_shallow':
        // Wide front-to-back, PuttView-style with gentle curves
        rx = hw * 1.15 * (1 + 0.06 * Math.sin(3 * t)) * Math.cos(t);
        ry = hh * 0.75 * (1 + 0.08 * Math.cos(2 * t)) * Math.sin(t);
        break;
      case 'round':
        // Nearly circular with organic wobble
        const r = (hw + hh) / 2;
        rx = r * (1 + 0.05 * Math.sin(4 * t)) * Math.cos(t);
        ry = r * (1 + 0.04 * Math.cos(3 * t)) * Math.sin(t);
        break;
      case 'horseshoe':
        // U-shaped with open back
        rx = hw * Math.cos(t);
        ry = hh * Math.sin(t);
        if (t > Math.PI * 0.7 && t < Math.PI * 1.3) {
          ry *= 0.35;
          rx *= 1.15;
        }
        break;
      case 'oblong':
        // Irregular elongated shape
        rx = hw * (1 + 0.18 * Math.cos(t) + 0.08 * Math.sin(2 * t)) * Math.cos(t);
        ry = hh * (1 + 0.06 * Math.sin(3 * t)) * Math.sin(t);
        break;
      case 'tiered':
        // Organic irregular shape with subtle lobes — most Augusta greens
        rx = hw * (1 + 0.12 * Math.sin(2 * t) + 0.06 * Math.cos(3 * t)) * Math.cos(t);
        ry = hh * (1 + 0.08 * Math.cos(2 * t) + 0.05 * Math.sin(4 * t)) * Math.sin(t);
        break;
      default: // oval with organic edges
        rx = hw * (1 + 0.06 * Math.sin(3 * t) + 0.04 * Math.cos(5 * t)) * Math.cos(t);
        ry = hh * (1 + 0.05 * Math.cos(2 * t) + 0.03 * Math.sin(4 * t)) * Math.sin(t);
        break;
    }
    pts.push({ x: cx + rx * wobble, y: cy + ry * wobble });
  }
  
  if (angle !== 0) {
    const rad = (angle * Math.PI) / 180;
    const cos = Math.cos(rad), sin = Math.sin(rad);
    pts = pts.map(pt => ({
      x: cx + (pt.x - cx) * cos - (pt.y - cy) * sin,
      y: cy + (pt.x - cx) * sin + (pt.y - cy) * cos,
    }));
  }
  
  return smoothPath([...pts, pts[0]], true);
}

// ─── Build fairway outline from cross-section points ───
function buildFairway(
  fps: FairwayPoint[], yardage: number, scale: number, centerX: number, teeY: number
): { outline: string; center: Pt[]; leftEdge: Pt[]; rightEdge: Pt[] } {
  const left: Pt[] = [], right: Pt[] = [], center: Pt[] = [];
  
  for (const fp of fps) {
    const y = teeY - fp.distance * scale;
    const x = centerX + fp.offset * scale;
    const hw = (fp.width / 2) * scale;
    // Organic edge variation
    const wobbleL = 1.5 * Math.sin(fp.distance * 0.018 + 0.7);
    const wobbleR = 1.2 * Math.sin(fp.distance * 0.022 + 1.9);
    center.push({ x, y });
    left.push({ x: x - hw + wobbleL, y });
    right.push({ x: x + hw - wobbleR, y });
  }
  
  // Closed path: left up → top arc → right down → bottom arc
  let outline = smoothPath(left);
  const tl = left[left.length - 1], tr = right[right.length - 1];
  outline += ` Q${f((tl.x + tr.x) / 2)} ${f(tl.y - 5)} ${p(tr)}`;
  const rr = [...right].reverse();
  for (let i = 1; i < rr.length; i++) {
    const prev = rr[i - 1], cur = rr[i];
    outline += ` Q${f((prev.x + cur.x) / 2)} ${f((prev.y + cur.y) / 2)} ${p(cur)}`;
  }
  const bl = left[0], br = right[0];
  outline += ` Q${f((br.x + bl.x) / 2)} ${f(br.y + 3)} ${p(bl)} Z`;
  
  return { outline, center, leftEdge: left, rightEdge: right };
}

// ─── Tree line as dark organic border ───
function buildTreeMass(
  tl: TreeLine, yardage: number, scale: number, centerX: number, teeY: number, pageEdge: number
): string {
  const inner: Pt[] = tl.points.map(pt => ({
    x: centerX + pt.offset * scale,
    y: teeY - pt.distance * scale,
  }));
  
  // Extend to page edge with organic variation
  const outer: Pt[] = inner.map((pt, i) => ({
    x: tl.side === 'left' 
      ? Math.min(pt.x - 8 - 4 * Math.sin(i * 1.3), PAD_SIDE - 5)
      : Math.max(pt.x + 8 + 4 * Math.sin(i * 1.5), PAGE_W - PAD_SIDE + 5),
    y: pt.y + 2 * Math.sin(i * 2.1),
  }));
  
  let d = smoothPath(inner);
  const topI = inner[inner.length - 1], topO = outer[outer.length - 1];
  d += ` L${p(topO)}`;
  const outerRev = [...outer].reverse();
  for (let i = 1; i < outerRev.length; i++) {
    d += ` L${p(outerRev[i])}`;
  }
  d += ' Z';
  return d;
}

// ─── Hazard position calculation ───
function hazardXY(
  h: HoleHazard, yardage: number, scale: number, centerX: number, teeY: number, greenY: number
): Pt {
  let y = greenY;
  if (h.distance_from_tee) y = teeY - h.distance_from_tee * scale;
  else if (h.distance_from_green !== undefined) y = greenY + h.distance_from_green * scale;
  else {
    const loc = h.location || '';
    if (loc.includes('front')) y = greenY + 12 * scale;
    else if (loc.includes('back')) y = greenY - 10 * scale;
  }
  
  let x = centerX;
  if (h.lateral_offset !== undefined) {
    x = centerX + h.lateral_offset * scale;
  } else {
    const loc = h.location || '';
    if (loc.includes('left')) x -= 30;
    if (loc.includes('right')) x += 30;
  }
  return { x, y };
}

// ═══════════════════════════════════════════════════════════════
// HOLE PAGE — PuttView-style tee-to-green overhead
// ═══════════════════════════════════════════════════════════════
function HolePage({ hole, metadata, distUnit }: {
  hole: HoleInfo; metadata: HoleDetail; distUnit: 'yards' | 'meters';
}) {
  const yardage = hole.yardage || 400;
  const usableH = PAGE_H - PAD_TOP - PAD_BOTTOM;
  const scale = usableH / yardage;
  const centerX = PAGE_W / 2;
  const teeY = PAGE_H - PAD_BOTTOM;
  
  const fps = metadata.fairway_points || generateFairwayPoints(
    yardage, metadata.shape || 'straight', metadata.fairway_width || '30-50 yds', hole.par
  );
  const tls = metadata.tree_lines || generateTreeLines(
    yardage, metadata.shape || 'straight', metadata.fairway_width || '30-50 yds'
  );
  
  const { outline, center, leftEdge, rightEdge } = buildFairway(fps, yardage, scale, centerX, teeY);
  const greenPt = center[center.length - 1];
  const greenW = (metadata.green?.width || 25) * scale;
  const greenD = (metadata.green?.depth || 20) * scale;
  const gShape = metadata.green?.shape || metadata.green_shape || 'oval';
  const gAngle = metadata.green?.angle || 0;
  const gOutline = metadata.green?.outline;
  
  const dv = (yards: number) => distUnit === 'meters' ? yardsToMeters(yards) : yards;
  const unitShort = distUnit === 'meters' ? 'm' : 'y';
  
  // Distance markers every 25 yards (PuttView style - more granular)
  const markers: number[] = [];
  for (let d = 50; d < yardage - 20; d += 25) markers.push(d);
  
  // Major markers (every 50) get emphasized
  const majorMarkers = markers.filter(d => d % 50 === 0);
  
  // Elevation contour lines (dashed, subtle)
  const contourLines: number[] = [];
  if (metadata.elevation_change && metadata.elevation_change !== 'flat') {
    for (let d = 75; d < yardage - 50; d += 60) contourLines.push(d);
  }
  
  return (
    <Svg width={PAGE_W} height={PAGE_H} viewBox={`0 0 ${PAGE_W} ${PAGE_H}`}>
      <Defs>
        {/* Subtle paper texture pattern */}
        <Pattern id="paperTexture" width="4" height="4" patternUnits="userSpaceOnUse">
          <Rect width="4" height="4" fill={C.pageBg} />
          <Circle cx="2" cy="2" r="0.3" fill="rgba(0,0,0,0.02)" />
        </Pattern>
      </Defs>
      
      {/* Page background */}
      <Rect x={0} y={0} width={PAGE_W} height={PAGE_H} fill={C.pageBg} />
      
      {/* Tree mass borders - dark organic blobs along edges */}
      {tls.map((tl, i) => (
        <Path key={`tree${i}`} 
          d={buildTreeMass(tl, yardage, scale, centerX, teeY, tl.side === 'left' ? PAD_SIDE : PAGE_W - PAD_SIDE)}
          fill={C.treeLine} opacity={0.85} />
      ))}
      
      {/* Scattered tree clusters in rough */}
      {tls.flatMap((tl, tlIdx) => 
        tl.points.filter((_, i) => i % 2 === 0).map((pt, i) => {
          const tx = centerX + pt.offset * scale + (tl.side === 'left' ? -12 : 12);
          const ty = teeY - pt.distance * scale;
          return (
            <Path key={`tc${tlIdx}_${i}`}
              d={treeClusterPath(tx, ty, 6 + 3 * Math.sin(i * 2.3), i * 3.7 + tlIdx)}
              fill={C.treeCluster} opacity={0.7} />
          );
        })
      )}
      
      {/* Elevation contour lines (dashed) */}
      {contourLines.map((d, i) => {
        const cy = teeY - d * scale;
        // Curve slightly to show terrain
        const curve = 8 * Math.sin((i + 1) * 0.8);
        return (
          <Path key={`contour${i}`}
            d={`M${PAD_SIDE + 15} ${f(cy)} Q${f(centerX)} ${f(cy + curve)} ${PAGE_W - PAD_SIDE - 15} ${f(cy)}`}
            stroke={C.contourLine} strokeWidth={0.8} strokeDasharray="4,4" fill="none" />
        );
      })}
      
      {/* Fairway */}
      <Path d={outline} fill={C.fairway} stroke={C.fairwayStroke} strokeWidth={1} />
      
      {/* Water hazards - drawn with organic creek shapes */}
      {metadata.hazards
        .filter(h => h.type === 'water' || h.type === 'lateral_water')
        .map((h, i) => {
          const pos = hazardXY(h, yardage, scale, centerX, teeY, greenPt.y);
          const hw = Math.max((h.width || 25) * scale, 12);
          const hh = Math.max((h.length || 15) * scale, 8);
          return (
            <G key={`water${i}`}>
              <Path d={hazardShapePath(pos.x, pos.y, hw, hh, i * 2.7, h.type, h.outline)}
                fill={C.waterFill} stroke={C.waterStroke} strokeWidth={0.8} />
            </G>
          );
        })}
      
      {/* Fairway bunkers */}
      {metadata.hazards
        .filter(h => h.type === 'fairway_bunker')
        .map((h, i) => {
          const pos = hazardXY(h, yardage, scale, centerX, teeY, greenPt.y);
          const bw = Math.max((h.width || 12) * scale, 8);
          const bh = Math.max((h.length || 18) * scale, 6);
          return (
            <Path key={`fb${i}`} d={hazardShapePath(pos.x, pos.y, bw, bh, i * 1.9, h.type, h.outline)}
              fill={C.bunker} stroke={C.bunkerStroke} strokeWidth={0.8} />
          );
        })}
      
      {/* Waste areas */}
      {metadata.hazards
        .filter(h => h.type === 'waste_area')
        .map((h, i) => {
          const pos = hazardXY(h, yardage, scale, centerX, teeY, greenPt.y);
          const bw = Math.max((h.width || 20) * scale, 10);
          const bh = Math.max((h.length || 30) * scale, 8);
          return (
            <Path key={`wa${i}`} d={hazardShapePath(pos.x, pos.y, bw, bh, i * 2.5, h.type, h.outline)}
              fill={C.bunker} opacity={0.75} stroke={C.bunkerStroke} strokeWidth={0.5} strokeDasharray="2,2" />
          );
        })}
      
      {/* Greenside bunkers BEHIND green (back bunkers only) */}
      {metadata.hazards
        .filter(h => h.type === 'greenside_bunker' && (h.location || '').includes('back'))
        .map((h, i) => {
          const pos = hazardXY(h, yardage, scale, centerX, teeY, greenPt.y);
          const bw = Math.max((h.width || 10) * scale, 7);
          const bh = Math.max((h.length || 12) * scale, 6);
          return (
            <Path key={`gbb${i}`} d={hazardShapePath(pos.x, pos.y, bw, bh, i * 1.7 + 5, h.type, h.outline)}
              fill={C.bunker} stroke={C.bunkerStroke} strokeWidth={0.8} />
          );
        })}
      
      {/* Landing zone indicator for par 4/5 */}
      {hole.par >= 4 && (() => {
        const lzDist = metadata.landing_zone_distance || (hole.par === 5 ? yardage * 0.45 : yardage * 0.55);
        const lzY = teeY - lzDist * scale;
        // Find fairway width at landing zone
        const lzPoint = fps.reduce((closest, fp) => 
          Math.abs(fp.distance - lzDist) < Math.abs(closest.distance - lzDist) ? fp : closest
        );
        const lzX = centerX + (lzPoint?.offset || 0) * scale;
        return (
          <G opacity={0.4}>
            <Ellipse cx={lzX} cy={lzY} rx={18} ry={10}
              fill="none" stroke={C.distLine} strokeWidth={1.2} strokeDasharray="5,3" />
            <SvgText x={lzX} y={lzY + 3} fontSize={6} fill={C.distText} textAnchor="middle" fontWeight="600">
              LZ
            </SvgText>
          </G>
        );
      })()}
      
      {/* Distance markers - PuttView style with circles and numbers on both sides */}
      {markers.map(d => {
        const my = teeY - d * scale;
        const isMajor = d % 50 === 0;
        // Find fairway edges at this distance
        const nearestFP = fps.reduce((closest, fp) => 
          Math.abs(fp.distance - d) < Math.abs(closest.distance - d) ? fp : closest
        );
        const fwCenter = centerX + (nearestFP?.offset || 0) * scale;
        const fwHalfW = ((nearestFP?.width || 40) / 2) * scale;
        
        return (
          <G key={`m${d}`}>
            {/* Small marker ticks on fairway edges */}
            <Line x1={fwCenter - fwHalfW - 3} y1={my} x2={fwCenter - fwHalfW + 2} y2={my}
              stroke={C.distLine} strokeWidth={isMajor ? 0.8 : 0.5} />
            <Line x1={fwCenter + fwHalfW - 2} y1={my} x2={fwCenter + fwHalfW + 3} y2={my}
              stroke={C.distLine} strokeWidth={isMajor ? 0.8 : 0.5} />
            
            {/* Yardage numbers in margins */}
            {isMajor && (
              <>
                <Circle cx={PAD_SIDE - 6} cy={my} r={8} fill={C.pageBg} stroke={C.yardageMark} strokeWidth={0.6} />
                <SvgText x={PAD_SIDE - 6} y={my + 3} fontSize={7} fill={C.distText} textAnchor="middle" fontWeight="600">
                  {dv(d)}
                </SvgText>
                <Circle cx={PAGE_W - PAD_SIDE + 6} cy={my} r={8} fill={C.pageBg} stroke={C.yardageMark} strokeWidth={0.6} />
                <SvgText x={PAGE_W - PAD_SIDE + 6} y={my + 3} fontSize={7} fill={C.distText} textAnchor="middle" fontWeight="600">
                  {dv(d)}
                </SvgText>
              </>
            )}
          </G>
        );
      })}
      
      {/* Green - fringe then putting surface */}
      <Path d={greenShapePath(greenPt.x, greenPt.y, greenW * 1.22, greenD * 1.22, gShape, gAngle, gOutline, 1.22)}
        fill={C.greenFringe} />
      <Path d={greenShapePath(greenPt.x, greenPt.y, greenW, greenD, gShape, gAngle, gOutline)}
        fill={C.green} />
      
      {/* Green contour lines */}
      {[0.35, 0.65].map((t, i) => (
        <Path key={`gc${i}`}
          d={greenShapePath(greenPt.x, greenPt.y, greenW * (1 - t * 0.4), greenD * (1 - t * 0.35), gShape, gAngle, gOutline, (1 - t * 0.4))}
          fill="none" stroke={C.greenContour} strokeWidth={0.6} />
      ))}
      
      {/* Greenside bunkers IN FRONT of green (front and side bunkers) */}
      {metadata.hazards
        .filter(h => h.type === 'greenside_bunker' && !(h.location || '').includes('back'))
        .map((h, i) => {
          const pos = hazardXY(h, yardage, scale, centerX, teeY, greenPt.y);
          const bw = Math.max((h.width || 10) * scale, 7);
          const bh = Math.max((h.length || 12) * scale, 6);
          return (
            <Path key={`gbf${i}`} d={hazardShapePath(pos.x, pos.y, bw, bh, i * 1.7 + 5, h.type, h.outline)}
              fill={C.bunker} stroke={C.bunkerStroke} strokeWidth={0.8} />
          );
        })}
      
      {/* Flag pin */}
      <Line x1={greenPt.x} y1={greenPt.y + 3} x2={greenPt.x} y2={greenPt.y - 14}
        stroke="#333" strokeWidth={1} />
      <Path d={`M${f(greenPt.x)} ${f(greenPt.y - 14)} l7 3 -7 3`} fill={C.flagRed} />
      
      {/* Tee box - rectangular with alignment aids */}
      <Rect x={centerX - 10} y={teeY - 4} width={20} height={8} rx={2}
        fill={C.teeBox} stroke="rgba(0,0,0,0.2)" strokeWidth={0.5} />
      {/* Tee markers */}
      <Circle cx={centerX - 5} cy={teeY} r={1.5} fill="#fff" />
      <Circle cx={centerX + 5} cy={teeY} r={1.5} fill="#fff" />
      
      {/* OB markers */}
      {metadata.hazards
        .filter(h => h.type === 'ob')
        .map((h, i) => {
          const pos = hazardXY(h, yardage, scale, centerX, teeY, greenPt.y);
          return (
            <G key={`ob${i}`}>
              {[-15, -5, 5, 15].map((dx, j) => (
                <Circle key={j} cx={pos.x + dx} cy={pos.y} r={2} fill={C.ob} />
              ))}
            </G>
          );
        })}
      
      {/* Forced carry indicator */}
      {metadata.hazards
        .filter(h => h.type === 'forced_carry')
        .map((h, i) => {
          if (!h.carry_distance) return null;
          const carryY = teeY - h.carry_distance * scale;
          return (
            <G key={`fc${i}`}>
              <Line x1={centerX - 15} y1={carryY} x2={centerX + 15} y2={carryY}
                stroke={C.waterStroke} strokeWidth={1} strokeDasharray="3,2" />
              <SvgText x={centerX} y={carryY + 12} fontSize={6} fill={C.distText} textAnchor="middle">
                {dv(h.carry_distance)}{unitShort} CARRY
              </SvgText>
            </G>
          );
        })}
      
      {/* Header - hole number and info */}
      <Rect x={PAGE_W / 2 - 20} y={4} width={40} height={18} rx={3} fill={C.teeBox} />
      <SvgText x={PAGE_W / 2} y={17} fontSize={12} fill="#fff" textAnchor="middle" fontWeight="800">
        {hole.hole_number}
      </SvgText>
      <SvgText x={PAGE_W / 2} y={34} fontSize={9} fill={C.text} textAnchor="middle" fontWeight="700">
        PAR {hole.par}  •  {dv(yardage)} {unitShort.toUpperCase()}
      </SvgText>
      
      {/* Hole name if available */}
      {metadata.notes && metadata.notes.includes('.') && (
        <SvgText x={PAGE_W / 2} y={PAGE_H - 28} fontSize={7} fill={C.textLight} textAnchor="middle" fontStyle="italic">
          {metadata.notes.split('.')[0]}
        </SvgText>
      )}
      
      {/* Handicap */}
      {hole.handicap_index != null && (
        <SvgText x={PAGE_W - PAD_SIDE} y={17} fontSize={8} fill={C.textLight} textAnchor="end">
          HCP {hole.handicap_index}
        </SvgText>
      )}
    </Svg>
  );
}

// ═══════════════════════════════════════════════════════════════
// GREEN PAGE — detailed green with PuttView contours
// ═══════════════════════════════════════════════════════════════
function GreenPage({ hole, metadata, distUnit }: {
  hole: HoleInfo; metadata: HoleDetail; distUnit: 'yards' | 'meters';
}) {
  const gcx = PAGE_W / 2;
  const gcy = PAGE_H / 2 - 15;
  const greenW = (metadata.green?.width || 25);
  const greenD = (metadata.green?.depth || 20);
  const gShape = metadata.green?.shape || metadata.green_shape || 'oval';
  const gAngle = metadata.green?.angle || 0;
  
  const gOutline = metadata.green?.outline;
  // Scale green to fill ~55% of page width
  const targetW = PAGE_W * 0.55;
  const gScale = targetW / greenW;
  const scaledW = greenW * gScale;
  const scaledD = greenD * gScale;
  
  const dv = (yards: number) => distUnit === 'meters' ? yardsToMeters(yards) : yards;
  const unitShort = distUnit === 'meters' ? 'm' : 'y';
  
  // Slope direction arrow
  const slopeDir = metadata.green?.slope_direction;
  const slopeArrow = (() => {
    if (!slopeDir) return null;
    const len = 35;
    let dx = 0, dy = 0;
    if (slopeDir.includes('front')) dy = len;
    if (slopeDir.includes('back')) dy = -len;
    if (slopeDir.includes('left')) dx = -len;
    if (slopeDir.includes('right')) dx = len;
    if (dx === 0 && dy === 0) dy = len;
    return { dx, dy };
  })();
  
  return (
    <Svg width={PAGE_W} height={PAGE_H} viewBox={`0 0 ${PAGE_W} ${PAGE_H}`}>
      {/* Page background */}
      <Rect x={0} y={0} width={PAGE_W} height={PAGE_H} fill={C.pageBg} />
      
      {/* Approach fairway strip */}
      <Path d={`M${gcx - 22} ${PAGE_H - PAD_BOTTOM - 5} 
        Q${gcx - 28} ${gcy + scaledD / 2 + 50} ${gcx - 18} ${gcy + scaledD / 2 + 25}
        Q${gcx} ${gcy + scaledD / 2 + 18} ${gcx + 18} ${gcy + scaledD / 2 + 25}
        Q${gcx + 28} ${gcy + scaledD / 2 + 50} ${gcx + 22} ${PAGE_H - PAD_BOTTOM - 5} Z`}
        fill={C.fairway} stroke={C.fairwayStroke} strokeWidth={0.6} />
      
      {/* Greenside bunkers (behind green surface) */}
      {metadata.hazards
        .filter(h => h.type === 'greenside_bunker')
        .map((h, i) => {
          let ox = 0, oy = 0;
          const loc = h.location || '';
          if (loc.includes('left')) ox = -(scaledW / 2 + 18);
          if (loc.includes('right')) ox = scaledW / 2 + 18;
          if (loc.includes('front')) oy = scaledD / 2 + 14;
          if (loc.includes('back')) oy = -(scaledD / 2 + 14);
          if (!loc.includes('front') && !loc.includes('back') && (loc === 'left' || loc === 'right')) {
            oy = 0;
          }
          const bw = (h.width || 12) * gScale * 0.8;
          const bh = (h.length || 10) * gScale * 0.8;
          return (
            <Path key={`gb${i}`} d={blobPath(gcx + ox, gcy + oy, Math.max(bw, 14), Math.max(bh, 10), i * 2.3, 10)}
              fill={C.bunker} stroke={C.bunkerStroke} strokeWidth={0.9} />
          );
        })}
      
      {/* Water near green */}
      {metadata.hazards
        .filter(h => (h.type === 'water' || h.type === 'lateral_water') && (
          h.distance_from_green !== undefined ? Math.abs(h.distance_from_green) < 35 : 
          h.location?.includes('front') || h.location?.includes('back') || h.location?.includes('left') || h.location?.includes('right')
        ))
        .map((h, i) => {
          let ox = 0, oy = 0;
          const loc = h.location || '';
          if (loc.includes('left')) ox = -(scaledW / 2 + 25);
          if (loc.includes('right')) ox = scaledW / 2 + 25;
          if (loc.includes('front')) oy = scaledD / 2 + 22;
          if (loc.includes('back')) oy = -(scaledD / 2 + 22);
          const bw = (h.width || 25) * gScale * 0.7;
          const bh = (h.length || 18) * gScale * 0.7;
          return (
            <Path key={`gw${i}`} d={creekPath(gcx + ox, gcy + oy, Math.max(bw, 22), Math.max(bh, 16), i * 3.1, bw > bh ? 'horizontal' : 'vertical')}
              fill={C.waterFill} stroke={C.waterStroke} strokeWidth={0.7} />
          );
        })}
      
      {/* Fringe/collar */}
      <Path d={greenShapePath(gcx, gcy, scaledW * 1.18, scaledD * 1.18, gShape, gAngle, gOutline, 1.18)}
        fill={C.greenFringe} />
      
      {/* Green putting surface */}
      <Path d={greenShapePath(gcx, gcy, scaledW, scaledD, gShape, gAngle, gOutline)}
        fill={C.green} />
      
      {/* PuttView-style contour lines on green */}
      {[0.25, 0.5, 0.75].map((t, i) => {
        const innerScale = 1 - t * 0.35;
        // Offset contours slightly based on slope
        let offsetX = 0, offsetY = 0;
        if (slopeDir) {
          if (slopeDir.includes('left')) offsetX = -3 * t;
          if (slopeDir.includes('right')) offsetX = 3 * t;
          if (slopeDir.includes('front')) offsetY = 4 * t;
          if (slopeDir.includes('back')) offsetY = -4 * t;
        }
        return (
          <Path key={`contour${i}`}
            d={greenShapePath(gcx + offsetX, gcy + offsetY, scaledW * innerScale, scaledD * innerScale, gShape, gAngle, gOutline, innerScale)}
            fill="none" stroke={C.greenContour} strokeWidth={0.7} strokeDasharray="3,3" />
        );
      })}
      
      {/* Tier line for tiered greens */}
      {gShape === 'tiered' && (
        <Path
          d={`M${f(gcx - scaledW * 0.38)} ${f(gcy - 3)} 
            Q${f(gcx)} ${f(gcy - scaledD * 0.12)} ${f(gcx + scaledW * 0.38)} ${f(gcy - 3)}`}
          stroke="rgba(40,80,30,0.35)" strokeWidth={2} fill="none" />
      )}
      
      {/* Slope direction arrow */}
      {slopeArrow && (
        <G opacity={0.4}>
          <Line x1={gcx - slopeArrow.dx * 0.25} y1={gcy - slopeArrow.dy * 0.25}
            x2={gcx + slopeArrow.dx * 0.6} y2={gcy + slopeArrow.dy * 0.6}
            stroke={C.text} strokeWidth={1.8} />
          {/* Arrowhead */}
          <Path d={`M${f(gcx + slopeArrow.dx * 0.6)} ${f(gcy + slopeArrow.dy * 0.6)} 
            l${f(-slopeArrow.dx * 0.12 + slopeArrow.dy * 0.08)} ${f(-slopeArrow.dy * 0.12 - slopeArrow.dx * 0.08)} 
            M${f(gcx + slopeArrow.dx * 0.6)} ${f(gcy + slopeArrow.dy * 0.6)} 
            l${f(-slopeArrow.dx * 0.12 - slopeArrow.dy * 0.08)} ${f(-slopeArrow.dy * 0.12 + slopeArrow.dx * 0.08)}`}
            stroke={C.text} strokeWidth={1.8} fill="none" />
        </G>
      )}
      
      {/* Flag pin (center of green) */}
      <Circle cx={gcx} cy={gcy} r={3} fill={C.flagRed} />
      <Circle cx={gcx} cy={gcy} r={1.5} fill="#fff" />
      
      {/* Dimension labels - width */}
      <Line x1={gcx - scaledW / 2} y1={gcy + scaledD / 2 + 28}
        x2={gcx + scaledW / 2} y2={gcy + scaledD / 2 + 28}
        stroke={C.distLine} strokeWidth={0.6} />
      <Line x1={gcx - scaledW / 2} y1={gcy + scaledD / 2 + 24}
        x2={gcx - scaledW / 2} y2={gcy + scaledD / 2 + 32}
        stroke={C.distLine} strokeWidth={0.6} />
      <Line x1={gcx + scaledW / 2} y1={gcy + scaledD / 2 + 24}
        x2={gcx + scaledW / 2} y2={gcy + scaledD / 2 + 32}
        stroke={C.distLine} strokeWidth={0.6} />
      <SvgText x={gcx} y={gcy + scaledD / 2 + 42} fontSize={9} fill={C.distText} textAnchor="middle" fontWeight="600">
        {dv(greenW)} {unitShort}
      </SvgText>
      
      {/* Depth */}
      <Line x1={gcx + scaledW / 2 + 28} y1={gcy - scaledD / 2}
        x2={gcx + scaledW / 2 + 28} y2={gcy + scaledD / 2}
        stroke={C.distLine} strokeWidth={0.6} />
      <Line x1={gcx + scaledW / 2 + 24} y1={gcy - scaledD / 2}
        x2={gcx + scaledW / 2 + 32} y2={gcy - scaledD / 2}
        stroke={C.distLine} strokeWidth={0.6} />
      <Line x1={gcx + scaledW / 2 + 24} y1={gcy + scaledD / 2}
        x2={gcx + scaledW / 2 + 32} y2={gcy + scaledD / 2}
        stroke={C.distLine} strokeWidth={0.6} />
      <SvgText x={gcx + scaledW / 2 + 40} y={gcy + 3} fontSize={9} fill={C.distText} textAnchor="start" fontWeight="600"
        transform={`rotate(90, ${gcx + scaledW / 2 + 40}, ${gcy})`}>
        {dv(greenD)} {unitShort}
      </SvgText>
      
      {/* Distance rings from pin - PuttView style */}
      {[10, 20, 30].map((d, i) => {
        const r = d * gScale * 0.9;
        if (r > Math.max(scaledW, scaledD) * 0.7) return null;
        return (
          <G key={`ring${i}`} opacity={0.25}>
            <Circle cx={gcx} cy={gcy} r={r} fill="none" stroke={C.distLine} strokeWidth={0.5} strokeDasharray="2,3" />
          </G>
        );
      })}
      
      {/* Approach label */}
      <SvgText x={gcx} y={PAGE_H - PAD_BOTTOM - 14} fontSize={8} fill={C.distText} textAnchor="middle" fontWeight="600">
        APPROACH
      </SvgText>
      
      {/* Header */}
      <Rect x={PAGE_W / 2 - 22} y={6} width={44} height={20} rx={3} fill={C.teeBox} />
      <SvgText x={PAGE_W / 2} y={20} fontSize={11} fill="#fff" textAnchor="middle" fontWeight="800">
        #{hole.hole_number} GREEN
      </SvgText>
      <SvgText x={PAGE_W / 2} y={36} fontSize={9} fill={C.text} textAnchor="middle" fontWeight="600">
        {gShape.replace(/_/g, ' ').toUpperCase()}
        {slopeDir ? ` • ${slopeDir.replace(/_/g, ' ').toUpperCase()}` : ''}
      </SvgText>
    </Svg>
  );
}

// ═══════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════
export default function HoleDrawing({ hole, metadata, page }: Props) {
  const { unit: distanceUnit } = useDistanceUnit();
  
  return (
    <View style={styles.page}>
      {page === 'hole' ? (
        <HolePage hole={hole} metadata={metadata} distUnit={distanceUnit} />
      ) : (
        <GreenPage hole={hole} metadata={metadata} distUnit={distanceUnit} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  page: {
    backgroundColor: C.pageBg,
    borderRadius: 6,
    overflow: 'hidden',
    aspectRatio: PAGE_W / PAGE_H,
    width: '100%',
    maxWidth: PAGE_W,
    alignSelf: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.18,
    shadowRadius: 10,
    elevation: 5,
  },
});
