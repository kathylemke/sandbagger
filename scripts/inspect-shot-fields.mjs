import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://wznuxiysfirtcyvfrvdb.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind6bnV4aXlzZmlydGN5dmZydmRiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA5MjUzMjksImV4cCI6MjA3NjUwMTMyOX0.FR9w01MywcooK-Bv9Ly2FWN29YCgG4wDQDLTtIaNzRQ';
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const { data: scores } = await supabase
  .from('sb_hole_scores')
  .select('hole_number, notes')
  .not('notes', 'is', null)
  .limit(20);

const seenKeys = new Set();
const samples = {};

for (const sc of scores || []) {
  try {
    const parsed = JSON.parse(sc.notes);
    if (parsed.mode !== 'advanced' || !Array.isArray(parsed.shots)) continue;
    for (const shot of parsed.shots) {
      for (const k of Object.keys(shot)) {
        seenKeys.add(k);
        if (!samples[k]) samples[k] = shot[k];
      }
    }
  } catch {}
}

console.log('All keys seen in advanced shots:');
console.log([...seenKeys].sort().join(', '));
console.log('\nSample values for each key:');
for (const k of [...seenKeys].sort()) {
  const v = samples[k];
  const display = typeof v === 'string' ? `"${v}"` : JSON.stringify(v);
  console.log(`  ${k}: ${display}`);
}

// Now show specific shot samples for approach shots
console.log('\n--- Sample approach shots (intention=hit_green) ---');
let count = 0;
for (const sc of scores || []) {
  try {
    const parsed = JSON.parse(sc.notes);
    if (parsed.mode !== 'advanced' || !Array.isArray(parsed.shots)) continue;
    for (const shot of parsed.shots) {
      if (shot.intention === 'hit_green' && count < 5) {
        console.log(JSON.stringify(shot, null, 2));
        console.log('---');
        count++;
      }
    }
  } catch {}
}