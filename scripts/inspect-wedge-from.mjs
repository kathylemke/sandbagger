import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://wznuxiysfirtcyvfrvdb.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind6bnV4aXlzZmlydGN5dmZydmRiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA5MjUzMjksImV4cCI6MjA3NjUwMTMyOX0.FR9w01MywcooK-Bv9Ly2FWN29YCgG4wDQDLTtIaNzRQ';
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const { data: scores } = await supabase
  .from('sb_hole_scores')
  .select('hole_number, notes')
  .not('notes', 'is', null);

// Build all shots indexed by hole
const byHole = {};
for (const sc of scores || []) {
  try {
    const p = JSON.parse(sc.notes);
    if (p.mode !== 'advanced' || !Array.isArray(p.shots)) continue;
    if (!byHole[sc.hole_number]) byHole[sc.hole_number] = [];
    for (const sh of p.shots) {
      byHole[sc.hole_number].push({ ...sh, hole_number: sc.hole_number });
    }
  } catch {}
}

// Sort each hole by shot_number
for (const h of Object.keys(byHole)) {
  byHole[h].sort((a, b) => (a.shot_number || 0) - (b.shot_number || 0));
}

console.log('=== 50-degree / GW shots and what their "from" would be ===\n');

// Find all 50-degree / GW / SW / LW shots
const found = [];
for (const h of Object.keys(byHole)) {
  const shots = byHole[h];
  for (let i = 0; i < shots.length; i++) {
    const sh = shots[i];
    const club = String(sh?.club || '').toLowerCase();
    if (!(club.includes('gw') || club.includes('50') || club === 'sw' || club === 'aw')) continue;
    const prev = i > 0 ? shots[i - 1] : null;
    const fromLie = i === 0 ? 'Tee' : (prev?.result_lie || '(none)');
    found.push({
      hole: parseInt(h),
      shot_number: sh.shot_number,
      club: sh.club,
      intention: sh.intention,
      result_lie: sh.result_lie || '(none)',
      miss_direction: sh.miss_direction || '(none)',
      approach_distance: sh.approach_distance,
      from_lie: fromLie,
      prev_shot_club: prev?.club || 'N/A',
      prev_shot_result: prev?.result_lie || 'N/A',
      prev_shot_intention: prev?.intention || 'N/A',
    });
  }
}

console.log(`Found ${found.length} wedge shots\n`);

// Group by from_lie to see distribution
const byFrom = {};
for (const f of found) {
  byFrom[f.from_lie] = (byFrom[f.from_lie] || 0) + 1;
}
console.log('Distribution by "from":');
for (const [k, v] of Object.entries(byFrom).sort((a, b) => b[1] - a[1])) {
  console.log(`  from ${k}: ${v}`);
}
console.log('');

// Show the "from Green" wedge shots specifically (the ones user is complaining about)
const fromGreen = found.filter(f => f.from_lie === 'Green');
console.log(`=== ${fromGreen.length} WEDGE SHOTS WITH from=Green ===\n`);
for (const f of fromGreen) {
  console.log(`Hole ${f.hole}, Shot ${f.shot_number} (${f.club})`);
  console.log(`  intention: ${f.intention}`);
  console.log(`  result_lie: ${f.result_lie}`);
  console.log(`  miss_direction: ${f.miss_direction}`);
  console.log(`  approach_distance: ${f.approach_distance}`);
  console.log(`  PREVIOUS shot: ${f.prev_shot_club}, intention=${f.prev_shot_intention}, result_lie=${f.prev_shot_result}`);
  console.log('');
}