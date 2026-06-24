#!/usr/bin/env node
/**
 * Add Metamora Fields + Weaver Ridge for OSF Healthcare Children's Hospital of
 * Illinois Championship (June 24-27, 2026).
 *
 * Both courses are played by APT (men) and ANNIKA WAPT (women).
 * Inserts: 2 courses, 36 holes, 10 tee_sets, 360 tee_holes.
 *
 * Data sources:
 *   - Metamora Fields: GolfPass scorecard
 *   - Weaver Ridge:    GolfPass + BlueGolf scorecards
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

// Read anon key from src/lib/supabase.ts — sb_courses / sb_holes / sb_tee_sets /
// sb_tee_holes all have "allow all" RLS policies, so any client can write.
const sbSrc = readFileSync(new URL('../src/lib/supabase.ts', import.meta.url), 'utf8');
const urlMatch = sbSrc.match(/SUPABASE_URL\s*=\s*'([^']+)'/);
const keyMatch = sbSrc.match(/SUPABASE_ANON_KEY\s*=\s*'([^']+)'/);
if (!urlMatch || !keyMatch) {
  console.error('Could not read Supabase URL/key from src/lib/supabase.ts');
  process.exit(1);
}
const SUPABASE_URL = urlMatch[1];
const SUPABASE_KEY = keyMatch[1];

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// ──────────────────────────────────────────────────────────────────
// METAMORA FIELDS GOLF CLUB
// 801 Progress Street, Metamora, IL 61548
// Architects: D.A. Weibring + Steve Wolfard (2011)
// Par 71, 7100 yds from tips
// ──────────────────────────────────────────────────────────────────
const METAMORA_HOLES = [
  { par: 4, hcp: 7,  gold: 454, black: 420, blue: 388, white: 378, red: 344 },
  { par: 3, hcp: 17, gold: 161, black: 140, blue: 121, white: 113, red: 105 },
  { par: 5, hcp: 3,  gold: 558, black: 533, blue: 523, white: 471, red: 388 },
  { par: 4, hcp: 11, gold: 362, black: 336, blue: 326, white: 307, red: 236 },
  { par: 3, hcp: 15, gold: 210, black: 184, blue: 170, white: 160, red: 122 },
  { par: 5, hcp: 1,  gold: 603, black: 586, blue: 526, white: 516, red: 439 },
  { par: 4, hcp: 9,  gold: 400, black: 374, blue: 338, white: 328, red: 277 },
  { par: 3, hcp: 13, gold: 218, black: 198, blue: 181, white: 171, red: 150 },
  { par: 4, hcp: 5,  gold: 467, black: 452, blue: 427, white: 395, red: 340 },
  { par: 4, hcp: 12, gold: 428, black: 402, blue: 392, white: 336, red: 306 },
  { par: 3, hcp: 18, gold: 177, black: 162, blue: 152, white: 136, red: 101 },
  { par: 5, hcp: 2,  gold: 564, black: 536, blue: 485, white: 475, red: 397 },
  { par: 4, hcp: 14, gold: 398, black: 359, blue: 344, white: 305, red: 246 },
  { par: 3, hcp: 16, gold: 202, black: 189, blue: 164, white: 138, red: 112 },
  { par: 4, hcp: 8,  gold: 452, black: 423, blue: 385, white: 375, red: 302 },
  { par: 5, hcp: 4,  gold: 540, black: 514, blue: 504, white: 460, red: 450 },
  { par: 4, hcp: 10, gold: 448, black: 415, blue: 382, white: 352, red: 292 },
  { par: 4, hcp: 6,  gold: 458, black: 440, blue: 401, white: 377, red: 332 },
];

const METAMORA_TEES = [
  { color: 'Gold',  name: 'Championship',  gender: 'M', total_yardage: 7100, total_par: 71, rating: 74.1, slope: 130 },
  { color: 'Black', name: 'Black',         gender: 'M', total_yardage: 6663, total_par: 71, rating: 72.1, slope: 125 },
  { color: 'Blue',  name: 'Blue',          gender: 'M', total_yardage: 6209, total_par: 71, rating: 70.0, slope: 120 },
  { color: 'White', name: 'White',         gender: 'M', total_yardage: 5793, total_par: 71, rating: 68.1, slope: 115 },
  { color: 'Red',   name: 'Red',           gender: 'W', total_yardage: 4939, total_par: 71, rating: 68.3, slope: 115 },
];

// ──────────────────────────────────────────────────────────────────
// WEAVER RIDGE GOLF CLUB
// 5100 Weaver Ridge Blvd, Peoria, IL 61615
// Architects: Dr. Michael Hurdzan + Dana Fry (1997)
// Par 72
// ──────────────────────────────────────────────────────────────────
const WEAVER_HOLES = [
  { par: 5, hcp: 3,  gold: 535, black: 508, green: 500, white: 454, red: 416 },
  { par: 4, hcp: 13, gold: 385, black: 365, green: 351, white: 254, red: 241 },
  { par: 5, hcp: 7,  gold: 514, black: 494, green: 475, white: 449, red: 372 },
  { par: 3, hcp: 17, gold: 182, black: 163, green: 146, white: 124, red: 101 },
  { par: 4, hcp: 9,  gold: 382, black: 290, green: 290, white: 281, red: 232 },
  { par: 4, hcp: 5,  gold: 382, black: 357, green: 331, white: 306, red: 268 },
  { par: 4, hcp: 1,  gold: 428, black: 401, green: 385, white: 372, red: 300 },
  { par: 3, hcp: 15, gold: 194, black: 171, green: 152, white: 131, red: 116 },
  { par: 4, hcp: 11, gold: 376, black: 357, green: 340, white: 329, red: 307 },
  { par: 4, hcp: 8,  gold: 413, black: 387, green: 367, white: 341, red: 313 },
  { par: 5, hcp: 10, gold: 489, black: 447, green: 406, white: 384, red: 355 },
  { par: 3, hcp: 12, gold: 223, black: 195, green: 180, white: 153, red: 145 },
  { par: 4, hcp: 4,  gold: 427, black: 359, green: 349, white: 323, red: 308 },
  { par: 4, hcp: 16, gold: 362, black: 313, green: 310, white: 276, red: 270 },
  { par: 4, hcp: 2,  gold: 449, black: 424, green: 390, white: 361, red: 320 },
  { par: 4, hcp: 14, gold: 401, black: 375, green: 353, white: 321, red: 301 },
  { par: 3, hcp: 18, gold: 178, black: 168, green: 148, white: 148, red: 102 },
  { par: 5, hcp: 6,  gold: 556, black: 506, green: 465, white: 435, red: 424 },
];

const WEAVER_TEES = [
  { color: 'Gold',  name: 'Championship',  gender: 'M', total_yardage: 6876, total_par: 72, rating: 73.0, slope: 140 },
  { color: 'Black', name: 'Black',         gender: 'M', total_yardage: 6280, total_par: 72, rating: 70.2, slope: 134 },
  { color: 'Green', name: 'Green',         gender: 'M', total_yardage: 5938, total_par: 72, rating: 68.7, slope: 130 },
  { color: 'White', name: 'White',         gender: 'M', total_yardage: 5442, total_par: 72, rating: 66.4, slope: 125 },
  { color: 'Red',   name: 'Red',           gender: 'W', total_yardage: 4891, total_par: 72, rating: 63.9, slope: 118 },
];

const YARDAGE_BY_TEE = {
  Gold:  'gold',
  Black: 'black',
  Blue:  'blue',
  Green: 'green',
  White: 'white',
  Red:   'red',
};

async function insertCourse(course) {
  const { data, error } = await supabase
    .from('sb_courses')
    .insert(course)
    .select()
    .single();
  if (error) throw new Error(`Insert course ${course.name}: ${error.message}`);
  return data;
}

async function insertHoles(courseId, holes, parField) {
  const rows = holes.map((h, i) => ({
    course_id: courseId,
    hole_number: i + 1,
    par: h.par,
    distance_yards: h[parField],
    shape: 'straight',
    hazards: [],
    notes: '',
  }));
  const { error } = await supabase.from('sb_holes').insert(rows);
  if (error) throw new Error(`Insert holes for ${courseId}: ${error.message}`);
  return rows;
}

async function insertTeeSet(courseId, tee) {
  const { data, error } = await supabase
    .from('sb_tee_sets')
    .insert({
      course_id: courseId,
      color: tee.color,
      name: tee.name,
      total_yardage: tee.total_yardage,
      total_par: tee.total_par,
      rating: tee.rating,
      slope: tee.slope,
    })
    .select()
    .single();
  if (error) throw new Error(`Insert tee ${tee.color}: ${error.message}`);
  return data;
}

async function insertTeeHoles(teeSetId, tee, holes) {
  const yardageField = YARDAGE_BY_TEE[tee.color];
  if (!yardageField) throw new Error(`Unknown tee color ${tee.color}`);
  const rows = holes.map((h, i) => ({
    tee_set_id: teeSetId,
    hole_number: i + 1,
    yardage: h[yardageField],
    par: h.par,
    handicap_index: h.hcp,
  }));
  const { error } = await supabase.from('sb_tee_holes').insert(rows);
  if (error) throw new Error(`Insert tee_holes for ${tee.color}: ${error.message}`);
}

async function main() {
  console.log('Inserting Metamora Fields Golf Club...');
  const metamora = await insertCourse({
    name: 'Metamora Fields Golf Club',
    city: 'Metamora',
    state: 'IL',
    country: 'US',
    num_holes: 18,
  });
  console.log(`  Course ID: ${metamora.id}`);

  await insertHoles(metamora.id, METAMORA_HOLES, 'gold');
  console.log(`  Inserted 18 holes (par ${METAMORA_HOLES.reduce((s, h) => s + h.par, 0)})`);

  for (const tee of METAMORA_TEES) {
    const ts = await insertTeeSet(metamora.id, tee);
    await insertTeeHoles(ts.id, tee, METAMORA_HOLES);
    console.log(`  ${tee.color.padEnd(6)} tee: ${tee.total_yardage} yds, ${tee.rating}/${tee.slope}`);
  }

  console.log('\nInserting Weaver Ridge Golf Club...');
  const weaver = await insertCourse({
    name: 'Weaver Ridge Golf Club',
    city: 'Peoria',
    state: 'IL',
    country: 'US',
    num_holes: 18,
  });
  console.log(`  Course ID: ${weaver.id}`);

  await insertHoles(weaver.id, WEAVER_HOLES, 'gold');
  console.log(`  Inserted 18 holes (par ${WEAVER_HOLES.reduce((s, h) => s + h.par, 0)})`);

  for (const tee of WEAVER_TEES) {
    const ts = await insertTeeSet(weaver.id, tee);
    await insertTeeHoles(ts.id, tee, WEAVER_HOLES);
    console.log(`  ${tee.color.padEnd(6)} tee: ${tee.total_yardage} yds, ${tee.rating}/${tee.slope}`);
  }

  console.log('\n✅ Done.');
  console.log(`\nMetamora Fields UUID: ${metamora.id}`);
  console.log(`Weaver Ridge UUID:   ${weaver.id}`);
}

main().catch(err => { console.error('FAILED:', err); process.exit(1); });
