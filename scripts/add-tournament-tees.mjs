#!/usr/bin/env node
/**
 * Add tournament-specific APT and ANNIKA WAPT tees to Metamora Fields
 * and Weaver Ridge for the OSF Healthcare Children's Hospital of
 * Illinois Championship.
 *
 * IMPORTANT: BlueGolf (the official source) blocks web scraping. I could
 * only verify TOTALS from search snippets, not hole-by-hole yardages.
 *
 * Approach:
 *   1. Verified totals go in as-is (yardage, rating, slope, par)
 *   2. Hole-by-hole yardages are COPIED from the closest standard tee as
 *      a starting approximation — user MUST verify against the official
 *      yardage book they receive at check-in ($30, per 2024 player info)
 *
 * Data sources:
 *   - Weaver Ridge APT 2025:   BlueGolf snippet "APT 2025 (6,882 yds - Par 71) ... 73.0/140"
 *   - Metamora ANNIKA 2025:    BlueGolf snippet "ANNIKA 2025 (6,339 yds - Par 71)"
 *   - Metamora APT (no 2025 tees different from standard Gold for APT at Metamora)
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

const sbSrc = readFileSync(new URL('../src/lib/supabase.ts', import.meta.url), 'utf8');
const url = sbSrc.match(/SUPABASE_URL\s*=\s*'([^']+)'/)[1];
const key = sbSrc.match(/SUPABASE_ANON_KEY\s*=\s*'([^']+)'/)[1];
const supabase = createClient(url, key);

const METAMORA_ID = 'd0a9b7ad-42c3-4c93-a78c-b48365e9a831';
const WEAVER_ID   = '927b422f-e52b-45ac-a75d-db273a813f84';

// Pull existing standard tee_holes data to use as approximations
async function getExistingTeeHoles(teeSetName, courseId) {
  const { data: teeSet } = await supabase
    .from('sb_tee_sets')
    .select('id')
    .eq('course_id', courseId)
    .eq('name', teeSetName)
    .single();
  if (!teeSet) throw new Error(`No tee_set found: ${teeSetName} on ${courseId}`);

  const { data: holes } = await supabase
    .from('sb_tee_holes')
    .select('hole_number, yardage, par, handicap_index')
    .eq('tee_set_id', teeSet.id)
    .order('hole_number');
  return holes;
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
  if (error) throw new Error(`Insert tee ${tee.name}: ${error.message}`);
  return data;
}

async function insertTeeHoles(teeSetId, holes) {
  const rows = holes.map(h => ({
    tee_set_id: teeSetId,
    hole_number: h.hole_number,
    yardage: h.yardage,
    par: h.par,
    handicap_index: h.handicap_index,
  }));
  const { error } = await supabase.from('sb_tee_holes').insert(rows);
  if (error) throw new Error(`Insert tee_holes: ${error.message}`);
}

async function main() {
  // ─────────────────────────────────────────────────────────────
  // METAMORA FIELDS - Tournament tees
  // ─────────────────────────────────────────────────────────────

  // APT at Metamora uses the standard Gold tee (verified 2024 BlueGolf)
  const metamoraGold = await getExistingTeeHoles('Championship', METAMORA_ID);

  const metamoraApt = await insertTeeSet(METAMORA_ID, {
    color: 'Gold',
    name: 'APT Tournament',
    total_yardage: 7100,
    total_par: 71,
    rating: 74.1,
    slope: 130,
  });
  await insertTeeHoles(metamoraApt.id, metamoraGold);
  console.log(`✓ Metamora Fields - APT Tournament: 7,100 yds (copied from Gold standard tee)`);

  // WAPT at Metamora: ANNIKA 2025 = 6,339 yds Par 71 (verified)
  // Approximate from Blue tee (6,209 yds) — user MUST verify per hole
  const metamoraBlue = await getExistingTeeHoles('Blue', METAMORA_ID);
  // Scale each hole up proportionally: 6339/6209 = 1.0209
  const scaledMetamoraWapt = metamoraBlue.map(h => ({
    ...h,
    yardage: Math.round(h.yardage * (6339 / 6209)),
  }));
  // Adjust to hit exactly 6339 (round one hole up or down)
  const sum = scaledMetamoraWapt.reduce((s, h) => s + h.yardage, 0);
  if (sum !== 6339) scaledMetamoraWapt[0].yardage += (6339 - sum);

  const metamoraWapt = await insertTeeSet(METAMORA_ID, {
    color: 'Blue',
    name: 'ANNIKA WAPT',
    total_yardage: 6339,
    total_par: 71,
    rating: null, // not verified
    slope: null,  // not verified
  });
  await insertTeeHoles(metamoraWapt.id, scaledMetamoraWapt);
  console.log(`✓ Metamora Fields - ANNIKA WAPT: 6,339 yds (scaled from Blue standard tee, ⚠️  verify)`);

  // ─────────────────────────────────────────────────────────────
  // WEAVER RIDGE - Tournament tees
  // ─────────────────────────────────────────────────────────────

  // APT at Weaver Ridge: APT 2025 = 6,882 yds Par 71, 73.0/140 (verified)
  // Approximate from Gold tee (6,876 yds) — extremely close!
  const weaverGold = await getExistingTeeHoles('Championship', WEAVER_ID);
  // Scale: 6882/6876 = 1.00087, very small adjustment
  const scaledWeaverApt = weaverGold.map(h => ({
    ...h,
    yardage: Math.round(h.yardage * (6882 / 6876)),
  }));
  const sumWeaver = scaledWeaverApt.reduce((s, h) => s + h.yardage, 0);
  if (sumWeaver !== 6882) scaledWeaverApt[0].yardage += (6882 - sumWeaver);

  const weaverApt = await insertTeeSet(WEAVER_ID, {
    color: 'Gold',
    name: 'APT Tournament',
    total_yardage: 6882,
    total_par: 71,
    rating: 73.0,
    slope: 140,
  });
  await insertTeeHoles(weaverApt.id, scaledWeaverApt);
  console.log(`✓ Weaver Ridge - APT Tournament: 6,882 yds (scaled from Gold standard tee)`);

  // WAPT at Weaver Ridge: NO VERIFIED TOTAL — cannot insert safely.
  // The user must look this up in BlueGolf or their yardage book.
  console.log('\n⚠️  SKIPPED: Weaver Ridge ANNIKA WAPT tee — no verified total from public sources.');
  console.log('   User needs to add this manually using the in-app "Add Tee" UI once they have the yardage book.');

  console.log('\n✅ Tournament tees added.');
  console.log('\n⚠️  IMPORTANT: Per-hole yardages are APPROXIMATIONS.');
  console.log('   Verify against the official $30 yardage book at check-in.');
}

main().catch(e => { console.error('FAILED:', e); process.exit(1); });
