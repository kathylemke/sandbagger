import { useState, useMemo } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { colors } from '../lib/theme';

// ============================================================
// Helpers — defensive parsing + filtering for partial data
// ============================================================

const safeStr = (v: any) => (v == null ? '' : String(v));
function safeNum(v: any): number | null {
  const n = parseFloat(v);
  return Number.isFinite(n) ? n : null;
}

// Quantile for IQR / median calculation
function quantile(sorted: number[], q: number): number {
  if (sorted.length === 0) return 0;
  const pos = (sorted.length - 1) * q;
  const base = Math.floor(pos);
  const rest = pos - base;
  if (sorted[base + 1] !== undefined) {
    return sorted[base] + rest * (sorted[base + 1] - sorted[base]);
  }
  return sorted[base];
}

function computeStats(values: number[]): { n: number; min: number; q1: number; median: number; q3: number; max: number; mean: number; iqr: number; stddev: number } | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const min = sorted[0];
  const max = sorted[sorted.length - 1];
  const median = quantile(sorted, 0.5);
  const q1 = quantile(sorted, 0.25);
  const q3 = quantile(sorted, 0.75);
  const mean = sorted.reduce((a, b) => a + b, 0) / sorted.length;
  const iqr = q3 - q1;
  // Standard deviation
  const variance = sorted.reduce((sum, v) => sum + (v - mean) ** 2, 0) / sorted.length;
  const stddev = Math.sqrt(variance);
  return { n: sorted.length, min, q1, median, q3, max, mean, iqr, stddev };
}

function isPutt(shot: any): boolean {
  if (!shot) return false;
  return !!shot.is_putt || !!shot.putt_result || !!shot.putt_break || !!shot.putt_distance || !!shot.putt_hit_line || !!shot.putt_hit_speed || !!shot.putt_slope;
}

// Passes filter — if filter is 'all', accept everything; if specific value, only match.
// Shots with no data for the filter field are excluded from filtered views
// (but still count in unfiltered make% by distance).
function passes(shot: any, field: string, filterValue: string): boolean {
  if (filterValue === 'all') return true;
  const v = safeStr(shot?.[field]);
  if (!v) return false; // partial data — skip from this specific filter
  return v === filterValue;
}

// ============================================================
// Buckets
// ============================================================

// Distance buckets — the LENGTH of the shot in YARDS (how far the user hit FROM).
// Filter chip; user picks the bucket they're interested in.
const DISTANCE_BUCKETS = [
  { key: '0-20', min: 0, max: 20, label: '0-20 yds' },
  { key: '20-40', min: 20, max: 40, label: '20-40 yds' },
  { key: '40-60', min: 40, max: 60, label: '40-60 yds' },
  { key: '60-80', min: 60, max: 80, label: '60-80 yds' },
  { key: '80-100', min: 80, max: 100, label: '80-100 yds' },
  { key: '100-120', min: 100, max: 120, label: '100-120 yds' },
  { key: '120-140', min: 120, max: 140, label: '120-140 yds' },
  { key: '140-160', min: 140, max: 160, label: '140-160 yds' },
  { key: '160-180', min: 160, max: 180, label: '160-180 yds' },
  { key: '180-200', min: 180, max: 200, label: '180-200 yds' },
  { key: '200-220', min: 200, max: 220, label: '200-220 yds' },
  { key: '220+', min: 220, max: Infinity, label: '220+ yds' },
];

const PUTT_DISTANCE_BUCKETS = [
  { key: '0-6', min: 0, max: 6.001, label: '0-6 ft' },
  { key: '7-20', min: 6.001, max: 20, label: '7-20 ft' },
  { key: '20-30', min: 20, max: 30, label: '20-30 ft' },
  { key: '30-40', min: 30, max: 40, label: '30-40 ft' },
  { key: '40+', min: 40, max: Infinity, label: '40+ ft' },
];

function bucketFor(value: number, buckets: { key: string; min: number; max: number }[]): string {
  for (const b of buckets) {
    if (value >= b.min && value < b.max) return b.key;
  }
  return buckets[buckets.length - 1].key; // fallthrough = highest bucket
}

// ============================================================
// Miss-direction taxonomy (display labels + colors)
// ============================================================

const APPROACH_MISS_DIRS = [
  { key: 'Short', label: 'Short', color: '#f59e0b' },
  { key: 'Long', label: 'Long', color: '#3b82f6' },
  { key: 'Left', label: 'Left', color: '#10b981' },
  { key: 'Right', label: 'Right', color: '#ef4444' },
  { key: 'Short-Left', label: 'Short L', color: '#84cc16' },
  { key: 'Short-Right', label: 'Short R', color: '#eab308' },
  { key: 'Long-Left', label: 'Long L', color: '#06b6d4' },
  { key: 'Long-Right', label: 'Long R', color: '#8b5cf6' },
  { key: 'On Target', label: 'On Target', color: '#16a34a' },
];

function normalizeMiss(dir: string): string {
  if (!dir) return '';
  const d = String(dir).toLowerCase().trim();
  if (d === 'on target' || d === 'on_target' || d === 'green' || d === 'on') return 'On Target';
  if (d === 'short') return 'Short';
  if (d === 'long') return 'Long';
  if (d === 'left' || d === 'l') return 'Left';
  if (d === 'right' || d === 'r') return 'Right';
  if (d.includes('short') && d.includes('left')) return 'Short-Left';
  if (d.includes('short') && d.includes('right')) return 'Short-Right';
  if (d.includes('long') && d.includes('left')) return 'Long-Left';
  if (d.includes('long') && d.includes('right')) return 'Long-Right';
  return dir; // pass through as-is
}

