import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
const sb = readFileSync(new URL('../src/lib/supabase.ts', import.meta.url), 'utf8');
const url = sb.match(/SUPABASE_URL\s*=\s*'([^']+)'/)[1];
const key = sb.match(/SUPABASE_ANON_KEY\s*=\s*'([^']+)'/)[1];
const s = createClient(url, key);

const { data: courses } = await s.from('sb_courses').select('id,name,city,num_holes').in('name', ['Metamora Fields Golf Club','Weaver Ridge Golf Club']);
console.log('Courses:', JSON.stringify(courses, null, 2));

for (const c of courses || []) {
  const { data: tees } = await s.from('sb_tee_sets').select('id,color,total_yardage,rating,slope').eq('course_id', c.id).order('total_yardage', { ascending: false });
  const teeIds = tees?.map(t => t.id) || [];
  const { data: teeHoles } = await s.from('sb_tee_holes').select('tee_set_id,hole_number,yardage,par,handicap_index').in('tee_set_id', teeIds).order('hole_number');
  console.log(`\n${c.name} (${c.num_holes} holes):`);
  console.log(`  Tees: ${tees?.length}`);
  for (const t of tees || []) {
    const h = teeHoles?.filter(x => x.tee_set_id === t.id) || [];
    const totalYards = h.reduce((sum, x) => sum + (x.yardage||0), 0);
    console.log(`    ${t.color.padEnd(6)}: ${h.length} holes, sum=${totalYards} yds, rating/slope=${t.rating}/${t.slope}`);
  }
  const { data: holes } = await s.from('sb_holes').select('hole_number,par,distance_yards').eq('course_id', c.id).order('hole_number');
  const totalPar = holes?.reduce((sum, x) => sum + x.par, 0);
  console.log(`  Course holes: ${holes?.length}, par sum=${totalPar}`);
}
