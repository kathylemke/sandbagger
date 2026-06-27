import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://wznuxiysfirtcyvfrvdb.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind6bnV4aXlzZmlydGN5dmZydmRiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA5MjUzMjksImV4cCI6MjA3NjUwMTMyOX0.FR9w01MywcooK-Bv9Ly2FWN29YCgG4wDQDLTtIaNzRQ';
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const { data: scores } = await supabase
  .from('sb_hole_scores')
  .select('hole_number, notes')
  .not('notes', 'is', null);

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

// Look at specific holes that have wedge "from Green" issues
for (const h of ['1', '2', '3', '5', '8', '10']) {
  const shots = (byHole[h] || []).sort((a, b) => (a.shot_number || 0) - (b.shot_number || 0));
  console.log(`\n=== Hole ${h} — ALL SHOTS in order ===`);
  for (let i = 0; i < shots.length; i++) {
    const sh = shots[i];
    console.log(`  Shot ${sh.shot_number}: ${sh.club} | intention=${sh.intention} | result_lie=${sh.result_lie || '(none)'} | miss_dir=${sh.miss_direction || '(none)'}`);
  }
}

// Count wedges where prev shot has same result_lie
console.log('\n\n=== The actual problem ===');
console.log('Counting wedge shots where the previous shot ALSO has result_lie=Green:');
let problemCount = 0;
const problems = [];
for (const h of Object.keys(byHole)) {
  const shots = byHole[h].sort((a, b) => (a.shot_number || 0) - (b.shot_number || 0));
  for (let i = 1; i < shots.length; i++) {
    const cur = shots[i];
    const prev = shots[i - 1];
    const curClub = String(cur?.club || '').toLowerCase();
    const isWedge = curClub.includes('gw') || curClub.includes('sw') || curClub.includes('lw') || curClub.includes('50') || curClub.includes('54') || curClub.includes('58');
    if (!isWedge) continue;
    if (prev?.result_lie === 'Green') {
      problemCount++;
      problems.push({
        hole: cur.hole_number,
        cur_shot: cur.shot_number,
        cur_club: cur.club,
        cur_result: cur.result_lie,
        prev_shot: prev.shot_number,
        prev_club: prev.club,
        prev_result: prev.result_lie,
      });
    }
  }
}
console.log(`Total: ${problemCount} wedge shots with previous shot ending on Green`);
console.log('\nFirst 10 examples:');
for (const p of problems.slice(0, 10)) {
  console.log(`  Hole ${p.hole}: Shot ${p.prev_shot} (${p.prev_club} → ${p.prev_result}) → Shot ${p.cur_shot} (${p.cur_club})`);
}