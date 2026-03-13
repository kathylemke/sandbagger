import { View, Text, TouchableOpacity, StyleSheet, TextInput, Platform } from 'react-native';
import Svg, { Path, Circle, Rect, Ellipse, G, Text as SvgText, Defs, LinearGradient, Stop, Line } from 'react-native-svg';
import { colors } from '../lib/theme';
import { HoleDetail, HoleHazard } from '../lib/holeMetadata';

interface HoleInfo {
  hole_number: number;
  par: number;
  yardage: number;
  handicap_index?: number;
}

interface Props {
  hole: HoleInfo;
  metadata: HoleDetail;
  showGreenView: boolean;
  onToggleView: () => void;
  distanceOverrides?: { [key: string]: number };
  onDistanceChange?: (key: string, value: number) => void;
  editable?: boolean;
}

// Scale: 1 yard = 0.8 pixels for fairway view
const SCALE = 0.8;
const WIDTH = 320;
const HEIGHT = 450;
const GREEN_WIDTH = 280;
const GREEN_HEIGHT = 350;

// Helper to draw hole shape based on metadata
const getHolePathData = (yardage: number, shape: string): string => {
  const length = Math.min(yardage * SCALE, HEIGHT - 80);
  const startY = HEIGHT - 40;
  const endY = startY - length;
  
  switch (shape) {
    case 'dogleg_left':
      const turnPointL = startY - length * 0.6;
      return `M${WIDTH/2} ${startY} L${WIDTH/2} ${turnPointL} Q${WIDTH/2 - 40} ${turnPointL - 20} ${WIDTH/2 - 30} ${endY}`;
    case 'dogleg_right':
      const turnPointR = startY - length * 0.6;
      return `M${WIDTH/2} ${startY} L${WIDTH/2} ${turnPointR} Q${WIDTH/2 + 40} ${turnPointR - 20} ${WIDTH/2 + 30} ${endY}`;
    case 'double_dogleg':
      const t1 = startY - length * 0.35;
      const t2 = startY - length * 0.7;
      return `M${WIDTH/2} ${startY} Q${WIDTH/2 + 30} ${t1} ${WIDTH/2} ${t1 - 20} Q${WIDTH/2 - 30} ${t2} ${WIDTH/2} ${endY}`;
    default: // straight
      return `M${WIDTH/2} ${startY} L${WIDTH/2} ${endY}`;
  }
};

// Get fairway width
const getFairwayWidth = (widthStr: string): number => {
  switch (widthStr) {
    case '<30 yds': return 24;
    case '30-50 yds': return 40;
    case '>50 yds': return 56;
    default: return 40;
  }
};

// Hazard positioning
const getHazardPosition = (hazard: HoleHazard, holeLength: number, shape: string) => {
  const length = Math.min(holeLength * SCALE, HEIGHT - 80);
  const startY = HEIGHT - 40;
  
  let baseX = WIDTH / 2;
  let baseY = startY;
  
  // Distance from tee
  if (hazard.distance_from_tee) {
    baseY = startY - (hazard.distance_from_tee * SCALE);
  }
  // Distance from green
  if (hazard.distance_from_green) {
    const greenY = startY - length;
    baseY = greenY + (hazard.distance_from_green * SCALE);
  }
  
  // Location offset
  switch (hazard.location) {
    case 'left':
      baseX -= 50;
      break;
    case 'right':
      baseX += 50;
      break;
    case 'front_left':
      baseY += 15;
      baseX -= 35;
      break;
    case 'front_right':
      baseY += 15;
      baseX += 35;
      break;
    case 'back_left':
      baseY -= 15;
      baseX -= 35;
      break;
    case 'back_right':
      baseY -= 15;
      baseX += 35;
      break;
    case 'front':
      baseY += 20;
      break;
    case 'back':
      baseY -= 20;
      break;
  }
  
  return { x: baseX, y: baseY };
};

