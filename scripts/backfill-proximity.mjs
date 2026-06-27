import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const SUPABASE_URL = 'https://wznuxiysfirtcyvfrvdb.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind6bnV4aXlzZmlydGN5dmZydmRiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA5MjUzMjksImV4cCI6MjA3NjUwMTMyOX0.FR9w01MywcooK-Bv9Ly2FWN29YCgG4wDQDLTtIaNzRQ';
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

function isPutt(shot) {
  if (!shot) return false;
  return !!shot.is_putt || !!shot.putt_result || !!shot.putt_break || !!shot.putt_distance || !!shot.putt_hit_line || !!shot.putt_hit_speed || !!shot.putt_slope;
}

function safeNum(v) {
  if (v == null || v === '') return null;
  const n = parseFloat(v);
  return Number.isFinite(n) ? n : null;
}

function computeProximity(shot, next) {
  // Returns { value, unit } or null

  // For putts at end of hole:
  //   made → 0 feet (in the hole)
  //   missed → putt_distance_remaining (feet)
  if (!next && isPutt(shot)) {
    const result = String(shot.putt_result || '');
    if (result === 'made') {
      return { value: 0, unit: 'feet', source: 'putt_made' };
    }
    if (result && result !== 'made') {
      const rem = safeNum(shot.putt_distance_remaining);
      if (rem != null) return { value: rem, unit: 'feet', source: 'putt_missed_remaining' };
    }
    return null;
  }

  // Next shot is a putt — its putt_distance (feet) is the proximity of this shot.
  // Since we're putting from there, this shot hit the green (or fringe) → FEET.
  if (next && isPutt(next)) {
    const pd = safeNum(next.putt_distance);
    if (pd != null && pd > 0) return { value: pd, unit: 'feet', source: 'next_putt_distance' };
    return null;
  }

  // Next shot is another approach — its approach_distance (yards) is the proximity.
  // Since we're hitting another approach from there, this shot missed the green → YARDS.
  if (next && !isPutt(next)) {
    const ad = safeNum(next.approach_distance);
    if (ad != null && ad > 0) return { value: ad, unit: 'yards', source: 'next_approach_distance' };
    return null;
  }

  return null;
}

console.log('=== Advanced Stats Proximity Backfill ===\n');

// Step 1: Get all hole_scores with advanced shots
const { data: scores, error: fetchErr } = await supabase
  .from('sb_hole_scores')
  .select('id, hole_number, notes')
  .not('notes', 'is', null);

if (fetchErr) {
  console.error('Fetch error:', fetchErr);
  process.exit(1);
}

console.log(`Fetched ${scores.length} hole_scores rows\n`);

// Step 2: Process each row, identify backfill candidates
const backup = [];
const updates = []; // { id, newNotes }
const changeLog = []; // { id, hole, shot, club, proximity, unit, source }

let totalShots = 0;
let totalPuttShots = 0;
let totalWithProx = 0;
let totalToBackfill = 0;
let totalSkipped = 0;
let totalUpdated = 0;
let totalAlreadyHad = 0;

for (const sc of scores) {
  let parsed;
  try {
    parsed = JSON.parse(sc.notes);
  } catch {
    continue;
  }
  if (!parsed || parsed.mode !== 'advanced' || !Array.isArray(parsed.shots)) continue;

  // Backup original
  backup.push({ id: sc.id, hole_number: sc.hole_number, original_notes: sc.notes });

  let modified = false;
  const newShots = parsed.shots.map((shot, idx) => {
    if (!shot || typeof shot !== 'object') return shot;
    totalShots++;
    if (isPutt(shot)) totalPuttShots++;

    // Skip if already has distance_to_hole
    const existing = safeNum(shot.distance_to_hole);
    if (existing != null) {
      totalWithProx++;
      totalAlreadyHad++;
      return shot;
    }

    const next = idx + 1 < parsed.shots.length ? parsed.shots[idx + 1] : null;
    const prox = computeProximity(shot, next);

    if (!prox) {
      totalSkipped++;
      return shot;
    }

    totalToBackfill++;
    modified = true;
    changeLog.push({
      id: sc.id,
      hole: sc.hole_number,
      shot_number: shot.shot_number,
      club: shot.club || '',
      intention: shot.intention || '',
      result_lie: shot.result_lie || '',
      proximity: prox.value,
      unit: prox.unit,
      source: prox.source,
    });
    return { ...shot, distance_to_hole: String(prox.value) };
  });

  if (modified) {
    updates.push({
      id: sc.id,
      hole_number: sc.hole_number,
      newNotes: JSON.stringify({ ...parsed, shots: newShots }),
    });
  }
}

// Save backup
const backupPath = `proximity-backfill-backup-${Date.now()}.json`;
fs.writeFileSync(backupPath, JSON.stringify(backup, null, 2));
console.log(`Backup saved: ${backupPath} (${backup.length} rows)\n`);

// Print dry-run summary
console.log('=== DRY RUN SUMMARY ===');
console.log(`Total advanced shots:        ${totalShots}`);
console.log(`  Putt shots:                ${totalPuttShots}`);
console.log(`  Non-putt shots:            ${totalShots - totalPuttShots}`);
console.log(`Already had proximity:       ${totalAlreadyHad}`);
console.log(`Will be backfilled:          ${totalToBackfill}`);
console.log(`Will be skipped (no data):   ${totalSkipped}`);
console.log(`Total rows to UPDATE:        ${updates.length}\n`);

// Break down by source
const bySource = {};
for (const c of changeLog) {
  bySource[c.source] = (bySource[c.source] || 0) + 1;
}
console.log('Backfill breakdown by source:');
for (const [src, n] of Object.entries(bySource).sort((a, b) => b[1] - a[1])) {
  console.log(`  ${src.padEnd(28)} ${n}`);
}
console.log('');

// Show a few examples
console.log('=== Sample backfills (first 15) ===');
for (const c of changeLog.slice(0, 15)) {
  console.log(`  Hole ${c.hole}, Shot ${c.shot_number} (${c.club}, ${c.intention}${c.result_lie ? ', ' + c.result_lie : ''}): ${c.proximity} ${c.unit}  [${c.source}]`);
}
console.log('');

// Step 3: Apply updates
console.log('=== APPLYING UPDATES ===');
for (const u of updates) {
  const { error } = await supabase
    .from('sb_hole_scores')
    .update({ notes: u.newNotes })
    .eq('id', u.id);

  if (error) {
    console.error(`  FAILED row ${u.id} (hole ${u.hole_number}):`, error.message);
  } else {
    totalUpdated++;
    if (totalUpdated <= 5 || totalUpdated % 20 === 0) {
      console.log(`  Updated row ${u.id} (hole ${u.hole_number})`);
    }
  }
}

console.log(`\n=== COMPLETE ===`);
console.log(`Successfully updated: ${totalUpdated} / ${updates.length} rows`);
console.log(`Total proximity values written: ${totalToBackfill}`);
console.log(`\nIf anything went wrong, restore from: ${backupPath}`);
console.log('(Contains all original notes for every row that was touched.)');