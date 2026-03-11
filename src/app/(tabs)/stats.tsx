import { useState, useEffect, useCallback, useRef } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Modal, Platform } from 'react-native';
import Svg, { Circle, Path, Line, Text as SvgText } from 'react-native-svg';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../lib/AuthContext';
import { colors } from '../../lib/theme';
import ScoreCell from '../../components/ScoreCell';

// --- Custom Dropdown ---
function Dropdown<T extends string>({ options, value, onChange, labelMap }: { options: T[]; value: T; onChange: (v: T) => void; labelMap?: Record<string, string> }) {
  const [open, setOpen] = useState(false);
  const getLabel = (v: T) => labelMap?.[v] ?? v;

  return (
    <View style={dropdownStyles.wrapper}>
      <TouchableOpacity style={dropdownStyles.button} onPress={() => setOpen(!open)} activeOpacity={0.7}>
        <Text style={dropdownStyles.buttonText}>{getLabel(value)}</Text>
        <Text style={dropdownStyles.arrow}>{open ? '▲' : '▼'}</Text>
      </TouchableOpacity>
      {open && (
        <View style={dropdownStyles.list}>
          {options.map(opt => (
            <TouchableOpacity key={opt} style={[dropdownStyles.item, value === opt && dropdownStyles.itemActive]} onPress={() => { onChange(opt); setOpen(false); }}>
              <Text style={[dropdownStyles.itemText, value === opt && dropdownStyles.itemTextActive]}>{getLabel(opt)}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
}

const dropdownStyles = StyleSheet.create({
  wrapper: { position: 'relative', zIndex: 100, marginBottom: 16 },
  button: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: colors.primary, borderRadius: 10, borderWidth: 2, borderColor: colors.gold, paddingVertical: 12, paddingHorizontal: 16 },
  buttonText: { fontSize: 14, fontWeight: '700', color: colors.gold },
  arrow: { fontSize: 12, color: colors.gold, marginLeft: 8 },
  list: { position: 'absolute', top: '100%', left: 0, right: 0, backgroundColor: colors.white, borderRadius: 10, borderWidth: 1, borderColor: colors.grayLight, marginTop: 4, overflow: 'hidden', ...Platform.select({ web: { boxShadow: '0 4px 12px rgba(0,0,0,0.15)' }, default: { elevation: 6 } }) },
  item: { paddingVertical: 12, paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: colors.grayLight },
  itemActive: { backgroundColor: colors.primary },
  itemText: { fontSize: 14, fontWeight: '600', color: colors.primary },
  itemTextActive: { color: colors.gold },
});

type RangeOption = 'all' | '3' | '5' | '10' | '25';

interface RoundStat { id: string; date_played: string; total_score: number; course_name?: string; }
interface HoleScore { round_id: string; hole_number: number; score: number; par?: number; }
interface ClubStat { club: string; avgDistance: number; count: number; }
interface RecentHole { hole_number: number; score: number; par: number; putts: number; fairway_hit: boolean | null; gir: boolean; wedge_and_in: number | null; }
interface RecentRound { id: string; date_played: string; total_score: number; course_name: string; holes: RecentHole[]; wedge_total?: number | null; round_type?: string; }

function BarChart({ data, maxVal, label }: { data: { label: string; value: number }[]; maxVal: number; label: string }) {
  if (!data.length) return null;
  return (
    <View style={cs.chart}>
      <Text style={cs.chartLabel}>{label}</Text>
      <View style={cs.bars}>
        {data.map((d, i) => (
          <View key={i} style={cs.barCol}>
            <Text style={cs.barVal}>{d.value}</Text>
            <View style={[cs.bar, { height: Math.max(4, (d.value / maxVal) * 120) }]} />
            <Text style={cs.barLabel}>{d.label}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

// --- Petal Chart for shot dispersion ---
const PETAL_DIRECTIONS: { key: string; angle: number; label: string }[] = [
  { key: 'Long', angle: 0, label: 'Long' },
  { key: 'Long-Right', angle: 45, label: 'Long R' },
  { key: 'Right', angle: 90, label: 'Right' },
  { key: 'Short-Right', angle: 135, label: 'Short R' },
  { key: 'Short', angle: 180, label: 'Short' },
  { key: 'Short-Left', angle: 225, label: 'Short L' },
  { key: 'Left', angle: 270, label: 'Left' },
  { key: 'Long-Left', angle: 315, label: 'Long L' },
];

function petalPath(cx: number, cy: number, angle: number, length: number, width: number): string {
  const rad = (angle - 90) * Math.PI / 180;
  const perpRad = rad + Math.PI / 2;
  const tipX = cx + Math.cos(rad) * length;
  const tipY = cy + Math.sin(rad) * length;
  const cp1X = cx + Math.cos(rad) * length * 0.6 + Math.cos(perpRad) * width;
  const cp1Y = cy + Math.sin(rad) * length * 0.6 + Math.sin(perpRad) * width;
  const cp2X = cx + Math.cos(rad) * length * 0.6 - Math.cos(perpRad) * width;
  const cp2Y = cy + Math.sin(rad) * length * 0.6 - Math.sin(perpRad) * width;
  return `M ${cx} ${cy} C ${cp1X} ${cp1Y}, ${cp1X} ${cp1Y}, ${tipX} ${tipY} C ${cp2X} ${cp2Y}, ${cp2X} ${cp2Y}, ${cx} ${cy} Z`;
}

function normalizeMissDir(dir: string): string | null {
  const map: Record<string, string | null> = {
    'Left': 'Left', 'left': 'Left', 'L': 'Left',
    'Right': 'Right', 'right': 'Right', 'R': 'Right',
    'Short': 'Short', 'short': 'Short',
    'Long': 'Long', 'long': 'Long',
    'Short Left': 'Short-Left', 'Short-Left': 'Short-Left', 'short-left': 'Short-Left',
    'Short Right': 'Short-Right', 'Short-Right': 'Short-Right', 'short-right': 'Short-Right',
    'Long Left': 'Long-Left', 'Long-Left': 'Long-Left', 'long-left': 'Long-Left',
    'Long Right': 'Long-Right', 'Long-Right': 'Long-Right', 'long-right': 'Long-Right',
    'On Target': null, 'on_target': null, 'On target': null,
  };
  return dir in map ? map[dir] : dir;
}

function PetalChart({ missCounts, totalShots, onTargetCount, title }: { missCounts: Record<string, number>; totalShots: number; onTargetCount: number; title?: string }) {
  const size = 240;
  const cx = size / 2;
  const cy = size / 2;
  const maxR = 80;
  const vals = Object.values(missCounts);
  const maxCount = vals.length > 0 ? Math.max(...vals, 1) : 1;

  return (
    <View style={{ alignItems: 'center', marginBottom: 16 }}>
      {title && <Text style={{ fontSize: 14, fontWeight: '700', color: colors.primary, marginBottom: 8 }}>{title}</Text>}
      <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <Circle cx={cx} cy={cy} r={maxR} fill="none" stroke={colors.grayLight} strokeWidth={0.5} />
        <Circle cx={cx} cy={cy} r={maxR * 0.5} fill="none" stroke={colors.grayLight} strokeWidth={0.5} />
        {PETAL_DIRECTIONS.map(d => {
          const rad = (d.angle - 90) * Math.PI / 180;
          return <Line key={d.key} x1={cx} y1={cy} x2={cx + Math.cos(rad) * maxR} y2={cy + Math.sin(rad) * maxR} stroke={colors.grayLight} strokeWidth={0.5} />;
        })}
        {PETAL_DIRECTIONS.map(d => {
          const count = missCounts[d.key] || 0;
          if (count === 0) return null;
          const length = (count / maxCount) * maxR;
          const width = Math.max(8, length * 0.35);
          return <Path key={d.key} d={petalPath(cx, cy, d.angle, length, width)} fill={colors.gold} opacity={0.75} />;
        })}
        <Circle cx={cx} cy={cy} r={12} fill={colors.primary} />
        {onTargetCount > 0 && (
          <Circle cx={cx} cy={cy} r={Math.min(12, 6 + (onTargetCount / Math.max(totalShots, 1)) * 6)} fill="#16a34a" />
        )}
        {PETAL_DIRECTIONS.map(d => {
          const count = missCounts[d.key] || 0;
          if (count === 0) return null;
          const rad = (d.angle - 90) * Math.PI / 180;
          const lx = cx + Math.cos(rad) * (maxR + 16);
          const ly = cy + Math.sin(rad) * (maxR + 16);
          return <SvgText key={d.key + '_lbl'} x={lx} y={ly} fontSize={9} fill={colors.primary} fontWeight="700" textAnchor="middle" alignmentBaseline="central">{d.label} {count}</SvgText>;
        })}
      </Svg>
      {onTargetCount > 0 && <Text style={{ fontSize: 11, color: '#16a34a', fontWeight: '700', marginTop: 4 }}>On Target: {onTargetCount} ({Math.round(onTargetCount / Math.max(totalShots, 1) * 100)}%)</Text>}
    </View>
  );
}

// --- Putting Petal Chart ---
const PUTT_DIRECTIONS: { key: string; angle: number; label: string }[] = [
  { key: 'miss-long', angle: 0, label: 'Long' },
  { key: 'lip-out-right', angle: 60, label: 'Lip R' },
  { key: 'miss-right', angle: 90, label: 'Right' },
  { key: 'miss-short', angle: 180, label: 'Short' },
  { key: 'lip-out-left', angle: 300, label: 'Lip L' },
  { key: 'miss-left', angle: 270, label: 'Left' },
];

function PuttPetalChart({ shots }: { shots: any[] }) {
  const size = 240;
  const cx = size / 2;
  const cy = size / 2;
  const maxR = 80;
  const counts: Record<string, number> = {};
  let madeCount = 0;
  shots.forEach(sh => {
    if (!sh.putt_result) return;
    if (sh.putt_result === 'made') { madeCount++; return; }
    counts[sh.putt_result] = (counts[sh.putt_result] || 0) + 1;
  });
  const vals = Object.values(counts);
  const maxCount = vals.length > 0 ? Math.max(...vals, 1) : 1;
  const total = shots.filter(sh => sh.putt_result).length;
  const makePct = total > 0 ? Math.round(madeCount / total * 100) : 0;

  return (
    <View style={{ alignItems: 'center', marginBottom: 16 }}>
      <Text style={{ fontSize: 14, fontWeight: '700', color: colors.primary, marginBottom: 8 }}>Putt Dispersion</Text>
      <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <Circle cx={cx} cy={cy} r={maxR} fill="none" stroke={colors.grayLight} strokeWidth={0.5} />
        <Circle cx={cx} cy={cy} r={maxR * 0.5} fill="none" stroke={colors.grayLight} strokeWidth={0.5} />
        {PUTT_DIRECTIONS.map(d => {
          const rad = (d.angle - 90) * Math.PI / 180;
          return <Line key={d.key} x1={cx} y1={cy} x2={cx + Math.cos(rad) * maxR} y2={cy + Math.sin(rad) * maxR} stroke={colors.grayLight} strokeWidth={0.5} />;
        })}
        {PUTT_DIRECTIONS.map(d => {
          const count = counts[d.key] || 0;
          if (count === 0) return null;
          const length = (count / maxCount) * maxR;
          const width = Math.max(8, length * 0.35);
          return <Path key={d.key} d={petalPath(cx, cy, d.angle, length, width)} fill={colors.gold} opacity={0.75} />;
        })}
        <Circle cx={cx} cy={cy} r={16} fill={madeCount > 0 ? '#16a34a' : colors.primary} />
        <Circle cx={cx} cy={cy} r={10} fill={colors.primary} />
        <SvgText x={cx} y={cy + 1} fontSize={9} fill={colors.gold} fontWeight="800" textAnchor="middle" alignmentBaseline="central">{makePct}%</SvgText>
        {PUTT_DIRECTIONS.map(d => {
          const count = counts[d.key] || 0;
          if (count === 0) return null;
          const rad = (d.angle - 90) * Math.PI / 180;
          const lx = cx + Math.cos(rad) * (maxR + 16);
          const ly = cy + Math.sin(rad) * (maxR + 16);
          return <SvgText key={d.key + '_lbl'} x={lx} y={ly} fontSize={9} fill={colors.primary} fontWeight="700" textAnchor="middle" alignmentBaseline="central">{d.label} {count}</SvgText>;
        })}
      </Svg>
      <Text style={{ fontSize: 11, color: '#16a34a', fontWeight: '700', marginTop: 4 }}>Made: {madeCount} ({makePct}%)</Text>
    </View>
  );
}

// --- Putting Distance Stats ---
const PUTT_BRACKETS = [
  { label: '0-3ft', min: 0, max: 3 },
  { label: '3-5ft', min: 3, max: 5 },
  { label: '5-10ft', min: 5, max: 10 },
  { label: '10-20ft', min: 10, max: 20 },
  { label: '20+ft', min: 20, max: Infinity },
];

function PuttDistanceStats({ shots }: { shots: any[] }) {
  const puttsWithDist = shots.filter((sh: any) => sh.putt_distance != null && sh.putt_distance > 0);
  if (puttsWithDist.length === 0) return null;

  const avgRemaining = puttsWithDist.filter((sh: any) => sh.putt_distance_remaining != null);
  const avgRem = avgRemaining.length > 0 ? (avgRemaining.reduce((sum: number, sh: any) => sum + sh.putt_distance_remaining, 0) / avgRemaining.length).toFixed(1) : null;

  const brackets = PUTT_BRACKETS.map(b => {
    const inBracket = puttsWithDist.filter((sh: any) => sh.putt_distance >= b.min && sh.putt_distance < b.max);
    const made = inBracket.filter((sh: any) => sh.putt_result === 'made').length;
    const withRemaining = inBracket.filter((sh: any) => sh.putt_distance_remaining != null);
    const avgLeave = withRemaining.length > 0 ? (withRemaining.reduce((sum: number, sh: any) => sum + sh.putt_distance_remaining, 0) / withRemaining.length) : 0;
    const avgPctLeft = withRemaining.length > 0 ? (withRemaining.reduce((sum: number, sh: any) => sum + (sh.putt_distance > 0 ? (sh.putt_distance_remaining / sh.putt_distance) * 100 : 0), 0) / withRemaining.length) : 0;
    const makeRate = inBracket.length > 0 ? Math.round(made / inBracket.length * 100) : 0;
    return { ...b, count: inBracket.length, made, makeRate, avgLeave, avgPctLeft };
  }).filter(b => b.count > 0);

  const dropoffIdx = new Set<number>();
  for (let i = 1; i < brackets.length; i++) {
    if (brackets[i - 1].makeRate - brackets[i].makeRate >= 20) dropoffIdx.add(i);
  }

  return (
    <View style={{ marginBottom: 16 }}>
      <Text style={s.sectionTitle}>Putting Distance</Text>
      {avgRem !== null && (
        <View style={[s.summaryRow, { marginBottom: 12 }]}>
          <View style={s.summaryCard}>
            <Text style={s.summaryNum}>{avgRem}ft</Text>
            <Text style={s.summaryLabel}>Avg Leave</Text>
          </View>
          <View style={s.summaryCard}>
            <Text style={s.summaryNum}>{puttsWithDist.length}</Text>
            <Text style={s.summaryLabel}>Putts Tracked</Text>
          </View>
        </View>
      )}
      <View style={{ backgroundColor: colors.white, borderRadius: 10, overflow: 'hidden', borderWidth: 1, borderColor: colors.grayLight }}>
        <View style={{ flexDirection: 'row', backgroundColor: colors.primary, paddingVertical: 8, paddingHorizontal: 6 }}>
          <Text style={{ flex: 1.2, color: colors.white, fontWeight: '700', fontSize: 11 }}>Range</Text>
          <Text style={{ flex: 0.6, color: colors.white, fontWeight: '700', fontSize: 11, textAlign: 'center' }}>#</Text>
          <Text style={{ flex: 1, color: colors.white, fontWeight: '700', fontSize: 11, textAlign: 'center' }}>Make%</Text>
          <Text style={{ flex: 1, color: colors.white, fontWeight: '700', fontSize: 11, textAlign: 'center' }}>Avg Leave</Text>
          <Text style={{ flex: 1, color: colors.white, fontWeight: '700', fontSize: 11, textAlign: 'center' }}>% Left</Text>
        </View>
        {brackets.map((b, idx) => {
          const isDropoff = dropoffIdx.has(idx);
          return (
            <View key={b.label} style={{ flexDirection: 'row', paddingVertical: 7, paddingHorizontal: 6, borderBottomWidth: 1, borderBottomColor: colors.grayLight, backgroundColor: isDropoff ? '#fef3c7' : idx % 2 === 0 ? colors.offWhite : colors.white }}>
              <Text style={{ flex: 1.2, fontSize: 12, fontWeight: '600', color: colors.primary }}>{b.label}</Text>
              <Text style={{ flex: 0.6, fontSize: 12, color: colors.black, textAlign: 'center' }}>{b.count}</Text>
              <Text style={{ flex: 1, fontSize: 12, fontWeight: '700', color: b.makeRate >= 50 ? '#16a34a' : colors.primary, textAlign: 'center' }}>{b.makeRate}%{isDropoff ? ' ⚠️' : ''}</Text>
              <Text style={{ flex: 1, fontSize: 12, color: colors.black, textAlign: 'center' }}>{b.avgLeave.toFixed(1)}ft</Text>
              <Text style={{ flex: 1, fontSize: 12, color: colors.black, textAlign: 'center' }}>{b.avgPctLeft.toFixed(0)}%</Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

// --- Fairway Miss Direction Bar (tug-of-war) ---
function FairwayMissBar({ leftPct, rightPct, leftCount, rightCount }: { leftPct: number; rightPct: number; leftCount: number; rightCount: number }) {
  const total = leftCount + rightCount;
  if (total === 0) return null;
  const dominant = leftPct > rightPct ? 'L' : rightPct > leftPct ? 'R' : null;

  return (
    <View style={{ marginBottom: 24 }}>
      <Text style={s.sectionTitle}>Fairway Miss Tendency</Text>
      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
        <Text style={{ fontSize: 12, fontWeight: '700', color: colors.primary, width: 50 }}>Left</Text>
        <View style={{ flex: 1 }} />
        <Text style={{ fontSize: 12, fontWeight: '700', color: colors.primary, width: 50, textAlign: 'right' }}>Right</Text>
      </View>
      <View style={{ flexDirection: 'row', height: 32, borderRadius: 16, overflow: 'hidden', backgroundColor: colors.grayLight }}>
        <View style={{ width: `${leftPct}%`, backgroundColor: dominant === 'L' ? colors.gold : colors.primary, justifyContent: 'center', alignItems: 'center', borderTopLeftRadius: 16, borderBottomLeftRadius: 16 }}>
          {leftPct > 15 && <Text style={{ color: colors.white, fontSize: 12, fontWeight: '800' }}>{leftPct}%</Text>}
        </View>
        <View style={{ width: `${rightPct}%`, backgroundColor: dominant === 'R' ? colors.gold : colors.primary, justifyContent: 'center', alignItems: 'center', borderTopRightRadius: 16, borderBottomRightRadius: 16 }}>
          {rightPct > 15 && <Text style={{ color: colors.white, fontSize: 12, fontWeight: '800' }}>{rightPct}%</Text>}
        </View>
      </View>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 }}>
        <Text style={{ fontSize: 11, color: colors.gray }}>{leftCount} misses</Text>
        <Text style={{ fontSize: 11, color: colors.gray }}>{rightCount} misses</Text>
      </View>
    </View>
  );
}

export default function Stats() {
  const { user } = useAuth();
  const [allRounds, setAllRounds] = useState<RoundStat[]>([]);
  const [range, setRange] = useState<RangeOption>('all');
  const [allScoresByRound, setAllScoresByRound] = useState<Map<string, any[]>>(new Map());
  const [clubs, setClubs] = useState<ClubStat[]>([]);
  const [recentRounds, setRecentRounds] = useState<RecentRound[]>([]);
  const [wedgeTotalsByRound, setWedgeTotalsByRound] = useState<Map<string, number>>(new Map());
  const [expandedRoundId, setExpandedRoundId] = useState<string | null>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [advancedCategory, setAdvancedCategory] = useState<'tee' | 'approach' | 'chip' | 'putting'>('tee');
  const [advancedShots, setAdvancedShots] = useState<any[]>([]);
  const [shapeFilter, setShapeFilter] = useState<string>('all');

  useEffect(() => {
    if (!user) return;
    loadStats();
  }, [user]);

  const loadStats = async () => {
    if (!user) return;
    const { data: roundsData } = await supabase.from('sb_rounds')
      .select('id, date_played, total_score, notes')
      .eq('user_id', user.id).eq('is_complete', true)
      .order('date_played', { ascending: true });

    const rds = roundsData || [];
    setAllRounds(rds);

    const roundIds = rds.map(r => r.id);
    if (roundIds.length) {
      const { data: scores } = await supabase.from('sb_hole_scores')
        .select('round_id, fairway_hit, fairway_miss_dir, gir, putts, wedge_and_in, hole_number, score, par, notes')
        .in('round_id', roundIds)
        .order('hole_number');

      const byRound = new Map<string, any[]>();
      (scores || []).forEach((sc: any) => {
        if (!byRound.has(sc.round_id)) byRound.set(sc.round_id, []);
        byRound.get(sc.round_id)!.push(sc);
      });
      setAllScoresByRound(byRound);

      const allAdvShots: any[] = [];
      (scores || []).forEach((sc: any) => {
        if (!sc.notes) return;
        try {
          const parsed = JSON.parse(sc.notes);
          if (parsed.mode === 'advanced' && parsed.shots) {
            parsed.shots.forEach((shot: any) => allAdvShots.push({ ...shot, hole_number: sc.hole_number, par: sc.par }));
          }
        } catch {}
      });
      setAdvancedShots(allAdvShots);

      const wTotals = new Map<string, number>();
      byRound.forEach((holes, roundId) => {
        const wedgeHoles = holes.filter((h: any) => h.wedge_and_in !== null && h.wedge_and_in !== undefined && typeof h.wedge_and_in === 'number');
        if (wedgeHoles.length > 0) {
          wTotals.set(roundId, wedgeHoles.reduce((s: number, h: any) => s + (h.wedge_and_in || 0), 0));
        }
      });
      setWedgeTotalsByRound(wTotals);

      const { data: recentFull } = await supabase.from('sb_rounds')
        .select('id, date_played, total_score, notes, sb_courses(name)')
        .eq('user_id', user.id).eq('is_complete', true)
        .order('date_played', { ascending: false })
        .limit(10);

      setRecentRounds((recentFull || []).map((r: any) => {
        const rScores = byRound.get(r.id) || [];
        const wedgeHoles = rScores.filter((h: any) => h.wedge_and_in !== null && typeof h.wedge_and_in === 'number');
        const wTotal = wedgeHoles.length > 0 ? wedgeHoles.reduce((s: number, h: any) => s + (h.wedge_and_in || 0), 0) : null;
        return {
          id: r.id,
          date_played: r.date_played,
          total_score: r.total_score,
          course_name: r.sb_courses?.name || 'Unknown',
          round_type: (() => { try { const n = JSON.parse(r.notes); return n?.round_type || undefined; } catch { return undefined; } })(),
          holes: rScores.map((h: any) => ({ hole_number: h.hole_number, score: h.score, par: h.par || 0, putts: h.putts ?? 0, fairway_hit: h.fairway_hit, gir: !!h.gir, wedge_and_in: h.wedge_and_in })).sort((a: any, b: any) => a.hole_number - b.hole_number),
          wedge_total: wTotal,
        };
      }));

      const { data: shots } = await supabase.from('sb_shots')
        .select('club, distance_yards, hole_score_id')
        .not('club', 'is', null)
        .not('distance_yards', 'is', null);

      if (shots?.length) {
        const clubMap = new Map<string, number[]>();
        shots.forEach(s => {
          if (!s.club || !s.distance_yards) return;
          if (!clubMap.has(s.club)) clubMap.set(s.club, []);
          clubMap.get(s.club)!.push(s.distance_yards);
        });
        const clubStats: ClubStat[] = Array.from(clubMap.entries()).map(([club, dists]) => ({
          club, avgDistance: Math.round(dists.reduce((a, b) => a + b, 0) / dists.length), count: dists.length
        })).sort((a, b) => b.avgDistance - a.avgDistance);
        setClubs(clubStats);
      }
    }
  };

  const filteredRounds = range === 'all' ? allRounds : allRounds.slice(-parseInt(range));
  const filteredIds = new Set(filteredRounds.map(r => r.id));
  const filteredScores = (() => {
    const arr: any[] = [];
    allScoresByRound.forEach((scores, roundId) => {
      if (filteredIds.has(roundId)) arr.push(...scores);
    });
    return arr;
  })();

  const rounds = filteredRounds;
  const avgScore = rounds.length ? Math.round(rounds.reduce((s, r) => s + (r.total_score || 0), 0) / rounds.length * 10) / 10 : 0;
  const fwHoles = filteredScores.filter((s: any) => s.fairway_hit !== null);
  const fwPct = fwHoles.length ? Math.round(fwHoles.filter((s: any) => s.fairway_hit).length / fwHoles.length * 100) : 0;
  const girHoles = filteredScores.filter((s: any) => s.gir !== null);
  const girPct = girHoles.length ? Math.round(girHoles.filter((s: any) => s.gir).length / girHoles.length * 100) : 0;
  const puttHoles = filteredScores.filter((s: any) => s.putts !== null);
  const avgPutts = puttHoles.length && rounds.length ? Math.round(puttHoles.reduce((s: number, h: any) => s + h.putts, 0) / rounds.length * 10) / 10 : 0;
  const onePuttsTotal = puttHoles.filter((s: any) => s.putts === 1).length;
  const threePuttsTotal = puttHoles.filter((s: any) => s.putts >= 3).length;
  const roundCount = filteredRounds.length || 1;
  const onePuttsPer18 = (onePuttsTotal / roundCount).toFixed(1);
  const threePuttsPer18 = (threePuttsTotal / roundCount).toFixed(1);
  const fwMisses = filteredScores.filter((sc: any) => sc.fairway_hit === false && sc.fairway_miss_dir);
  const missLCount = fwMisses.filter((sc: any) => sc.fairway_miss_dir === 'L').length;
  const missRCount = fwMisses.filter((sc: any) => sc.fairway_miss_dir === 'R').length;
  const missLPct = fwMisses.length ? Math.round(missLCount / fwMisses.length * 100) : 0;
  const missRPct = fwMisses.length ? Math.round(missRCount / fwMisses.length * 100) : 0;
  const wedgeHolesFiltered = filteredScores.filter((sc: any) => sc.wedge_and_in !== null && typeof sc.wedge_and_in === 'number');
  const wedgeInTotal = wedgeHolesFiltered.length;
  const wedgeInMade = wedgeHolesFiltered.reduce((s: number, sc: any) => s + (sc.wedge_and_in || 0), 0);
  const scoreData = rounds.slice(-10).map(r => ({
    label: new Date(r.date_played).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    value: r.total_score || 0,
  }));

  const RANGE_OPTIONS: { key: RangeOption; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: '3', label: 'Last 3' },
    { key: '5', label: 'Last 5' },
    { key: '10', label: 'Last 10' },
    { key: '25', label: 'Last 25' },
  ];

  return (
    <ScrollView style={s.container} contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
      {allRounds.length === 0 ? (
        <View style={s.empty}>
          <Text style={s.emptyIcon}>📊</Text>
          <Text style={s.emptyText}>No stats yet</Text>
          <Text style={s.emptySubtext}>Log some rounds to see your stats</Text>
        </View>
      ) : (
        <>
          {/* Range Filter */}
          <View style={s.rangePillRow}>
            {RANGE_OPTIONS.map(opt => (
              <TouchableOpacity key={opt.key} style={[s.rangePill, range === opt.key && s.rangePillActive]} onPress={() => setRange(opt.key)}>
                <Text style={[s.rangePillText, range === opt.key && s.rangePillTextActive]}>{opt.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Summary Cards */}
          <View style={s.summaryRow}>
            <View style={s.summaryCard}>
              <Text style={s.summaryNum}>{avgScore || '—'}</Text>
              <Text style={s.summaryLabel}>Avg Score</Text>
            </View>
            <View style={s.summaryCard}>
              <Text style={s.summaryNum}>{fwPct}%</Text>
              <Text style={s.summaryLabel}>Fairways</Text>
            </View>
            <View style={s.summaryCard}>
              <Text style={s.summaryNum}>{girPct}%</Text>
              <Text style={s.summaryLabel}>GIR</Text>
            </View>
            <View style={s.summaryCard}>
              <Text style={s.summaryNum}>{avgPutts || '—'}</Text>
              <Text style={s.summaryLabel}>Putts/Rnd</Text>
            </View>
          </View>

          {/* Putting row */}
          <View style={s.summaryRow}>
            <View style={s.summaryCard}>
              <Text style={s.summaryNum}>{onePuttsPer18}</Text>
              <Text style={s.summaryLabel}>1-Putts/Rnd</Text>
            </View>
            <View style={s.summaryCard}>
              <Text style={s.summaryNum}>{threePuttsPer18}</Text>
              <Text style={s.summaryLabel}>3-Putts/Rnd</Text>
            </View>
          </View>

          {/* Fairway Miss Direction Bar */}
          {(missLPct > 0 || missRPct > 0) && (
            <FairwayMissBar leftPct={missLPct} rightPct={missRPct} leftCount={missLCount} rightCount={missRCount} />
          )}

          {/* Advanced Stats Dashboard */}
          {advancedShots.length > 0 && (
            <>
              <TouchableOpacity style={{ backgroundColor: colors.primary, borderRadius: 12, padding: 16, alignItems: 'center', marginBottom: 16 }} onPress={() => setShowAdvanced(!showAdvanced)}>
                <Text style={{ color: colors.gold, fontSize: 16, fontWeight: '800' }}>🎯 Advanced Stats Dashboard {showAdvanced ? '▲' : '▼'}</Text>
              </TouchableOpacity>

              {showAdvanced && (() => {
                const categories: { key: typeof advancedCategory; label: string }[] = [
                  { key: 'tee', label: 'Tee Shots' },
                  { key: 'approach', label: 'Approach Shots' },
                  { key: 'chip', label: 'Chip/Pitch' },
                  { key: 'putting', label: 'Putting' },
                ];

                const isPutt = (sh: any) => !!sh.is_putt || !!sh.putt_result || !!sh.putt_break || !!sh.putt_distance || !!sh.putt_hit_line || !!sh.putt_hit_speed;
                const catShots = advancedShots.filter(sh => {
                  if (advancedCategory === 'tee') return sh.shot_number === 1 && !isPutt(sh);
                  if (advancedCategory === 'approach') return sh.intention === 'hit_green' && !isPutt(sh);
                  if (advancedCategory === 'chip') return (sh.intention === 'chip_pitch' || sh.intention === 'recovery' || sh.intention === 'punch_out') && !isPutt(sh);
                  if (advancedCategory === 'putting') return isPutt(sh);
                  return false;
                });

                const totalShots = catShots.length;

                // Get unique shot shapes for filter
                const uniqueShapes = new Set<string>();
                catShots.forEach(sh => { if (sh.shot_shape) uniqueShapes.add(sh.shot_shape); });
                const shapeOptions = ['all', ...Array.from(uniqueShapes)];

                // Apply shape filter for non-putting
                const filteredCatShots = advancedCategory !== 'putting' && shapeFilter !== 'all'
                  ? catShots.filter(sh => sh.shot_shape === shapeFilter)
                  : catShots;

                // Build petal miss counts for non-putting categories
                const petalMissCounts: Record<string, number> = {};
                let onTargetCount = 0;
                if (advancedCategory !== 'putting') {
                  filteredCatShots.forEach(sh => {
                    if (!sh.miss_direction) return;
                    const normalized = normalizeMissDir(sh.miss_direction);
                    if (normalized === null) { onTargetCount++; return; }
                    petalMissCounts[normalized] = (petalMissCounts[normalized] || 0) + 1;
                  });
                }

                // Shot shape breakdown
                const shapes: Record<string, number> = {};
                catShots.forEach(sh => {
                  if (sh.shot_shape) shapes[sh.shot_shape] = (shapes[sh.shot_shape] || 0) + 1;
                });

                // Putt stats
                const puttLineHit = catShots.filter(sh => sh.putt_hit_line === 'yes').length;
                const puttLineMiss = catShots.filter(sh => sh.putt_hit_line === 'no').length;
                const puttLineTotal = puttLineHit + puttLineMiss;
                const pullCount = catShots.filter(sh => sh.putt_line_miss === 'Pull').length;
                const pushCount = catShots.filter(sh => sh.putt_line_miss === 'Push').length;

                const puttSpeedHit = catShots.filter(sh => sh.putt_hit_speed === 'yes').length;
                const puttSpeedMiss = catShots.filter(sh => sh.putt_hit_speed === 'no').length;
                const puttSpeedTotal = puttSpeedHit + puttSpeedMiss;
                const hardCount = catShots.filter(sh => sh.putt_speed_miss === 'Hard').length;
                const softCount = catShots.filter(sh => sh.putt_speed_miss === 'Soft').length;

                // Result lies
                const results: Record<string, number> = {};
                catShots.forEach(sh => {
                  if (sh.result_lie) results[sh.result_lie] = (results[sh.result_lie] || 0) + 1;
                });

                return (
                  <View style={{ marginBottom: 20 }}>
                    {/* Category selector dropdown */}
                    <Dropdown
                      options={categories.map(c => c.key)}
                      value={advancedCategory}
                      onChange={(v) => { setAdvancedCategory(v); setShapeFilter('all'); }}
                      labelMap={Object.fromEntries(categories.map(c => [c.key, c.label]))}
                    />

                    <Text style={{ fontSize: 13, color: colors.gray, marginBottom: 12 }}>{totalShots} shots tracked</Text>

                    {totalShots > 0 && (
                      <>
                        {/* PETAL CHART for non-putting */}
                        {advancedCategory !== 'putting' && (
                          <>
                            {/* Shape filter dropdown */}
                            {uniqueShapes.size > 0 && (
                              <Dropdown
                                options={shapeOptions}
                                value={shapeFilter}
                                onChange={setShapeFilter}
                                labelMap={{ all: 'Overall' }}
                              />
                            )}
                            <PetalChart missCounts={petalMissCounts} totalShots={filteredCatShots.length} onTargetCount={onTargetCount} title="Shot Dispersion" />
                          </>
                        )}

                        {/* PUTTING: Petal + Distance Stats */}
                        {advancedCategory === 'putting' && (
                          <>
                            <PuttPetalChart shots={catShots} />
                            <PuttDistanceStats shots={catShots} />
                          </>
                        )}

                        {/* Shot shape breakdown (non-putting) */}
                        {advancedCategory !== 'putting' && Object.keys(shapes).length > 0 && (
                          <>
                            <Text style={s.sectionTitle}>Intended Shot Shape</Text>
                            {Object.entries(shapes).sort(([,a],[,b]) => b - a).map(([shape, count]) => (
                              <View key={shape} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
                                <Text style={{ width: 90, fontSize: 13, fontWeight: '600', color: colors.primary }}>{shape}</Text>
                                <View style={{ flex: 1, height: 24, backgroundColor: colors.grayLight, borderRadius: 12, overflow: 'hidden', marginHorizontal: 8 }}>
                                  <View style={{ height: '100%', width: `${(count / totalShots) * 100}%`, backgroundColor: colors.gold, borderRadius: 12 }} />
                                </View>
                                <Text style={{ width: 50, fontSize: 13, fontWeight: '700', color: colors.primary, textAlign: 'right' }}>{Math.round((count / totalShots) * 100)}%</Text>
                              </View>
                            ))}
                          </>
                        )}

                        {/* Result lie breakdown (non-putting) */}
                        {advancedCategory !== 'putting' && Object.keys(results).length > 0 && (
                          <>
                            <Text style={s.sectionTitle}>Where You Ended Up</Text>
                            {Object.entries(results).sort(([,a],[,b]) => b - a).map(([lie, count]) => (
                              <View key={lie} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
                                <Text style={{ width: 90, fontSize: 13, fontWeight: '600', color: colors.primary }}>{lie}</Text>
                                <View style={{ flex: 1, height: 24, backgroundColor: colors.grayLight, borderRadius: 12, overflow: 'hidden', marginHorizontal: 8 }}>
                                  <View style={{ height: '100%', width: `${(count / totalShots) * 100}%`, backgroundColor: lie === 'Green' || lie === 'Fairway' ? '#16a34a' : colors.gold, borderRadius: 12 }} />
                                </View>
                                <Text style={{ width: 50, fontSize: 13, fontWeight: '700', color: colors.primary, textAlign: 'right' }}>{Math.round((count / totalShots) * 100)}%</Text>
                              </View>
                            ))}
                          </>
                        )}

                        {/* Putting-specific: line & speed */}
                        {advancedCategory === 'putting' && puttLineTotal > 0 && (
                          <>
                            <Text style={s.sectionTitle}>Hit Your Line</Text>
                            <View style={s.summaryRow}>
                              <View style={s.summaryCard}>
                                <Text style={s.summaryNum}>{Math.round((puttLineHit / puttLineTotal) * 100)}%</Text>
                                <Text style={s.summaryLabel}>Yes</Text>
                              </View>
                              <View style={s.summaryCard}>
                                <Text style={s.summaryNum}>{Math.round((puttLineMiss / puttLineTotal) * 100)}%</Text>
                                <Text style={s.summaryLabel}>No</Text>
                              </View>
                            </View>
                            {puttLineMiss > 0 && (
                              <View style={s.summaryRow}>
                                <View style={s.summaryCard}>
                                  <Text style={s.summaryNum}>{pullCount}</Text>
                                  <Text style={s.summaryLabel}>Pull</Text>
                                </View>
                                <View style={s.summaryCard}>
                                  <Text style={s.summaryNum}>{pushCount}</Text>
                                  <Text style={s.summaryLabel}>Push</Text>
                                </View>
                              </View>
                            )}
                          </>
                        )}

                        {advancedCategory === 'putting' && puttSpeedTotal > 0 && (
                          <>
                            <Text style={s.sectionTitle}>Hit Your Speed</Text>
                            <View style={s.summaryRow}>
                              <View style={s.summaryCard}>
                                <Text style={s.summaryNum}>{Math.round((puttSpeedHit / puttSpeedTotal) * 100)}%</Text>
                                <Text style={s.summaryLabel}>Yes</Text>
                              </View>
                              <View style={s.summaryCard}>
                                <Text style={s.summaryNum}>{Math.round((puttSpeedMiss / puttSpeedTotal) * 100)}%</Text>
                                <Text style={s.summaryLabel}>No</Text>
                              </View>
                            </View>
                            {puttSpeedMiss > 0 && (
                              <View style={s.summaryRow}>
                                <View style={s.summaryCard}>
                                  <Text style={s.summaryNum}>{hardCount}</Text>
                                  <Text style={s.summaryLabel}>Hard</Text>
                                </View>
                                <View style={s.summaryCard}>
                                  <Text style={s.summaryNum}>{softCount}</Text>
                                  <Text style={s.summaryLabel}>Soft</Text>
                                </View>
                              </View>
                            )}
                          </>
                        )}
                      </>
                    )}
                  </View>
                );
              })()}
            </>
          )}

          <Text style={s.sectionTitle}>Scoring Trend (Last 10)</Text>
          <BarChart data={scoreData} maxVal={Math.max(...scoreData.map(d => d.value), 72)} label="" />

          {recentRounds.length > 0 && (
            <>
              <Text style={s.sectionTitle}>Recent Rounds</Text>
              {recentRounds.map(r => {
                const isExpanded = expandedRoundId === r.id;
                const hasWedge = r.holes.some(h => h.wedge_and_in != null);
                const fwTracked = r.holes.filter(h => h.fairway_hit !== null);
                const fwHitCount = fwTracked.filter(h => h.fairway_hit === true).length;
                const girCount = r.holes.filter(h => h.gir).length;
                const totalPutts = r.holes.reduce((sum, h) => sum + h.putts, 0);
                const birdies = r.holes.filter(h => h.score && h.par && h.score < h.par).length;
                const bogeys = r.holes.filter(h => h.score && h.par && h.score > h.par).length;

                return (
                  <TouchableOpacity key={r.id} activeOpacity={0.7} onPress={() => setExpandedRoundId(isExpanded ? null : r.id)}>
                    <View style={s.recentCard}>
                      <View style={s.recentHeader}>
                        <View style={{ flex: 1 }}>
                          <Text style={s.recentCourse}>{r.course_name}</Text>
                          <Text style={s.recentDate}>{new Date(r.date_played).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}{r.round_type ? ` · ${r.round_type === 'practice' ? '🏋️' : r.round_type === 'tournament' ? '🏆' : '⛳'}` : ''}</Text>
                        </View>
                        <View style={{ alignItems: 'flex-end' }}>
                          <Text style={s.recentScore}>{r.total_score}</Text>
                          {r.wedge_total != null && (
                            <Text style={{ fontSize: 11, color: colors.gold, fontWeight: '600' }}>W&I: {r.wedge_total}</Text>
                          )}
                        </View>
                      </View>

                      {!isExpanded && r.holes.length > 0 && (
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.miniScorecard}>
                          <View style={{ flexDirection: 'row', gap: 2 }}>
                            {r.holes.map((h, idx) => (
                              <View key={idx} style={s.miniScoreCell}>
                                <Text style={s.miniHoleNum}>{h.hole_number}</Text>
                                <ScoreCell score={h.score} par={h.par} size={11} mini />
                              </View>
                            ))}
                          </View>
                        </ScrollView>
                      )}

                      {isExpanded && r.holes.length > 0 && (
                        <View style={s.expandedDetail}>
                          <View style={s.detailPillRow}>
                            <View style={s.detailPill}><Text style={s.detailPillLabel}>FW</Text><Text style={s.detailPillValue}>{fwHitCount}/{fwTracked.length}</Text></View>
                            <View style={s.detailPill}><Text style={s.detailPillLabel}>GIR</Text><Text style={s.detailPillValue}>{girCount}/{r.holes.length}</Text></View>
                            <View style={s.detailPill}><Text style={s.detailPillLabel}>Putts</Text><Text style={s.detailPillValue}>{totalPutts}</Text></View>
                            <View style={s.detailPill}><Text style={s.detailPillLabel}>🐦</Text><Text style={s.detailPillValue}>{birdies}</Text></View>
                            <View style={s.detailPill}><Text style={s.detailPillLabel}>Bogey+</Text><Text style={s.detailPillValue}>{bogeys}</Text></View>
                            {hasWedge && r.wedge_total != null && (
                              <View style={s.detailPill}><Text style={s.detailPillLabel}>W&I</Text><Text style={s.detailPillValue}>{r.wedge_total}</Text></View>
                            )}
                          </View>

                          <View style={s.detailTable}>
                            <View style={s.detailHeaderRow}>
                              <Text style={[s.detailCell, s.detailHeaderText, { flex: 0.5 }]}>Hole</Text>
                              <Text style={[s.detailCell, s.detailHeaderText]}>Par</Text>
                              <Text style={[s.detailCell, s.detailHeaderText]}>Score</Text>
                              <Text style={[s.detailCell, s.detailHeaderText]}>Putts</Text>
                              <Text style={[s.detailCell, s.detailHeaderText]}>FW</Text>
                              <Text style={[s.detailCell, s.detailHeaderText]}>GIR</Text>
                              {hasWedge && <Text style={[s.detailCell, s.detailHeaderText]}>W&I</Text>}
                            </View>
                            {r.holes.map((h, idx) => (
                              <View key={h.hole_number} style={[s.detailRow, idx % 2 === 0 && { backgroundColor: colors.offWhite }]}>
                                <Text style={[s.detailCell, { flex: 0.5, fontWeight: '700', color: colors.primary }]}>{h.hole_number}</Text>
                                <Text style={s.detailCell}>{h.par}</Text>
                                <View style={{ flex: 1, alignItems: 'center' }}>
                                  <ScoreCell score={h.score} par={h.par} size={13} />
                                </View>
                                <Text style={s.detailCell}>{h.putts || '—'}</Text>
                                <Text style={s.detailCell}>{h.fairway_hit === null ? '—' : h.fairway_hit ? '✓' : '✗'}</Text>
                                <Text style={s.detailCell}>{h.gir ? '✓' : '✗'}</Text>
                                {hasWedge && <Text style={s.detailCell}>{h.wedge_and_in != null ? h.wedge_and_in : '—'}</Text>}
                              </View>
                            ))}
                          </View>

                          <Text style={{ fontSize: 11, color: colors.gray, textAlign: 'center', marginTop: 8 }}>Tap to collapse</Text>
                        </View>
                      )}
                    </View>
                  </TouchableOpacity>
                );
              })}
            </>
          )}

          <Text style={s.sectionTitle}>Rounds Played</Text>
          <Text style={s.roundCount}>{rounds.length} rounds</Text>

          {wedgeInTotal > 0 && (
            <>
              <Text style={s.sectionTitle}>Wedge & In</Text>
              <View style={s.summaryRow}>
                <View style={s.summaryCard}>
                  <Text style={s.summaryNum}>{wedgeInMade}</Text>
                  <Text style={s.summaryLabel}>Total Shots</Text>
                </View>
                <View style={s.summaryCard}>
                  <Text style={s.summaryNum}>{wedgeInTotal > 0 ? (wedgeInMade / wedgeInTotal).toFixed(1) : '0'}</Text>
                  <Text style={s.summaryLabel}>Avg/Hole</Text>
                </View>
                <View style={s.summaryCard}>
                  <Text style={s.summaryNum}>{wedgeInTotal}</Text>
                  <Text style={s.summaryLabel}>Holes Tracked</Text>
                </View>
              </View>
            </>
          )}

          {clubs.length > 0 && (
            <>
              <Text style={s.sectionTitle}>Club Distances</Text>
              {clubs.map(c => (
                <View key={c.club} style={s.clubRow}>
                  <Text style={s.clubName}>{c.club}</Text>
                  <View style={s.clubBarContainer}>
                    <View style={[s.clubBar, { width: `${Math.min(100, (c.avgDistance / 300) * 100)}%` }]} />
                  </View>
                  <Text style={s.clubDist}>{c.avgDistance} yds</Text>
                </View>
              ))}
            </>
          )}
        </>
      )}
    </ScrollView>
  );
}

const cs = StyleSheet.create({
  chart: { marginBottom: 20 },
  chartLabel: { fontSize: 14, fontWeight: '600', color: colors.primary, marginBottom: 8 },
  bars: { flexDirection: 'row', alignItems: 'flex-end', gap: 4, height: 150, paddingTop: 20 },
  barCol: { flex: 1, alignItems: 'center', justifyContent: 'flex-end' },
  bar: { width: '80%', backgroundColor: colors.gold, borderRadius: 4, minHeight: 4 },
  barVal: { fontSize: 10, color: colors.primary, fontWeight: '700', marginBottom: 2 },
  barLabel: { fontSize: 9, color: colors.gray, marginTop: 4 },
});

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.offWhite },
  empty: { alignItems: 'center', paddingTop: 100 },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyText: { fontSize: 18, fontWeight: '700', color: colors.primary },
  emptySubtext: { fontSize: 14, color: colors.gray, marginTop: 4 },
  summaryRow: { flexDirection: 'row', gap: 8, marginBottom: 24 },
  summaryCard: { flex: 1, backgroundColor: colors.primary, borderRadius: 12, padding: 14, alignItems: 'center' },
  summaryNum: { fontSize: 22, fontWeight: '800', color: colors.gold },
  summaryLabel: { fontSize: 11, color: colors.white, opacity: 0.8, marginTop: 2 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: colors.primary, marginTop: 20, marginBottom: 12 },
  roundCount: { fontSize: 24, fontWeight: '800', color: colors.gold },
  clubRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10, gap: 10 },
  clubName: { fontSize: 13, fontWeight: '600', color: colors.primary, width: 70 },
  clubBarContainer: { flex: 1, height: 20, backgroundColor: colors.grayLight, borderRadius: 10, overflow: 'hidden' },
  clubBar: { height: '100%', backgroundColor: colors.gold, borderRadius: 10 },
  clubDist: { fontSize: 13, fontWeight: '700', color: colors.primary, width: 60, textAlign: 'right' },
  recentCard: { backgroundColor: colors.white, borderRadius: 12, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: colors.grayLight },
  recentHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  recentCourse: { fontSize: 15, fontWeight: '700', color: colors.primary },
  recentDate: { fontSize: 12, color: colors.grayDark, marginTop: 2 },
  recentScore: { fontSize: 28, fontWeight: '800', color: colors.gold },
  miniScorecard: { marginTop: 4 },
  miniScoreCell: { alignItems: 'center', width: 26 },
  miniHoleNum: { fontSize: 8, color: colors.gray, marginBottom: 1 },
  rangePillRow: { flexDirection: 'row', gap: 6, marginBottom: 20 },
  rangePill: { flex: 1, paddingVertical: 10, borderRadius: 20, borderWidth: 2, borderColor: colors.grayLight, alignItems: 'center', backgroundColor: colors.white },
  rangePillActive: { backgroundColor: colors.primary, borderColor: colors.gold },
  rangePillText: { fontSize: 12, fontWeight: '700', color: colors.grayDark },
  rangePillTextActive: { color: colors.gold },
  expandedDetail: { marginTop: 10, borderTopWidth: 1, borderTopColor: colors.grayLight, paddingTop: 12 },
  detailPillRow: { flexDirection: 'row', gap: 6, marginBottom: 12, flexWrap: 'wrap' },
  detailPill: { flex: 1, minWidth: 50, backgroundColor: colors.primary, borderRadius: 8, paddingVertical: 6, paddingHorizontal: 4, alignItems: 'center' },
  detailPillLabel: { fontSize: 10, color: colors.white, opacity: 0.8, fontWeight: '600' },
  detailPillValue: { fontSize: 15, fontWeight: '800', color: colors.gold, marginTop: 1 },
  detailTable: { backgroundColor: colors.white, borderRadius: 10, overflow: 'hidden', borderWidth: 1, borderColor: colors.grayLight },
  detailHeaderRow: { flexDirection: 'row', backgroundColor: colors.primary, paddingVertical: 8, paddingHorizontal: 4 },
  detailHeaderText: { color: colors.white, fontWeight: '700', fontSize: 11 },
  detailRow: { flexDirection: 'row', paddingVertical: 6, paddingHorizontal: 4, borderBottomWidth: 1, borderBottomColor: colors.grayLight },
  detailCell: { flex: 1, textAlign: 'center', fontSize: 12, color: colors.black },
});
