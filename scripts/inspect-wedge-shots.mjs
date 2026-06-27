import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://wznuxiysfirtcyvfrvdb.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind6bnV4aXlzZmlydGN5dmZydmRiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA5MjUzMjksImV4cCI6MjA3NjUwMTMyOX0.FR9w01MywcooK-Bv9Ly2FWN29YCgG4wDQDLTtIaNzRQ';
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const { data: scores } = await supabase
  .from('sb_hole_scores')
  .select('hole_number, notes')
  .not('notes', 'is', null);

const allShots = [];
for (const sc of scores || []) {
  try {
    const parsed = JSON.parse(sc.notes);
    if (parsed.mode !== 'advanced' || !Array.isArray(parsed.shots)) continue;
    for (const shot of parsed.shots) {
      allShots.push({ ...shot, hole_number: sc.hole_number });
    }
  } catch {}
}

// Find all shots with club = "50°" or similar wedge
const wedges = allShots.filter(sh => {
  const c = String(sh?.club || '').toLowerCase();
  return c.includes('50') || c.includes('wedge') || c === 'gw' || c === 'sw' || c === 'pw';
});

console.log(`Found ${wedges.length} wedge shots`);

// For each wedge shot, show its key data
for (const sh of wedges) {
  const nextShot = allShots
    .filter(s => s.hole_number === sh.hole_number && s.shot_number > sh.shot_number)
    .sort((a, b) => a.shot_number - b.shot_number)[0];

  const isNextPutt = nextShot && (
    nextShot.is_putt || nextShot.putt_result || nextShot.putt_distance ||
    nextShot.putt_break || nextShot.putt_hit_line || nextShot.putt_hit_speed
  );

  console.log(`\n--- Hole ${sh.hole_number}, Shot ${sh.shot_number} (${sh.club}) ---`);
  console.log(`  intention: ${sh.intention}`);
  console.log(`  result_lie: ${sh.result_lie}`);
  console.log(`  miss_direction: ${sh.miss_direction}`);
  console.log(`  approach_distance: ${sh.approach_distance}`);
  console.log(`  distance_to_hole: ${sh.distance_to_hole || '(none)'}`);
  console.log(`  next shot exists: ${!!nextShot}`);
  if (nextShot) {
    console.log(`  next shot club: ${nextShot.club}`);
    console.log(`  next shot is putt: ${isNextPutt}`);
    console.log(`  next shot putt_distance: ${nextShot.putt_distance || '(none)'}`);
    console.log(`  next shot approach_distance: ${nextShot.approach_distance || '(none)'}`);
  }
}