// Render hazard icon
const renderHazard = (hazard: HoleHazard, idx: number, holeLength: number, shape: string) => {
  const pos = getHazardPosition(hazard, holeLength, shape);
  
  switch (hazard.type) {
    case 'water':
    case 'lateral_water':
      return (
        <G key={idx}>
          <Ellipse cx={pos.x} cy={pos.y} rx={15} ry={8} fill="#3b82f6" opacity={0.7} />
        </G>
      );
    case 'fairway_bunker':
    case 'greenside_bunker':
      return (
        <G key={idx}>
          <Ellipse cx={pos.x} cy={pos.y} rx={12} ry={7} fill="#fde68a" stroke="#d97706" strokeWidth={1} />
        </G>
      );
    case 'trees':
      return (
        <G key={idx}>
          <Circle cx={pos.x - 6} cy={pos.y} r={6} fill="#166534" opacity={0.8} />
          <Circle cx={pos.x + 6} cy={pos.y} r={6} fill="#166534" opacity={0.8} />
          <Circle cx={pos.x} cy={pos.y - 5} r={6} fill="#15803d" opacity={0.9} />
        </G>
      );
    case 'ob':
      return (
        <G key={idx}>
          <Line x1={pos.x - 8} y1={pos.y - 8} x2={pos.x + 8} y2={pos.y + 8} stroke="#dc2626" strokeWidth={2} />
          <Line x1={pos.x + 8} y1={pos.y - 8} x2={pos.x - 8} y2={pos.y + 8} stroke="#dc2626" strokeWidth={2} />
        </G>
      );
    case 'forced_carry':
      return (
        <G key={idx}>
          <Rect x={pos.x - 20} y={pos.y - 3} width={40} height={6} fill="#60a5fa" opacity={0.6} />
          {hazard.carry_distance && (
            <SvgText x={pos.x} y={pos.y + 12} fontSize={8} fill="#1d4ed8" textAnchor="middle">{hazard.carry_distance}y carry</SvgText>
          )}
        </G>
      );
    default:
      return null;
  }
};

// Render green shape
const renderGreenShape = (greenShape: string, cx: number, cy: number, forGreenView = false) => {
  const scale = forGreenView ? 2.5 : 1;
  
  switch (greenShape) {
    case 'tiered':
      return (
        <G>
          <Ellipse cx={cx} cy={cy} rx={22 * scale} ry={16 * scale} fill="#22c55e" />
          <Ellipse cx={cx} cy={cy - 4 * scale} rx={16 * scale} ry={10 * scale} fill="#16a34a" />
        </G>
      );
    case 'kidney':
      return (
        <Path
          d={`M${cx - 20 * scale} ${cy} Q${cx - 25 * scale} ${cy - 15 * scale} ${cx} ${cy - 12 * scale} Q${cx + 25 * scale} ${cy - 15 * scale} ${cx + 20 * scale} ${cy} Q${cx + 15 * scale} ${cy + 15 * scale} ${cx} ${cy + 10 * scale} Q${cx - 15 * scale} ${cy + 15 * scale} ${cx - 20 * scale} ${cy}`}
          fill="#22c55e"
        />
      );
    case 'long_narrow':
      return <Ellipse cx={cx} cy={cy} rx={12 * scale} ry={22 * scale} fill="#22c55e" />;
    case 'wide_shallow':
      return <Ellipse cx={cx} cy={cy} rx={28 * scale} ry={12 * scale} fill="#22c55e" />;
    case 'round':
      return <Circle cx={cx} cy={cy} r={16 * scale} fill="#22c55e" />;
    default: // oval
      return <Ellipse cx={cx} cy={cy} rx={20 * scale} ry={14 * scale} fill="#22c55e" />;
  }
};

