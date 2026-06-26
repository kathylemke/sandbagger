import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://wznuxiysfirtcyvfrvdb.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind6bnV4aXlzZmlydGN5dmZydmRiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA5MjUzMjksImV4cCI6MjA3NjUwMTMyOX0.FR9w01MywcooK-Bv9Ly2FWN29YCgG4wDQDLTtIaNzRQ';
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const USER_ID = 'c558af9c-3107-4f96-9d83-af0106e8b2be';

// Check what columns exist on sb_rounds
const { data: cols } = await supabase
  .from('sb_rounds')
  .select('*')
  .eq('user_id', USER_ID)
  .order('created_at', { ascending: false })
  .limit(3);

console.log('Recent rounds (any state):');
for (const r of cols || []) {
  console.log(JSON.stringify(r, null, 2));
  console.log('---');
}

console.log('\nLooking for rounds with any partial state (no total_score, or is_complete != true):');
const { data: partial } = await supabase
  .from('sb_rounds')
  .select('id, date_played, total_score, is_complete, created_at, updated_at')
  .eq('user_id', USER_ID)
  .order('created_at', { ascending: false })
  .limit(10);

for (const r of partial || []) {
  const incomplete = r.is_complete === false || r.is_complete === null;
  const noScore = r.total_score == null;
  if (incomplete || noScore) {
    console.log(`  POTENTIAL: id=${r.id} created=${r.created_at} complete=${r.is_complete} score=${r.total_score}`);
  }
}