const PUTT_MISS_DIRS = [
  { key: 'made', label: 'Made', color: '#16a34a' },
  { key: 'miss-short', label: 'Short', color: '#f59e0b' },
  { key: 'miss-long', label: 'Long', color: '#3b82f6' },
  { key: 'miss-left', label: 'Left', color: '#10b981' },
  { key: 'miss-right', label: 'Right', color: '#ef4444' },
  { key: 'lip-out-left', label: 'Lip L', color: '#84cc16' },
  { key: 'lip-out-right', label: 'Lip R', color: '#eab308' },
];

function normalizePuttResult(r: string): string {
  if (!r) return '';
  const d = String(r).toLowerCase().trim();
  if (d === 'made') return 'made';
  return d; // already in canonical form from log.tsx
}

// ============================================================
// Filter chip components
// ============================================================

function ChipRow<T extends string>({ label, options, value, onChange }: { label: string; options: { key: T; label: string }[]; value: T; onChange: (v: T) => void }) {
  return (
    <View style={s.chipRow}>
      <Text style={s.chipLabel}>{label}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
        {options.map(o => (
          <TouchableOpacity
            key={o.key}
            style={[s.chip, value === o.key && s.chipActive]}
            onPress={() => onChange(o.key)}
            activeOpacity={0.7}
          >
            <Text style={[s.chipText, value === o.key && s.chipTextActive]}>{o.label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

// ============================================================
// Views
// ============================================================

// Horizontal stacked bar showing distribution of miss_direction values
function MissBar({ counts, total, dirs }: { counts: Record<string, number>; total: number; dirs: { key: string; label: string; color: string }[] }) {
  if (total === 0) return <Text style={s.empty}>No data for this filter.</Text>;
  return (
    <View style={{ marginBottom: 12 }}>
      <View style={{ flexDirection: 'row', height: 22, borderRadius: 6, overflow: 'hidden', backgroundColor: '#e5e7eb' }}>
        {dirs.map(d => {
          const c = counts[d.key] || 0;
          if (!c) return null;
          const pct = (c / total) * 100;
          return (
            <View key={d.key} style={{ width: `${pct}%`, backgroundColor: d.color }} />
          );
        })}
      </View>
      <View style={{ marginTop: 8 }}>
        {dirs.map(d => {
          const c = counts[d.key] || 0;
          if (!c) return null;
          const pct = Math.round((c / total) * 100);
          return (
            <View key={d.key} style={s.legendRow}>
              <View style={[s.legendDot, { backgroundColor: d.color }]} />
              <Text style={s.legendLabel}>{d.label}</Text>
              <Text style={s.legendValue}>{c} ({pct}%)</Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

// Simple bar chart — used for proximity-by-club and make% by distance
function BarList({ rows, maxValue, format, valueLabel }: { rows: { label: string; value: number; sub?: string }[]; maxValue: number; format: (v: number) => string; valueLabel?: string }) {
  if (!rows.length || maxValue === 0) return <Text style={s.empty}>No data for this filter.</Text>;
  return (
    <View style={{ marginBottom: 8 }}>
      {valueLabel && <Text style={s.subtle}>{valueLabel}</Text>}
      {rows.map((r, i) => {
        const pct = maxValue > 0 ? (r.value / maxValue) * 100 : 0;
        return (
          <View key={i} style={s.barRow}>
            <Text style={s.barLabel} numberOfLines={1}>{r.label}</Text>
            <View style={s.barTrack}>
              <View style={[s.barFill, { width: `${Math.max(2, pct)}%` }]} />
            </View>
            <Text style={s.barValue}>{format(r.value)}{r.sub ? ` ${r.sub}` : ''}</Text>
          </View>
        );
      })}
    </View>
  );
}

// ============================================================
// Section panels
// ============================================================

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={s.section}>
      <Text style={s.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

// ============================================================
// Category: Tee / Fairway
// ============================================================

function TeeView({ shots }: { shots: any[] }) {
  const [shape, setShape] = useState<string>('all');

  const shapes = useMemo(() => {
    const s = new Set<string>();
    shots.forEach(sh => { const v = safeStr(sh?.shot_shape); if (v) s.add(v); });
    return ['all', ...Array.from(s).sort()];
  }, [shots]);

  const filtered = useMemo(() => {
    return shots.filter(sh => passes(sh, 'shot_shape', shape));
  }, [shots, shape]);

  // Build miss-direction counts
  const counts: Record<string, number> = {};
  filtered.forEach(sh => {
    const m = normalizeMiss(safeStr(sh?.miss_direction));
    if (m) counts[m] = (counts[m] || 0) + 1;
  });
  const total = filtered.length;
  const onTarget = counts['On Target'] || 0;
  const onTargetPct = total > 0 ? Math.round((onTarget / total) * 100) : 0;

  // Result lie breakdown
  const lies: Record<string, number> = {};
  filtered.forEach(sh => {
    const l = safeStr(sh?.result_lie);
    if (l) lies[l] = (lies[l] || 0) + 1;
  });

  return (
    <>
      <ChipRow label="Shape" options={shapes.map(k => ({ key: k, label: k === 'all' ? 'All' : k }))} value={shape} onChange={setShape} />
      <Section title="Miss Tendency">
        <Text style={s.summary}>{total} shots · On Target: {onTarget} ({onTargetPct}%)</Text>
        <MissBar counts={counts} total={total} dirs={APPROACH_MISS_DIRS} />
      </Section>
      {Object.keys(lies).length > 0 && (
        <Section title="Where You Ended Up">
          <BarList
            rows={Object.entries(lies).sort(([, a], [, b]) => b - a).map(([lie, c]) => ({ label: lie, value: c, sub: `(${Math.round((c / Math.max(total, 1)) * 100)}%)` }))}
            maxValue={Math.max(...Object.values(lies), 1)}
            format={v => String(v)}
          />
        </Section>
      )}
    </>
  );
}

// ============================================================
// Category: Approach
// ============================================================

// Build a lookup: for each shot, what was the "hitting from" position?
// That's the previous shot's result_lie (Fairway, Rough, Bunker, Fescue, etc.)
// First shot of every hole (the tee shot) is always from "Tee".
// Keyed by (round_id, hole_number) so shots from different rounds don't bleed together.
function buildHittingFromMap(allShots: any[]): Map<string, string> {
  const map = new Map<string, string>();
  if (!Array.isArray(allShots) || allShots.length === 0) return map;
  // Group by (round_id, hole_number) — each round has its own Hole 1, 2, etc.
  const byRndHole: Record<string, any[]> = {};
  for (const sh of allShots) {
    const k = `${sh?.round_id || 'noround'}-${sh?.hole_number}`;
    if (!byRndHole[k]) byRndHole[k] = [];
    byRndHole[k].push(sh);
  }
  for (const k of Object.keys(byRndHole)) {
    byRndHole[k].sort((a, b) => (a.shot_number || 0) - (b.shot_number || 0));
    // First shot of the hole — tee shot, always from "Tee"
    if (byRndHole[k].length > 0) {
      const first = byRndHole[k][0];
      map.set(`${first.round_id || 'noround'}-${first.hole_number}-${first.shot_number}`, 'Tee');
    }
    // Subsequent shots — from = previous shot's result_lie
    for (let i = 1; i < byRndHole[k].length; i++) {
      const cur = byRndHole[k][i];
      const prev = byRndHole[k][i - 1];
      const key = `${cur.round_id || 'noround'}-${cur.hole_number}-${cur.shot_number}`;
      const prevLie = safeStr(prev?.result_lie);
      if (prevLie) map.set(key, prevLie);
    }
  }
  return map;
}

// Build a lookup: for each shot, what's the proximity (in feet) of the next shot
// in the same hole? Used for approaches that are followed by a putt or another
// approach — the next shot's starting distance IS the proximity of this one.
//
// Data model:
//   - If current shot has explicit `distance_to_hole` field:
//     - hit_green + result_lie === 'Green' → value is in FEET (putt distance)
//     - otherwise → value is in YARDS (chipped/pitched back into play)
//   - Otherwise, derive from next shot's distance field
function buildProximityMap(allShots: any[]): Map<string, number | null> {
  const map = new Map<string, number | null>();
  if (!Array.isArray(allShots) || allShots.length === 0) return map;
  // Group by (round_id, hole_number) — each round has its own Hole 1, 2, etc.
  const byRndHole: Record<string, any[]> = {};
  for (const sh of allShots) {
    const k = `${sh?.round_id || 'noround'}-${sh?.hole_number}`;
    if (!byRndHole[k]) byRndHole[k] = [];
    byRndHole[k].push(sh);
  }
  for (const k of Object.keys(byRndHole)) {
    byRndHole[k].sort((a, b) => (a.shot_number || 0) - (b.shot_number || 0));
    for (let i = 0; i < byRndHole[k].length; i++) {
      const cur = byRndHole[k][i];
      const next = byRndHole[k][i + 1];
      const key = `${cur.round_id || 'noround'}-${cur.hole_number}-${cur.shot_number}`;

      // Priority 1: explicit distance_to_hole field on current shot
      const explicit = safeNum(cur?.distance_to_hole);
      if (explicit != null) {
        const onGreen = safeStr(cur?.intention) === 'hit_green' && safeStr(cur?.result_lie) === 'Green';
        const unitIsFeet = onGreen;
        map.set(key, unitIsFeet ? explicit : explicit * 3);
        continue;
      }

      // For putts: proximity = 0 if made, or putt_distance_remaining (feet left) if missed
      if (isPutt(cur)) {
        const result = safeStr(cur?.putt_result);
        if (result === 'made') {
          map.set(key, 0);
        } else if (result) {
          // Missed putt — use the leftover distance as proximity
          const remaining = safeNum(cur?.putt_distance_remaining);
          map.set(key, remaining);
        } else {
          map.set(key, null);
        }
        continue;
      }

      // Priority 2: derive from next shot's distance (the next shot starts
      // where this one ended up, so its starting distance = this shot's proximity)
      if (next) {
        if (isPutt(next)) {
          // Next shot is a putt — putt_distance (feet) IS the proximity
          const pd = safeNum(next.putt_distance);
          map.set(key, pd);
        } else {
          // Next shot is another approach — approach_distance (yards)
          // Convert to feet for consistency in averaging
          const ad = safeNum(next.approach_distance);
          map.set(key, ad != null ? ad * 3 : null);
        }
      } else {
        // No next shot — proximity is genuinely unknown for this shot
        map.set(key, null);
      }
    }
  }
  return map;
}

function ProximityStatsBox({ stats, nDerivable, nTotal }: { stats: ReturnType<typeof computeStats>; nDerivable: number; nTotal: number }) {
  if (!stats) {
    return (
      <Text style={s.empty}>
        No proximity data yet. Proximity = distance to hole after the shot, in feet.
        Log a putt (or another shot) after each approach for proximity to populate.
      </Text>
    );
  }
  // Build a simple text distribution table
  const fmt = (v: number) => `${v.toFixed(1)} ft`;
  return (
    <View>
      <View style={s.statGrid}>
        <Stat label="Count" value={`${stats.n}`} sub={nDerivable < nTotal ? `of ${nTotal}` : undefined} />
        <Stat label="Mean" value={fmt(stats.mean)} />
        <Stat label="Std Dev" value={fmt(stats.stddev)} />
      </View>
      <View style={[s.statGrid, { marginTop: 8 }]}>
        <Stat label="Min" value={fmt(stats.min)} />
        <Stat label="Q1" value={fmt(stats.q1)} />
        <Stat label="Median" value={fmt(stats.median)} />
        <Stat label="Q3" value={fmt(stats.q3)} />
        <Stat label="Max" value={fmt(stats.max)} />
      </View>
      <Text style={[s.subtle, { marginTop: 8 }]}>IQR: {fmt(stats.iqr)} (Q3 − Q1)</Text>
    </View>
  );
}

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <View style={s.statCell}>
      <Text style={s.statLabel}>{label}</Text>
      <Text style={s.statValue}>{value}</Text>
      {sub ? <Text style={s.statSub}>{sub}</Text> : null}
    </View>
  );
}

// Simple distribution histogram (10-ft buckets, capped at 80ft for display)
function ProximityHistogram({ values }: { values: number[] }) {
  const bucketSize = 10;
  const maxShown = 80;
  const buckets: { min: number; max: number; count: number }[] = [];
  for (let m = 0; m < maxShown; m += bucketSize) {
    buckets.push({ min: m, max: m + bucketSize, count: 0 });
  }
  // Plus a catch-all "80+" bucket
  buckets.push({ min: maxShown, max: Infinity, count: 0 });
  for (const v of values) {
    if (v >= maxShown) {
      buckets[buckets.length - 1].count++;
    } else {
      const b = buckets.find(b => v >= b.min && v < b.max);
      if (b) b.count++;
    }
  }
  const maxCount = Math.max(...buckets.map(b => b.count), 1);
  return (
    <View>
      {buckets.map(b => {
        const pct = (b.count / Math.max(values.length, 1)) * 100;
        return (
          <View key={`${b.min}-${b.max}`} style={s.histRow}>
            <Text style={s.histLabel}>
              {b.max === Infinity ? `${b.min}+ ft` : `${b.min}-${b.max} ft`}
            </Text>
            <View style={s.histTrack}>
              <View style={[s.histFill, { width: `${Math.max(2, (b.count / maxCount) * 100)}%` }]} />
            </View>
            <Text style={s.histValue}>{b.count} ({Math.round(pct)}%)</Text>
          </View>
        );
      })}
    </View>
  );
}

function ApproachView({ shots, allShots }: { shots: any[]; allShots: any[] }) {
  const [club, setClub] = useState<string>('all');
  const [distance, setDistance] = useState<string>('all'); // distance filter (yards)
  const [shape, setShape] = useState<string>('all');
  const [hittingFrom, setHittingFrom] = useState<string>('all');

  const clubs = useMemo(() => {
    const c = new Set<string>();
    shots.forEach(sh => { const v = safeStr(sh?.club); if (v) c.add(v); });
    return ['all', ...Array.from(c).sort()];
  }, [shots]);

  const shapes = useMemo(() => {
    const s = new Set<string>();
    shots.forEach(sh => { const v = safeStr(sh?.shot_shape); if (v) s.add(v); });
    return ['all', ...Array.from(s).sort()];
  }, [shots]);

  // Hitting-from lookup: hole-shot → where the previous shot ended up
  const hittingFromMap = useMemo(() => buildHittingFromMap(allShots), [allShots]);
  // Available hitting-from values, sorted with common ones first
  const hittingFromOptions = useMemo(() => {
    const seen = new Set<string>();
    shots.forEach(sh => {
      const v = hittingFromMap.get(`${sh.round_id || 'noround'}-${sh.hole_number}-${sh.shot_number}`);
      if (v) seen.add(v);
    });
    const preferred = ['Tee', 'Fairway', 'Rough', 'Fescue', 'Bunker', 'Green', 'Fringe', 'Recovery', 'Trees'];
    const sorted = preferred.filter(p => seen.has(p));
    const rest = Array.from(seen).filter(v => !preferred.includes(v)).sort();
    return ['all', ...sorted, ...rest];
  }, [shots, hittingFromMap]);

  // Proximity lookup: hole-shot → feet-from-hole after this shot
  const proxMap = useMemo(() => buildProximityMap(allShots), [allShots]);

  const filtered = useMemo(() => {
    return shots.filter(sh => {
      if (!passes(sh, 'club', club)) return false;
      if (!passes(sh, 'shot_shape', shape)) return false;
      // Distance filter — uses approach_distance (length of shot, yards)
      if (distance !== 'all') {
        const d = safeNum(sh?.approach_distance);
        if (d == null) return false; // partial data → skip when specific bucket chosen
        const b = DISTANCE_BUCKETS.find(x => x.key === distance);
        if (!b || d < b.min || d >= b.max) return false;
      }
      // Hitting-from filter — uses previous shot's result_lie
      if (hittingFrom !== 'all') {
        const hf = hittingFromMap.get(`${sh.round_id || 'noround'}-${sh.hole_number}-${sh.shot_number}`) || '';
        if (hf !== hittingFrom) return false;
      }
      return true;
    });
  }, [shots, club, distance, shape, hittingFrom, hittingFromMap]);

  // Proximity stats — derived from next shot's distance (feet)
  const proxValues = filtered
    .map(sh => proxMap.get(`${sh.round_id || 'noround'}-${sh.hole_number}-${sh.shot_number}`))
    .filter((v): v is number => v != null);
  const proxStats = computeStats(proxValues);

  // Miss tendency
  const counts: Record<string, number> = {};
  filtered.forEach(sh => {
    const m = normalizeMiss(safeStr(sh?.miss_direction));
    if (m) counts[m] = (counts[m] || 0) + 1;
  });
  const total = filtered.length;
  const onTarget = counts['On Target'] || 0;
  const onTargetPct = total > 0 ? Math.round((onTarget / total) * 100) : 0;

  // Result lies
  const lies: Record<string, number> = {};
  filtered.forEach(sh => {
    const l = safeStr(sh?.result_lie);
    if (l) lies[l] = (lies[l] || 0) + 1;
  });

  return (
    <>
      <ChipRow label="Club" options={clubs.map(k => ({ key: k, label: k === 'all' ? 'All' : k }))} value={club} onChange={setClub} />
      <ChipRow label="Distance (shot length)" options={[{ key: 'all', label: 'All' }, ...DISTANCE_BUCKETS.map(b => ({ key: b.key, label: b.label }))]} value={distance} onChange={setDistance} />
      <ChipRow label="Hitting From" options={hittingFromOptions.map(k => ({ key: k, label: k === 'all' ? 'All' : k }))} value={hittingFrom} onChange={setHittingFrom} />
      <ChipRow label="Shape" options={shapes.map(k => ({ key: k, label: k === 'all' ? 'All' : k }))} value={shape} onChange={setShape} />

      <Section title="Proximity (ft from hole)">
        <Text style={s.summary}>
          {filtered.length} shots in current filter · {proxValues.length} with proximity data
        </Text>
        <ProximityStatsBox stats={proxStats} nDerivable={proxValues.length} nTotal={filtered.length} />
      </Section>

      {proxValues.length > 0 && (
        <Section title="Proximity Distribution">
          <ProximityHistogram values={proxValues} />
        </Section>
      )}

      <Section title="Miss Tendency">
        <Text style={s.summary}>{total} shots · On Target: {onTarget} ({onTargetPct}%)</Text>
        <MissBar counts={counts} total={total} dirs={APPROACH_MISS_DIRS} />
      </Section>

      {Object.keys(lies).length > 0 && (
        <Section title="Where You Ended Up">
          <BarList
            rows={Object.entries(lies).sort(([, a], [, b]) => b - a).map(([lie, c]) => ({ label: lie, value: c, sub: `(${Math.round((c / Math.max(total, 1)) * 100)}%)` }))}
            maxValue={Math.max(...Object.values(lies), 1)}
            format={v => String(v)}
          />
        </Section>
      )}
    </>
  );
}

// ============================================================
// Category: Putting
// ============================================================

function PuttingView({ putts, allShots }: { putts: any[]; allShots: any[] }) {
  const [distBucket, setDistBucket] = useState<string>('all');
  const [slope, setSlope] = useState<string>('all');
  const [brk, setBrk] = useState<string>('all');
  const [hittingFrom, setHittingFrom] = useState<string>('all');

  // Hitting-from lookup: which surface are we putting from? (green, fringe, rough, etc.)
  const hittingFromMap = useMemo(() => buildHittingFromMap(allShots || []), [allShots]);
  const hittingFromOptions = useMemo(() => {
    const seen = new Set<string>();
    putts.forEach(sh => {
      const v = hittingFromMap.get(`${sh.round_id || 'noround'}-${sh.hole_number}-${sh.shot_number}`);
      if (v) seen.add(v);
    });
    const preferred = ['Tee', 'Green', 'Fringe', 'Rough', 'Fairway', 'Fescue', 'Bunker', 'Recovery', 'Trees'];
    const sorted = preferred.filter(p => seen.has(p));
    const rest = Array.from(seen).filter(v => !preferred.includes(v)).sort();
    return ['all', ...sorted, ...rest];
  }, [putts, hittingFromMap]);

  // First: filter by distance bucket (only filters shots with putt_distance data)
  // All other filters applied per-view so shots with partial data still count in make%.
  const distFiltered = useMemo(() => {
    if (distBucket === 'all') return putts;
    return putts.filter(sh => {
      const d = safeNum(sh?.putt_distance);
      if (d == null) return false;
      const b = PUTT_DISTANCE_BUCKETS.find(x => x.key === distBucket);
      return !!b && d >= b.min && d < b.max;
    });
  }, [putts, distBucket]);

  // Slope options come from data
  const slopes = useMemo(() => {
    const s = new Set<string>();
    putts.forEach(sh => { const v = safeStr(sh?.putt_slope); if (v) s.add(v); });
    return ['all', ...Array.from(s).sort()];
  }, [putts]);

  const breaks = useMemo(() => {
    const b = new Set<string>();
    putts.forEach(sh => { const v = safeStr(sh?.putt_break); if (v) b.add(v); });
    return ['all', ...Array.from(b).sort()];
  }, [putts]);

  // Make% by distance bucket — always show full table; distBucket narrows the view
  const makeByBucket = useMemo(() => {
    const rows: { key: string; label: string; total: number; made: number; pct: number }[] = [];
    for (const b of PUTT_DISTANCE_BUCKETS) {
      const inBucket = putts.filter(sh => {
        const d = safeNum(sh?.putt_distance);
        return d != null && d >= b.min && d < b.max;
      });
      const made = inBucket.filter(sh => normalizePuttResult(safeStr(sh?.putt_result)) === 'made').length;
      const total = inBucket.length;
      const pct = total > 0 ? Math.round((made / total) * 100) : 0;
      rows.push({ key: b.key, label: b.label, made, total, pct });
    }
    return rows;
  }, [putts]);

  // For all other views, apply distance + slope + break + hitting-from filters
  const fullyFiltered = useMemo(() => {
    return distFiltered.filter(sh => {
      if (!passes(sh, 'putt_slope', slope)) return false;
      if (!passes(sh, 'putt_break', brk)) return false;
      if (hittingFrom !== 'all') {
        const hf = hittingFromMap.get(`${sh.round_id || 'noround'}-${sh.hole_number}-${sh.shot_number}`) || '';
        if (hf !== hittingFrom) return false;
      }
      return true;
    });
  }, [distFiltered, slope, brk, hittingFrom, hittingFromMap]);

  // Make% summary for current filter
  const madeCount = fullyFiltered.filter(sh => normalizePuttResult(safeStr(sh?.putt_result)) === 'made').length;
  const totalCount = fullyFiltered.length;
  const makePct = totalCount > 0 ? Math.round((madeCount / totalCount) * 100) : 0;

  // Speed analysis — only shots with speed data
  const speedShots = fullyFiltered.filter(sh => safeStr(sh?.putt_hit_speed) !== '');
  const speedHit = speedShots.filter(sh => safeStr(sh?.putt_hit_speed) === 'yes').length;
  const speedMiss = speedShots.filter(sh => safeStr(sh?.putt_hit_speed) === 'no').length;
  const speedHard = speedShots.filter(sh => safeStr(sh?.putt_speed_miss) === 'Hard').length;
  const speedSoft = speedShots.filter(sh => safeStr(sh?.putt_speed_miss) === 'Soft').length;

  // Line analysis
  const lineShots = fullyFiltered.filter(sh => safeStr(sh?.putt_hit_line) !== '');
  const lineHit = lineShots.filter(sh => safeStr(sh?.putt_hit_line) === 'yes').length;
  const lineMiss = lineShots.filter(sh => safeStr(sh?.putt_hit_line) === 'no').length;
  const pullCount = lineShots.filter(sh => safeStr(sh?.putt_line_miss) === 'Pull' || safeStr(sh?.putt_line_miss) === 'pull').length;
  const pushCount = lineShots.filter(sh => safeStr(sh?.putt_line_miss) === 'Push' || safeStr(sh?.putt_line_miss) === 'push').length;

  // Avg leave distance (only putts with putt_distance_remaining)
  const leaveNums = fullyFiltered.map(sh => safeNum(sh?.putt_distance_remaining)).filter((n): n is number => n != null);
  const avgLeave = leaveNums.length > 0 ? (leaveNums.reduce((a, b) => a + b, 0) / leaveNums.length).toFixed(1) : null;

  // Miss direction distribution
  const missCounts: Record<string, number> = {};
  fullyFiltered.forEach(sh => {
    const r = normalizePuttResult(safeStr(sh?.putt_result));
    if (r) missCounts[r] = (missCounts[r] || 0) + 1;
  });

  // Make% by slope (only shots with slope data)
  const makeBySlope = useMemo(() => {
    const out: Record<string, { made: number; total: number }> = {};
    fullyFiltered.forEach(sh => {
      const sl = safeStr(sh?.putt_slope);
      if (!sl) return;
      if (!out[sl]) out[sl] = { made: 0, total: 0 };
      out[sl].total++;
      if (normalizePuttResult(safeStr(sh?.putt_result)) === 'made') out[sl].made++;
    });
    return Object.entries(out).map(([k, v]) => ({
      key: k,
      label: k.charAt(0).toUpperCase() + k.slice(1),
      total: v.total,
      made: v.made,
      pct: v.total > 0 ? Math.round((v.made / v.total) * 100) : 0,
    }));
  }, [fullyFiltered]);

  // Make% by break
  const makeByBreak = useMemo(() => {
    const out: Record<string, { made: number; total: number }> = {};
    fullyFiltered.forEach(sh => {
      const bk = safeStr(sh?.putt_break);
      if (!bk) return;
      if (!out[bk]) out[bk] = { made: 0, total: 0 };
      out[bk].total++;
      if (normalizePuttResult(safeStr(sh?.putt_result)) === 'made') out[bk].made++;
    });
    return Object.entries(out).map(([k, v]) => ({
      key: k,
      label: k,
      total: v.total,
      made: v.made,
      pct: v.total > 0 ? Math.round((v.made / v.total) * 100) : 0,
    }));
  }, [fullyFiltered]);

  return (
    <>
      <ChipRow label="Distance" options={[{ key: 'all', label: 'All' }, ...PUTT_DISTANCE_BUCKETS.map(b => ({ key: b.key, label: b.label }))]} value={distBucket} onChange={setDistBucket} />
      <ChipRow label="Hitting From" options={hittingFromOptions.map(k => ({ key: k, label: k === 'all' ? 'All' : k }))} value={hittingFrom} onChange={setHittingFrom} />
      <ChipRow label="Slope" options={slopes.map(k => ({ key: k, label: k === 'all' ? 'All' : k.charAt(0).toUpperCase() + k.slice(1) }))} value={slope} onChange={setSlope} />
      <ChipRow label="Break" options={breaks.map(k => ({ key: k, label: k === 'all' ? 'All' : k }))} value={brk} onChange={setBrk} />

      <Section title="Make %">
        <Text style={s.summary}>
          {madeCount}/{totalCount} made ({makePct}%)
          {avgLeave != null && ` · Avg leave ${avgLeave} ft`}
        </Text>
        {speedShots.length > 0 && (
          <Text style={s.subtle}>Speed data: {speedShots.length} putts · Line data: {lineShots.length} putts</Text>
        )}
      </Section>

      <Section title="Miss Tendency">
        <MissBar counts={missCounts} total={totalCount} dirs={PUTT_MISS_DIRS} />
      </Section>

      <Section title="Speed">
        {speedShots.length === 0 ? (
          <Text style={s.empty}>No speed data logged for these putts.</Text>
        ) : (
          <>
            <View style={s.metricRow}>
              <View style={s.metricCard}>
                <Text style={s.metricNum}>{speedHit}</Text>
                <Text style={s.metricLabel}>Hit Speed</Text>
              </View>
              <View style={s.metricCard}>
                <Text style={s.metricNum}>{speedMiss}</Text>
                <Text style={s.metricLabel}>Missed Speed</Text>
              </View>
            </View>
            {speedMiss > 0 && (
              <View style={s.metricRow}>
                <View style={s.metricCard}>
                  <Text style={s.metricNum}>{speedHard}</Text>
                  <Text style={s.metricLabel}>Hard</Text>
                </View>
                <View style={s.metricCard}>
                  <Text style={s.metricNum}>{speedSoft}</Text>
                  <Text style={s.metricLabel}>Soft</Text>
                </View>
              </View>
            )}
          </>
        )}
      </Section>

      <Section title="Line">
        {lineShots.length === 0 ? (
          <Text style={s.empty}>No line data logged for these putts.</Text>
        ) : (
          <>
            <View style={s.metricRow}>
              <View style={s.metricCard}>
                <Text style={s.metricNum}>{lineHit}</Text>
                <Text style={s.metricLabel}>Hit Line</Text>
              </View>
              <View style={s.metricCard}>
                <Text style={s.metricNum}>{lineMiss}</Text>
                <Text style={s.metricLabel}>Missed Line</Text>
              </View>
            </View>
            {lineMiss > 0 && (
              <View style={s.metricRow}>
                <View style={s.metricCard}>
                  <Text style={s.metricNum}>{pullCount}</Text>
                  <Text style={s.metricLabel}>Pull</Text>
                </View>
                <View style={s.metricCard}>
                  <Text style={s.metricNum}>{pushCount}</Text>
                  <Text style={s.metricLabel}>Push</Text>
                </View>
              </View>
            )}
          </>
        )}
      </Section>

      <Section title="Make % by Distance">
        {makeByBucket.every(r => r.total === 0) ? (
          <Text style={s.empty}>No putt distance data yet.</Text>
        ) : (
          <View>
            {makeByBucket.map(r => (
              <View key={r.key} style={s.tableRow}>
                <Text style={s.tableLabel}>{r.label}</Text>
                <Text style={s.tableMid}>{r.made}/{r.total}</Text>
                <View style={s.tableBarTrack}>
                  <View style={[s.tableBarFill, { width: `${r.pct}%`, backgroundColor: r.pct >= 50 ? '#16a34a' : colors.gold }]} />
                </View>
                <Text style={s.tablePct}>{r.pct}%</Text>
              </View>
            ))}
          </View>
        )}
      </Section>

      {makeBySlope.length > 0 && (
        <Section title="Make % by Slope">
          <BarList
            rows={makeBySlope.map(r => ({ label: r.label, value: r.pct, sub: `(${r.made}/${r.total})` }))}
            maxValue={100}
            format={v => `${v}%`}
          />
        </Section>
      )}

      {makeByBreak.length > 0 && (
        <Section title="Make % by Break">
          <BarList
            rows={makeByBreak.map(r => ({ label: r.label, value: r.pct, sub: `(${r.made}/${r.total})` }))}
            maxValue={100}
            format={v => `${v}%`}
          />
        </Section>
      )}
    </>
  );
}

// ============================================================
// Main component
// ============================================================

export default function AdvancedStatsDashboard({ advancedShots }: { advancedShots: any[] }) {
  const [open, setOpen] = useState(false);
  const [category, setCategory] = useState<'tee' | 'approach' | 'putting'>('approach');

  if (!Array.isArray(advancedShots) || advancedShots.length === 0) return null;

  const teeShots = advancedShots.filter(sh => sh && safeStr(sh?.intention) === 'hit_fairway' && !isPutt(sh));
  const approachShots = advancedShots.filter(sh => sh && safeStr(sh?.intention) === 'hit_green' && !isPutt(sh));
  const putts = advancedShots.filter(sh => isPutt(sh));

  return (
    <View style={{ marginBottom: 20 }}>
      <TouchableOpacity
        style={s.openBtn}
        onPress={() => setOpen(!open)}
        activeOpacity={0.7}
      >
        <Text style={s.openBtnText}>🎯 Advanced Stats {open ? '▲' : '▼'}</Text>
      </TouchableOpacity>

      {open && (
        <View style={{ marginTop: 12 }}>
          {/* Category tabs */}
          <View style={s.tabRow}>
            {[
              { key: 'tee' as const, label: 'Tee' },
              { key: 'approach' as const, label: 'Approach' },
              { key: 'putting' as const, label: 'Putting' },
            ].map(t => (
              <TouchableOpacity
                key={t.key}
                style={[s.tab, category === t.key && s.tabActive]}
                onPress={() => setCategory(t.key)}
                activeOpacity={0.7}
              >
                <Text style={[s.tabText, category === t.key && s.tabTextActive]}>{t.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {category === 'tee' && <TeeView shots={teeShots} />}
          {category === 'approach' && <ApproachView shots={approachShots} allShots={advancedShots} />}
          {category === 'putting' && <PuttingView putts={putts} allShots={advancedShots} />}
        </View>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  openBtn: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginBottom: 4,
  },
  openBtnText: {
    color: colors.gold,
    fontSize: 16,
    fontWeight: '800',
  },
  tabRow: {
    flexDirection: 'row',
    backgroundColor: '#e5e7eb',
    borderRadius: 10,
    padding: 3,
    marginBottom: 14,
  },
  tab: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
  },
  tabActive: {
    backgroundColor: colors.primary,
  },
  tabText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#4b5563',
  },
  tabTextActive: {
    color: colors.gold,
  },
  chipRow: {
    marginBottom: 10,
  },
  chipLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#6b7280',
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#f3f4f6',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  chipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.gold,
  },
  chipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#4b5563',
  },
  chipTextActive: {
    color: colors.gold,
  },
  section: {
    marginBottom: 18,
    paddingTop: 4,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.primary,
    marginBottom: 8,
  },
  summary: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.primary,
    marginBottom: 4,
  },
  subtle: {
    fontSize: 11,
    color: '#6b7280',
    marginBottom: 4,
  },
  empty: {
    fontSize: 12,
    color: '#9ca3af',
    fontStyle: 'italic',
  },
  legendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 3,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 6,
  },
  legendLabel: {
    fontSize: 12,
    color: '#374151',
    flex: 1,
  },
  legendValue: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primary,
  },
  barRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  barLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.primary,
    width: 90,
  },
  barTrack: {
    flex: 1,
    height: 18,
    backgroundColor: '#f3f4f6',
    borderRadius: 9,
    marginHorizontal: 8,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    backgroundColor: colors.gold,
    borderRadius: 9,
  },
  barValue: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primary,
    width: 70,
    textAlign: 'right',
  },
  metricRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 10,
  },
  metricCard: {
    flex: 1,
    backgroundColor: colors.primary,
    borderRadius: 10,
    padding: 10,
    alignItems: 'center',
  },
  metricNum: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.gold,
  },
  metricLabel: {
    fontSize: 10,
    color: '#fff',
    opacity: 0.85,
    marginTop: 2,
  },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  tableLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.primary,
    width: 60,
  },
  tableMid: {
    fontSize: 11,
    color: '#6b7280',
    width: 60,
    textAlign: 'center',
  },
  tableBarTrack: {
    flex: 1,
    height: 14,
    backgroundColor: '#f3f4f6',
    borderRadius: 7,
    marginHorizontal: 6,
    overflow: 'hidden',
  },
  tableBarFill: {
    height: '100%',
    borderRadius: 7,
  },
  tablePct: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primary,
    width: 40,
    textAlign: 'right',
  },
  statGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  statCell: {
    flexGrow: 1,
    flexBasis: '30%',
    backgroundColor: '#f9fafb',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  statLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#6b7280',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  statValue: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.primary,
  },
  statSub: {
    fontSize: 10,
    color: '#9ca3af',
    marginTop: 1,
  },
  histRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  histLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.primary,
    width: 70,
  },
  histTrack: {
    flex: 1,
    height: 16,
    backgroundColor: '#f3f4f6',
    borderRadius: 8,
    marginHorizontal: 6,
    overflow: 'hidden',
  },
  histFill: {
    height: '100%',
    backgroundColor: colors.gold,
    borderRadius: 8,
  },
  histValue: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.primary,
    width: 80,
    textAlign: 'right',
  },
});