export default function HoleDrawing({ 
  hole, 
  metadata, 
  showGreenView, 
  onToggleView,
  distanceOverrides,
  onDistanceChange,
  editable 
}: Props) {
  const yardage = hole.yardage || 400;
  const length = Math.min(yardage * SCALE, HEIGHT - 80);
  const startY = HEIGHT - 40;
  const greenY = startY - length;
  const fairwayWidth = getFairwayWidth(metadata.fairway_width || '30-50 yds');
  
  // Green view rendering
  if (showGreenView) {
    return (
      <View style={s.container}>
        <View style={s.header}>
          <Text style={s.holeNum}>Hole {hole.hole_number}</Text>
          <Text style={s.holePar}>Par {hole.par}</Text>
          <TouchableOpacity style={s.viewToggle} onPress={onToggleView}>
            <Text style={s.viewToggleText}>← Full Hole</Text>
          </TouchableOpacity>
        </View>
        
        <View style={s.greenViewContainer}>
          <Svg width={GREEN_WIDTH} height={GREEN_HEIGHT} viewBox={`0 0 ${GREEN_WIDTH} ${GREEN_HEIGHT}`}>
            {/* Fringe */}
            <Ellipse cx={GREEN_WIDTH/2} cy={GREEN_HEIGHT/2} rx={100} ry={80} fill="#4ade80" />
            
            {/* Green */}
            {renderGreenShape(metadata.green_shape || 'oval', GREEN_WIDTH/2, GREEN_HEIGHT/2, true)}
            
            {/* Pin positions grid */}
            {[
              { x: -35, y: -30, label: 'BL' },
              { x: 0, y: -35, label: 'BC' },
              { x: 35, y: -30, label: 'BR' },
              { x: -40, y: 0, label: 'ML' },
              { x: 0, y: 0, label: 'C' },
              { x: 40, y: 0, label: 'MR' },
              { x: -35, y: 30, label: 'FL' },
              { x: 0, y: 35, label: 'FC' },
              { x: 35, y: 30, label: 'FR' },
            ].map((pos, i) => (
              <G key={i}>
                <Circle cx={GREEN_WIDTH/2 + pos.x} cy={GREEN_HEIGHT/2 + pos.y} r={12} fill="rgba(255,255,255,0.3)" />
                <SvgText x={GREEN_WIDTH/2 + pos.x} y={GREEN_HEIGHT/2 + pos.y + 4} fontSize={9} fill="#166534" fontWeight="600" textAnchor="middle">{pos.label}</SvgText>
              </G>
            ))}
            
            {/* Greenside bunkers */}
            {metadata.hazards
              .filter(h => h.type === 'greenside_bunker')
              .map((h, i) => {
                const offsetX = h.location?.includes('left') ? -70 : h.location?.includes('right') ? 70 : 0;
                const offsetY = h.location?.includes('front') ? 60 : h.location?.includes('back') ? -60 : 0;
                return (
                  <Ellipse key={i} cx={GREEN_WIDTH/2 + offsetX} cy={GREEN_HEIGHT/2 + offsetY} rx={20} ry={12} fill="#fde68a" stroke="#d97706" strokeWidth={1.5} />
                );
              })}
            
            {/* Dimensions */}
            <SvgText x={GREEN_WIDTH/2} y={GREEN_HEIGHT - 20} fontSize={12} fill={colors.primary} fontWeight="700" textAnchor="middle">
              Green Depth: ~{metadata.green_shape === 'long_narrow' ? '35' : metadata.green_shape === 'wide_shallow' ? '20' : '28'} yds
            </SvgText>
            <SvgText x={GREEN_WIDTH/2} y={GREEN_HEIGHT - 5} fontSize={12} fill={colors.primary} fontWeight="700" textAnchor="middle">
              Width: ~{metadata.green_shape === 'wide_shallow' ? '45' : metadata.green_shape === 'long_narrow' ? '20' : '35'} yds
            </SvgText>
          </Svg>
        </View>
        
        <Text style={s.greenLabel}>{metadata.green_shape?.replace(/_/g, ' ') || 'Oval'} Green</Text>
      </View>
    );
  }
  
  // Full hole view
  return (
    <View style={s.container}>
      <View style={s.header}>
        <Text style={s.holeNum}>Hole {hole.hole_number}</Text>
        <View style={s.holeInfo}>
          <Text style={s.holePar}>Par {hole.par}</Text>
          <Text style={s.holeYardage}>{yardage} yds</Text>
          {hole.handicap_index && <Text style={s.holeHcp}>Hcp {hole.handicap_index}</Text>}
        </View>
        <TouchableOpacity style={s.viewToggle} onPress={onToggleView}>
          <Text style={s.viewToggleText}>Green View →</Text>
        </TouchableOpacity>
      </View>
      
      <View style={s.svgContainer}>
        <Svg width={WIDTH} height={HEIGHT} viewBox={`0 0 ${WIDTH} ${HEIGHT}`}>
          <Defs>
            <LinearGradient id="fairwayGrad" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0%" stopColor="#86efac" />
              <Stop offset="100%" stopColor="#4ade80" />
            </LinearGradient>
            <LinearGradient id="roughGrad" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0%" stopColor="#22c55e" />
              <Stop offset="100%" stopColor="#166534" />
            </LinearGradient>
          </Defs>
          
          {/* Rough background */}
          <Rect x={0} y={0} width={WIDTH} height={HEIGHT} fill="url(#roughGrad)" opacity={0.4} />
          
          {/* Fairway */}
          <Path
            d={`M${WIDTH/2 - fairwayWidth} ${startY} L${WIDTH/2 - fairwayWidth} ${greenY + 30} L${WIDTH/2 + fairwayWidth} ${greenY + 30} L${WIDTH/2 + fairwayWidth} ${startY} Z`}
            fill="url(#fairwayGrad)"
          />
          
          {/* Center line (hole shape) */}
          <Path
            d={getHolePathData(yardage, metadata.shape || 'straight')}
            stroke="rgba(255,255,255,0.5)"
            strokeWidth={1}
            strokeDasharray="5,5"
            fill="none"
          />
          
          {/* Tee box */}
          <Rect x={WIDTH/2 - 20} y={startY - 8} width={40} height={16} rx={4} fill={colors.primary} />
          <SvgText x={WIDTH/2} y={startY + 20} fontSize={10} fill={colors.grayDark} textAnchor="middle">TEE</SvgText>
          
          {/* Distance markers */}
          {[100, 150, 200].filter(d => d < yardage).map(dist => {
            const markerY = startY - (dist * SCALE);
            return (
              <G key={dist}>
                <Line x1={WIDTH/2 - fairwayWidth - 15} y1={markerY} x2={WIDTH/2 - fairwayWidth - 5} y2={markerY} stroke={colors.grayDark} strokeWidth={1} />
                <SvgText x={WIDTH/2 - fairwayWidth - 20} y={markerY + 4} fontSize={9} fill={colors.grayDark} textAnchor="end">{dist}</SvgText>
              </G>
            );
          })}
          
          {/* Hazards */}
          {metadata.hazards.map((hazard, idx) => renderHazard(hazard, idx, yardage, metadata.shape || 'straight'))}
          
          {/* Green */}
          {renderGreenShape(metadata.green_shape || 'oval', WIDTH/2, greenY + 10, false)}
          
          {/* Flag */}
          <Line x1={WIDTH/2} y1={greenY + 10} x2={WIDTH/2} y2={greenY - 10} stroke="#dc2626" strokeWidth={1.5} />
          <Path d={`M${WIDTH/2} ${greenY - 10} L${WIDTH/2 + 10} ${greenY - 5} L${WIDTH/2} ${greenY}`} fill="#dc2626" />
          
          {/* Distance to front of green */}
          <SvgText x={WIDTH/2} y={greenY + 35} fontSize={11} fill={colors.white} fontWeight="700" textAnchor="middle">
            {yardage} to front
          </SvgText>
        </Svg>
      </View>
      
      {/* Hole notes */}
      {metadata.notes && (
        <View style={s.notes}>
          <Text style={s.notesText}>📝 {metadata.notes}</Text>
        </View>
      )}
      
      {/* Editable distances */}
      {editable && onDistanceChange && (
        <View style={s.editSection}>
          <Text style={s.editLabel}>Custom Distances</Text>
          <View style={s.editRow}>
            <Text style={s.editFieldLabel}>To front:</Text>
            <TextInput
              style={s.editInput}
              value={distanceOverrides?.front?.toString() || yardage.toString()}
              onChangeText={v => onDistanceChange('front', parseInt(v) || 0)}
              keyboardType="number-pad"
            />
            <Text style={s.editUnit}>yds</Text>
          </View>
        </View>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  container: { backgroundColor: colors.white, borderRadius: 16, overflow: 'hidden', marginBottom: 16 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 12, backgroundColor: colors.primary },
  holeNum: { fontSize: 18, fontWeight: '800', color: colors.gold },
  holeInfo: { flexDirection: 'row', gap: 12, alignItems: 'center' },
  holePar: { fontSize: 14, fontWeight: '700', color: colors.white, backgroundColor: colors.gold, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  holeYardage: { fontSize: 14, fontWeight: '600', color: colors.white },
  holeHcp: { fontSize: 12, color: colors.white, opacity: 0.8 },
  viewToggle: { paddingHorizontal: 10, paddingVertical: 6, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 8 },
  viewToggleText: { fontSize: 12, fontWeight: '600', color: colors.white },
  
  svgContainer: { alignItems: 'center', backgroundColor: '#f0fdf4', padding: 8 },
  greenViewContainer: { alignItems: 'center', backgroundColor: '#f0fdf4', padding: 16 },
  greenLabel: { textAlign: 'center', fontSize: 14, fontWeight: '600', color: colors.primary, padding: 8, textTransform: 'capitalize' },
  
  notes: { padding: 12, backgroundColor: colors.offWhite },
  notesText: { fontSize: 13, color: colors.grayDark, fontStyle: 'italic' },
  
  editSection: { padding: 12, borderTopWidth: 1, borderTopColor: colors.grayLight },
  editLabel: { fontSize: 12, fontWeight: '700', color: colors.primary, marginBottom: 8 },
  editRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  editFieldLabel: { fontSize: 13, color: colors.grayDark },
  editInput: { width: 60, padding: 8, backgroundColor: colors.offWhite, borderRadius: 6, textAlign: 'center', fontWeight: '600' },
  editUnit: { fontSize: 12, color: colors.gray },
});
