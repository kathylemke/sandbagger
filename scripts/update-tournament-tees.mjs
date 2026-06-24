#!/usr/bin/env node
/**
 * Replace the previously-approximated tournament tees with the real 2026
 * BlueGolf data:
 *
 *   Metamora Fields: APT 2026 (7,100 yds) + ANNIKA 2026 (6,339 yds)
 *   Weaver Ridge:    APT 2026 (7,025 yds) + AWAPT 2026 (6,373 yds)
 *
 * Source: https://agpts.bluegolf.com/bluegolf/agpt26/event/agpt263/course/...
 *         https://wapt.bluegolf.com/bluegolf/wapt26/event/wapt266/course/...
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

const sbSrc = readFileSync(new URL('../src/lib/supabase.ts', import.meta.url), 'utf8');
const url = sbSrc.match(/SUPABASE_URL\s*=\s*'([^']+)'/)[1];
const key = sbSrc.match(/SUPABASE_ANON_KEY\s*=\s*'([^']+)'/)[1];
const supabase = createClient(url, key);

const METAMORA_ID = 'd0a9b7ad-42c3-4c93-a78c-b48365e9a831';
const WEAVER_ID   = '927b422f-e52b-45ac-a75d-db273a813f84';

// ─── Verified 2026 tournament data (par, yds) ─────────────────────
const METAMORA_APT_2026 = {
  courseId: METAMORA_ID,
  name: 'APT Tournament',
  color: 'Gold',
  total_yardage: 7100,
  total_par: 71,
  rating: 74.1,
  slope: 130,
  holes: [
    { par: 4, yds: 454, hcp: 7  },
    { par: 3, yds: 161, hcp: 17 },
    { par: 5, yds: 558, hcp: 3  },
    { par: 4, yds: 362, hcp: 11 },
    { par: 3, yds: 210, hcp: 15 },
    { par: 5, yds: 603, hcp: 1  },
    { par: 4, yds: 400, hcp: 9  },
    { par: 3, yds: 218, hcp: 13 },
    { par: 4, yds: 467, hcp: 5  },
    { par: 4, yds: 428, hcp: 12 },
    { par: 3, yds: 177, hcp: 18 },
    { par: 5, yds: 564, hcp: 2  },
    { par: 4, yds: 398, hcp: 14 },
    { par: 3, yds: 202, hcp: 16 },
    { par: 4, yds: 452, hcp: 8  },
    { par: 5, yds: 540, hcp: 4  },
    { par: 4, yds: 448, hcp: 10 },
    { par: 4, yds: 458, hcp: 6  },
  ],
};

const METAMORA_ANNIKA_2026 = {
  courseId: METAMORA_ID,
  name: 'ANNIKA WAPT',
  color: 'Blue',
  total_yardage: 6339,
  total_par: 71,
  rating: 69.9,
  slope: 123,
  holes: [
    { par: 4, yds: 388, hcp: 7  },
    { par: 3, yds: 150, hcp: 17 },
    { par: 5, yds: 533, hcp: 3  },
    { par: 4, yds: 336, hcp: 11 },
    { par: 3, yds: 170, hcp: 15 },
    { par: 5, yds: 526, hcp: 1  },
    { par: 4, yds: 338, hcp: 9  },
    { par: 3, yds: 181, hcp: 13 },
    { par: 4, yds: 401, hcp: 5  },
    { par: 4, yds: 399, hcp: 12 },
    { par: 3, yds: 162, hcp: 18 },
    { par: 5, yds: 535, hcp: 2  },
    { par: 4, yds: 357, hcp: 14 },
    { par: 3, yds: 172, hcp: 16 },
    { par: 4, yds: 390, hcp: 8  },
    { par: 5, yds: 510, hcp: 4  },
    { par: 4, yds: 386, hcp: 10 },
    { par: 4, yds: 405, hcp: 6  },
  ],
};

const WEAVER_APT_2026 = {
  courseId: WEAVER_ID,
  name: 'APT Tournament',
  color: 'Gold',
  total_yardage: 7025,
  total_par: 71,
  rating: 73.0,
  slope: 140,
  holes: [
    { par: 5, yds: 540, hcp: 3  },
    { par: 4, yds: 391, hcp: 13 },
    { par: 5, yds: 519, hcp: 7  },
    { par: 3, yds: 182, hcp: 17 },
    { par: 4, yds: 388, hcp: 9  },
    { par: 4, yds: 382, hcp: 5  },
    { par: 4, yds: 435, hcp: 1  },
    { par: 3, yds: 194, hcp: 15 },
    { par: 4, yds: 381, hcp: 11 },
    { par: 4, yds: 418, hcp: 8  },
    { par: 4, yds: 489, hcp: 10 },
    { par: 3, yds: 228, hcp: 12 },
    { par: 4, yds: 432, hcp: 4  },
    { par: 4, yds: 406, hcp: 16 },
    { par: 4, yds: 458, hcp: 2  },
    { par: 4, yds: 439, hcp: 14 },
    { par: 3, yds: 187, hcp: 18 },
    { par: 5, yds: 556, hcp: 6  },
  ],
};

const WEAVER_AWAPT_2026 = {
  courseId: WEAVER_ID,
  name: 'AWAPT Tournament',
  color: 'White',
  total_yardage: 6373,
  total_par: 72,
  rating: 73.0,
  slope: 140,
  holes: [
    { par: 5, yds: 519, hcp: 3  },
    { par: 4, yds: 368, hcp: 13 },
    { par: 5, yds: 479, hcp: 7  },
    { par: 3, yds: 164, hcp: 17 },
    { par: 4, yds: 293, hcp: 9  },
    { par: 4, yds: 361, hcp: 5  },
    { par: 4, yds: 403, hcp: 1  },
    { par: 3, yds: 158, hcp: 15 },
    { par: 4, yds: 364, hcp: 11 },
    { par: 4, yds: 399, hcp: 8  },
    { par: 5, yds: 489, hcp: 10 },
    { par: 3, yds: 184, hcp: 12 },
    { par: 4, yds: 358, hcp: 4  },
    { par: 4, yds: 364, hcp: 16 },
    { par: 4, yds: 404, hcp: 2  },
    { par: 4, yds: 392, hcp: 14 },
    { par: 3, yds: 169, hcp: 18 },
    { par: 5, yds: 505, hcp: 6  },
  ],
};

async function deleteExistingTournamentTees() {
  // Find all tournament-named tees
  const { data: existing } = await supabase
    .from('sb_tee_sets')
    .select('id, name, course_id')
    .in('name', ['APT Tournament', 'ANNIKA WAPT', 'AWAPT Tournament']);
  if (!existing || existing.length === 0) return;

  for (const tee of existing) {
    // Delete tee_holes first
    await supabase.from('sb_tee_holes').delete().eq('tee_set_id', tee.id);
    // Delete the tee_set
    await supabase.from('sb_tee_sets').delete().eq('id', tee.id);
    console.log(`  Deleted: ${tee.name} (${tee.id})`);
  }
}

async function insertTournamentTee(spec) {
  const { data: teeSet, error: teeError } = await supabase
    .from('sb_tee_sets')
    .insert({
      course_id: spec.courseId,
      color: spec.color,
      name: spec.name,
      total_yardage: spec.total_yardage,
      total_par: spec.total_par,
      rating: spec.rating,
      slope: spec.slope,
    })
    .select()
    .single();
  if (teeError) throw new Error(`Insert tee ${spec.name}: ${teeError.message}`);

  const rows = spec.holes.map((h, i) => ({
    tee_set_id: teeSet.id,
    hole_number: i + 1,
    yardage: h.yds,
    par: h.par,
    handicap_index: h.hcp,
  }));
  const { error: holesError } = await supabase.from('sb_tee_holes').insert(rows);
  if (holesError) throw new Error(`Insert tee_holes for ${spec.name}: ${holesError.message}`);

  const ydsSum = rows.reduce((s, r) => s + r.yardage, 0);
  const parSum = rows.reduce((s, r) => s + r.par, 0);
  console.log(`  ✓ ${spec.name.padEnd(18)} ${spec.total_yardage} yds (sum=${ydsSum}), Par ${parSum}, ${spec.rating}/${spec.slope}`);
}

async function main() {
  console.log('Deleting previously-approximated tournament tees...');
  await deleteExistingTournamentTees();

  console.log('\nInserting verified 2026 tournament tees (from BlueGolf):');
  await insertTournamentTee(METAMORA_APT_2026);
  await insertTournamentTee(METAMORA_ANNIKA_2026);
  await insertTournamentTee(WEAVER_APT_2026);
  await insertTournamentTee(WEAVER_AWAPT_2026);

  console.log('\n✅ All 4 tournament tees updated with verified hole-by-hole data.');
}

main().catch(e => { console.error('FAILED:', e); process.exit(1); });