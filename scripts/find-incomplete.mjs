import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://wznuxiysfirtcyvfrvdb.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind6bnV4aXlzZmlydGN5dmZydmRiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA5MjUzMjksImV4cCI6MjA3NjUwMTMyOX0.FR9w01MywcooK-Bv9Ly2FWN29YCgG4wDQDLTtIaNzRQ';
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const USER_ID = 'c558af9c-3107-4f96-9d83-af0106e8b2be';

// Find all incomplete rounds for this user, most recent first
const { data: rounds, error } = await supabase
  .from('sb_rounds')
  .select('id, date_played, total_score, is_complete, created_at')
  .eq('user_id', USER_ID)
  .eq('is_complete', false)
  .order('created_at', { ascending: false });

if (error) {
  console.error('Error:', error);
  process.exit(1);
}

console.log(`Found ${rounds?.length || 0} incomplete rounds:`);
for (const r of rounds || []) {
  console.log(`  - id: ${r.id}`);
  console.log(`    created: ${r.created_at}`);
  console.log(`    date: ${r.date_played}`);
  console.log(`    score: ${r.total_score}`);
  console.log(`    course: ${r.course_name || '(none)'}`);
}