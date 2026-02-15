#!/usr/bin/env node
/**
 * Generate hole-metadata.json for all Sandbagger courses.
 *
 * Compact notation per hole:
 *   [shape, fw_width, elevation, green_shape, hazards_shorthand]
 *
 * Shape: S=straight, DL=dogleg_left, DR=dogleg_right, DD=double_dogleg
 * FW width: N=<30 yds, M=30-50 yds, W=>50 yds
 * Elevation: U=uphill, D=downhill, F=flat, X=undulating
 * Green shape: R=round, O=oval, K=kidney, T=tiered, LN=long_narrow, WS=wide_shallow
 *
 * Hazards shorthand: "FB-L-250,GB-FL,W-R-150"
 *   Type: FB=fairway_bunker, GB=greenside_bunker, W=water, WA=waste_area, OB=ob, T=trees, FC=forced_carry
 *   Position: L=left, R=right, C=center, F=front, B=back, FL=front_left, FR=front_right, BL=back_left, BR=back_right, S=surrounds
 *   Number = distance_from_tee (for FB/T/W/WA/OB/FC) or distance_from_green (for GB)
 */

const fs = require('fs');
const path = require('path');

// Expand helpers
const SHAPE_MAP = { S: 'straight', DL: 'dogleg_left', DR: 'dogleg_right', DD: 'double_dogleg' };
const FW_MAP = { N: '<30 yds', M: '30-50 yds', W: '>50 yds' };
const ELEV_MAP = { U: 'uphill', D: 'downhill', F: 'flat', X: 'undulating' };
const GREEN_MAP = { R: 'round', O: 'oval', K: 'kidney', T: 'tiered', LN: 'long_narrow', WS: 'wide_shallow' };
const HAZARD_MAP = { FB: 'fairway_bunker', GB: 'greenside_bunker', W: 'water', WA: 'waste_area', OB: 'ob', T: 'trees', FC: 'forced_carry' };
const LOC_MAP = { L: 'left', R: 'right', C: 'center', F: 'front', B: 'back', FL: 'front_left', FR: 'front_right', BL: 'back_left', BR: 'back_right', S: 'surrounds' };

function expandHazards(str) {
  if (!str) return [];
  return str.split(',').map(h => {
    const parts = h.trim().split('-');
    const type = HAZARD_MAP[parts[0]] || parts[0];
    const location = LOC_MAP[parts[1]] || parts[1];
    const dist = parts[2] ? parseInt(parts[2]) : undefined;
    const hazard = { type };
    if (parts[0] === 'FC') {
      hazard.location = 'front';
      // FC-150 means carry_distance=150 (second part is distance, not location)
      const fcDist = parts[1] ? parseInt(parts[1]) : undefined;
      if (fcDist && !isNaN(fcDist)) hazard.carry_distance = fcDist;
    } else {
      hazard.location = location;
      if (dist) {
        if (parts[0] === 'GB') hazard.distance_from_green = dist;
        else hazard.distance_from_tee = dist;
      }
    }
    return hazard;
  });
}

function expandHole(compact, note) {
  const [shape, fw, elev, green, hazards] = compact;
  const hole = {
    shape: SHAPE_MAP[shape] || shape,
    green_shape: GREEN_MAP[green] || green,
    fairway_width: FW_MAP[fw] || fw,
    elevation_change: ELEV_MAP[elev] || elev,
    hazards: expandHazards(hazards),
  };
  if (note) hole.notes = note;
  return hole;
}

function expandCourse(holes) {
  const result = {};
  for (let i = 0; i < holes.length; i++) {
    const h = holes[i];
    const compact = h.slice(0, 5);
    const note = h[5] || undefined;
    result[String(i + 1)] = expandHole(compact, note);
  }
  return result;
}

function toKey(shortId) {
  // a0000002 -> a0000002-0000-0000-0000-000000000001
  return `${shortId}-0000-0000-0000-000000000001`;
}

// ============================================================
// COURSE DATA - Compact format per hole:
// [shape, fw_width, elevation, green_shape, hazards, notes?]
// ============================================================

const courses = {};

// a0000001: Lonnie Poole GC (NC State) - Hurdzan/Fry, Raleigh
courses.a0000001 = [
  ['DR','M','D','O','FB-R-260,GB-FL,T-L','Downhill opener, dogleg right'],
  ['S','N','U','T','GB-L,GB-R,FC-150','Uphill par 3, bunkers both sides'],
  ['DL','M','D','K','W-L-280,FB-R-250,GB-BL','Par 5, water left off tee'],
  ['S','M','F','O','FB-L-240,GB-FR,T-R','Straightaway par 4'],
  ['DR','M','U','T','GB-L,GB-BR,T-L','Uphill dogleg right'],
  ['S','N','D','LN','GB-FL,GB-R,W-F','Par 3 over water'],
  ['DL','W','D','WS','FB-L-270,GB-L,T-R','Wide fairway, downhill'],
  ['S','M','X','K','FB-R-250,GB-FL,GB-BR','Undulating par 4'],
  ['DL','M','U','T','W-L-300,FB-R-270,GB-S','Turn for home, water left'],
  ['S','M','D','O','FB-L-260,GB-FR,T-L','Downhill par 4'],
  ['DR','W','F','T','FB-R-280,GB-BL,T-R','Wide par 5'],
  ['S','N','U','LN','GB-L,GB-R,FC-170','Uphill par 3, narrow green'],
  ['DL','M','D','K','W-L-250,GB-FL,FB-R-240','Water in play off tee'],
  ['S','M','X','O','FB-L-260,FB-R-270,GB-FR','Two fairway bunkers'],
  ['DR','M','U','T','GB-L,GB-BR,T-L','Dogleg right uphill'],
  ['S','N','D','WS','W-F,GB-L,GB-R','Par 3 over ravine'],
  ['DL','M','D','K','W-L-280,FB-R-260,GB-FL','Signature hole, water left'],
  ['S','M','U','T','W-L,GB-L,GB-R,FC-200','Finishing hole, water left of green'],
];

// a0000002: Augusta National
courses.a0000002 = [
  ['DR','W','D','T','FB-R-280,T-L,GB-FR','Tea Olive - wide, downhill, bunker right'],
  ['S','M','U','T','GB-FL,GB-BR,T-L','Pink Dogwood - uphill par 5'],
  ['S','M','D','LN','GB-L,GB-R,T-S','Flowering Peach - downhill par 4'],
  ['S','N','D','T','GB-FL,GB-R,T-S','Flowering Crab Apple - par 3, massive green'],
  ['DL','W','U','O','FB-L-290,GB-FL,GB-BR','Magnolia - uphill dogleg left par 4'],
  ['S','M','D','T','GB-FL,GB-R,T-L','Juniper - steep downhill par 3'],
  ['DL','M','U','K','GB-L,GB-BR,T-R','Pampas - uphill par 4'],
  ['S','W','U','T','FB-L-290,FB-R-300,GB-FL','Yellow Jasmine - uphill par 5'],
  ['DL','M','D','O','GB-FL,GB-R,T-L','Carolina Cherry - downhill par 4'],
  ['DL','W','D','T','FB-R-270,GB-FL,T-L','Camellia - steep downhill dogleg'],
  ['DL','M','D','T','W-L,GB-R,T-R','White Dogwood - water left, Amen Corner start'],
  ['S','N','D','LN','W-F,W-L,GB-BR,FC-155','Golden Bell - iconic par 3 over Rae\'s Creek'],
  ['DL','W','D','K','W-L-250,T-R,GB-FL','Azalea - par 5, creek and azaleas left'],
  ['DL','M','U','T','T-L,T-R,GB-FL,GB-BR','Chinese Fir - uphill dogleg'],
  ['S','W','U','T','FB-L-280,GB-FL,GB-R','Firethorn - par 5 uphill to green'],
  ['S','N','D','O','W-L,GB-R,T-L','Redbud - par 3, water left'],
  ['DL','M','U','T','GB-FL,GB-BR,T-L','Nandina - uphill to Eisenhower tree area'],
  ['S','M','U','K','GB-L,GB-R,T-S','Holly - uphill finisher, bunkers guard green'],
];

// a0000003: Pebble Beach
courses.a0000003 = [
  ['DR','M','D','O','T-R,GB-FR,OB-R','Slight dogleg right opener'],
  ['S','M','U','T','GB-FL,GB-R,OB-R','Uphill par 4, ocean views'],
  ['S','M','D','WS','GB-L,GB-R,OB-L','Downhill toward ocean'],
  ['S','N','D','LN','GB-FL,GB-BR,OB-R-100','Par 4, beach right of green'],
  ['S','M','X','K','GB-FL,GB-R,T-L','Uphill par 3'],
  ['DL','W','D','T','W-L,OB-L,GB-R,FC-180','Clifftop par 5, ocean left'],
  ['S','N','D','R','GB-S,OB-L','Iconic par 3, tiny green on cliff'],
  ['S','M','D','O','W-R,OB-R,GB-FL,GB-BR','Ocean right, clifftop approach'],
  ['DL','M','U','T','GB-FL,GB-BR,OB-L','Par 4 along cliff edge'],
  ['DL','M','D','K','W-L,OB-L,GB-FR,FB-R-250','Dramatic oceanside par 4'],
  ['S','M','X','O','GB-FL,GB-R,T-L','Inland par 4'],
  ['S','M','D','T','GB-L,GB-R,T-L','Par 3 back inland'],
  ['DL','W','F','K','FB-L-260,GB-FL,GB-BR,T-R','Par 4, wide fairway'],
  ['DR','M','U','O','GB-FL,GB-BR,OB-R','Dogleg right par 5'],
  ['S','M','X','T','GB-L,GB-R,T-L','Mid-length par 4'],
  ['S','M','D','LN','GB-FL,GB-R,T-R','Par 4'],
  ['S','N','D','R','W-F,OB-L,GB-L,FC-180','Hourglass green, ocean par 3'],
  ['DL','M','D','T','W-L,OB-L,GB-R,T-R','Ocean left all the way, finishing par 5'],
];

// a0000004: Riviera CC
courses.a0000004 = [
  ['S','W','D','T','FB-L-260,FB-R-280,GB-FL','Downhill opener, wide'],
  ['S','M','U','O','GB-FL,GB-R,T-L','Uphill par 4'],
  ['S','M','F','K','GB-L,GB-BR,T-R','Par 3 with deep bunkers'],
  ['S','N','U','LN','FB-L-250,GB-FL,GB-R,T-S','Narrow par 3 (long)'],
  ['DL','M','D','T','FB-L-270,GB-BL,T-R','Dogleg left par 4'],
  ['S','M','F','O','GB-C,GB-FL,GB-R','Par 3, famous bunker IN the green'],
  ['DR','W','D','K','FB-R-280,GB-FL,T-L','Downhill par 4'],
  ['DL','M','U','T','GB-FL,GB-BR,T-S','Uphill par 4, tree-lined'],
  ['DL','M','D','O','GB-FL,GB-R,T-L','Par 4 back toward clubhouse'],
  ['S','M','D','T','W-F,FB-L-260,GB-R,FC-200','Famous barranca crossing par 4'],
  ['DR','W','X','K','FB-R-290,GB-FL,GB-BR','Par 5, wide fairway'],
  ['S','M','U','LN','FB-L-250,GB-FL,GB-R,T-L','Uphill par 4'],
  ['DL','M','D','T','FB-L-260,GB-BL,T-R','Par 4, dogleg left'],
  ['S','M','X','O','GB-FL,GB-R,T-S','Mid-length par 4'],
  ['DR','W','D','T','FB-R-280,GB-FL,GB-BR','Par 4, reachable'],
  ['S','N','U','K','GB-FL,GB-R,T-L','Long uphill par 3'],
  ['DL','W','D','O','FB-L-270,FB-R-290,GB-FL','Par 5, downhill'],
  ['S','M','U','T','GB-FL,GB-R,T-S,OB-R','Uphill finisher'],
];

// a0000005: Torrey Pines South
courses.a0000005 = [
  ['DL','W','D','T','FB-L-270,GB-FR,T-R','Wide par 4, canyon views'],
  ['S','W','F','O','FB-R-280,GB-FL,T-L','Long par 4, wide fairway'],
  ['S','W','D','K','W-L,FB-R-260,GB-FL,GB-BR','Par 3, canyon left'],
  ['DR','W','X','T','FB-R-280,GB-FL,T-L','Long par 4, ocean views'],
  ['DL','W','D','O','FB-L-270,GB-FR,T-R','Downhill par 4'],
  ['DL','W','F','T','FB-L-280,FB-R-300,GB-FL,GB-BR','Par 5, wide'],
  ['S','M','U','LN','GB-FL,GB-R,T-S','Uphill par 4, narrow approach'],
  ['S','M','D','K','FB-L-260,GB-FL,T-R','Par 4, canyon right'],
  ['S','W','F','T','FB-R-290,FB-L-280,GB-FL,GB-BR','Long par 5'],
  ['DR','W','D','O','FB-R-270,GB-FR,T-L','Downhill par 4'],
  ['S','N','U','T','GB-L,GB-R,FC-190','Par 3, forced carry'],
  ['DL','W','D','K','FB-L-280,GB-BL,T-R','Par 4, canyon views'],
  ['S','W','F','T','FB-L-270,FB-R-290,GB-FL,GB-BR','Long par 5, wide'],
  ['S','M','X','O','FB-R-260,GB-FL,T-L','Mid par 4'],
  ['DR','M','U','LN','GB-FL,GB-R,T-S','Uphill par 4'],
  ['S','M','D','T','GB-FL,GB-BR,T-L','Par 4'],
  ['S','N','D','K','GB-L,GB-R,T-S','Par 3, iconic'],
  ['S','M','U','T','W-L,GB-FL,GB-R,T-R','Uphill finishing par 4'],
];

// a0000006: Bay Hill
courses.a0000006 = [
  ['S','M','D','O','FB-L-260,GB-FR,T-R','Downhill opener'],
  ['S','M','F','T','GB-FL,GB-R,W-L','Par 4 with water left'],
  ['S','N','F','LN','GB-L,GB-R,W-R','Par 3, water right'],
  ['DL','W','F','K','FB-L-270,GB-FL,T-R','Dogleg left par 4'],
  ['S','M','F','O','FB-R-260,GB-FL,GB-BR','Par 4'],
  ['DR','W','F','T','FB-R-290,FB-L-270,GB-FL,GB-BR','Par 5, wide'],
  ['S','N','F','R','GB-S,W-R','Short par 3, water right'],
  ['DL','M','F','K','FB-L-260,GB-BL,T-R','Dogleg left par 4'],
  ['S','M','F','T','FB-R-270,GB-FL,GB-R','Par 4'],
  ['DR','M','F','O','FB-R-280,GB-FL,T-L','Par 4'],
  ['DL','M','F','T','FB-L-270,GB-FL,GB-BR','Par 4'],
  ['S','W','F','K','FB-L-280,FB-R-300,GB-FL,GB-BR','Long par 5'],
  ['S','M','F','O','FB-L-260,GB-FR,T-R','Par 4'],
  ['S','N','F','T','GB-FL,GB-R,W-L','Par 3, water left'],
  ['DL','M','F','K','FB-L-270,GB-BL,T-R','Par 4'],
  ['DR','M','F','T','W-R,GB-FL,GB-BR,T-L','Par 4, water right - scoring stretch begins'],
  ['S','M','F','LN','W-R,GB-FL,GB-R','Par 3, water right'],
  ['S','M','F','T','W-R,GB-FL,GB-BR,FC-200','Iconic finisher, water right all the way'],
];

// a0000007: TPC Sawgrass (Players Stadium)
courses.a0000007 = [
  ['DL','M','F','T','W-L-280,FB-R-260,GB-FL','Water left off tee, Pete Dye'],
  ['S','M','F','O','FB-L-250,GB-FL,GB-R,W-R','Par 4, water right'],
  ['S','N','F','K','GB-FL,GB-R,W-R','Par 3, water right'],
  ['DL','M','F','T','W-L,FB-R-270,GB-FL,GB-BR','Dogleg, water left'],
  ['S','M','F','LN','FB-L-260,GB-FL,GB-R,T-L','Par 4'],
  ['DR','M','F','K','FB-R-270,GB-FR,W-L','Par 4, water left'],
  ['S','N','F','O','GB-FL,GB-R,W-L','Par 3, water left'],
  ['DR','M','F','T','W-R,FB-L-260,GB-FL','Par 4, water right'],
  ['DL','W','F','K','W-L-300,FB-R-270,GB-FL,GB-BR','Par 5, water left'],
  ['S','M','F','T','FB-L-260,GB-FL,GB-R,W-R','Par 4'],
  ['DL','W','F','O','W-L-290,FB-R-280,GB-FL,GB-BR','Par 5, water left'],
  ['S','N','F','K','W-L,GB-R,T-L','Par 4, tight'],
  ['S','M','F','T','FB-L-260,GB-FL,GB-R','Par 4'],
  ['DR','M','F','LN','FB-R-270,GB-FL,W-L','Par 4'],
  ['S','M','F','T','GB-FL,GB-R,W-R','Par 4'],
  ['DL','W','F','K','W-L,FB-R-280,GB-FL,GB-BR','Par 5, water left'],
  ['S','N','F','R','W-S,FC-130','ISLAND GREEN par 3, water everywhere'],
  ['DL','M','F','T','W-L,GB-R,FB-L-260','Par 4, water left to green'],
];

// a0000008: Quail Hollow
courses.a0000008 = [
  ['S','M','X','T','FB-L-260,GB-FR,T-R','Par 4 opener'],
  ['S','M','F','O','FB-R-270,GB-FL,T-L','Par 4'],
  ['DL','M','D','K','W-L-280,GB-FL,T-R','Par 3 over creek'],
  ['DR','W','X','T','FB-R-280,GB-FL,GB-BR','Long par 4'],
  ['S','W','F','O','FB-L-280,FB-R-300,GB-FL,GB-BR','Par 5'],
  ['S','M','U','LN','GB-FL,GB-R,T-S','Uphill par 4'],
  ['DL','M','D','K','W-L,FB-R-260,GB-BL','Par 4, creek left'],
  ['S','N','F','T','GB-FL,GB-R,W-F','Par 3'],
  ['DR','M','X','O','FB-R-270,GB-FR,T-L','Par 4'],
  ['DL','W','F','T','FB-L-270,FB-R-290,GB-FL,GB-BR','Par 5, creek'],
  ['S','M','U','K','FB-L-260,GB-FL,T-R','Uphill par 4'],
  ['S','N','D','O','W-F,GB-L,GB-R,FC-180','Par 3 over creek'],
  ['DR','M','X','T','FB-R-270,GB-FL,T-L','Par 4'],
  ['DL','M','F','K','W-L-280,GB-FL,GB-BR','Par 4, creek left'],
  ['S','W','D','T','FB-L-280,FB-R-300,GB-FL,GB-BR','Par 5'],
  ['S','M','U','LN','W-R,GB-FL,GB-R,T-L','Green Mile #1 - par 4, water right'],
  ['DR','M','X','T','W-R,GB-FL,GB-BR','Green Mile #2 - par 3, water right'],
  ['DL','M','U','K','W-L,W-R,GB-FL,GB-BR,FC-200','Green Mile #3 - par 4, water both sides'],
];

// a0000009: East Lake
courses.a0000009 = [
  ['S','M','F','T','FB-L-260,GB-FR,T-R','Par 4 opener'],
  ['DL','M','X','O','FB-L-270,GB-FL,T-R','Par 4'],
  ['S','N','F','K','GB-FL,GB-R,T-S','Par 3'],
  ['DR','W','F','T','FB-R-280,GB-FL,GB-BR','Long par 4'],
  ['DL','W','F','O','FB-L-280,FB-R-300,GB-FL,GB-BR','Par 5'],
  ['S','M','U','LN','GB-FL,GB-R,T-L','Uphill par 4'],
  ['S','N','D','T','W-F,GB-L,GB-R,FC-180','Par 3, water front'],
  ['DR','M','X','K','FB-R-270,GB-FR,T-L','Par 4'],
  ['DL','M','F','O','FB-L-260,GB-FL,T-R','Par 4'],
  ['S','M','F','T','FB-R-270,GB-FL,GB-R','Par 4'],
  ['S','M','F','K','W-L,FB-R-260,GB-FL','Par 4, water left'],
  ['S','W','F','T','W-L,FB-R-280,GB-FL,GB-BR','Par 5, water left'],
  ['DL','M','F','O','W-L-260,GB-FL,T-R','Par 4, water left'],
  ['S','M','X','LN','FB-L-260,GB-FL,GB-R','Par 4'],
  ['S','N','F','T','W-R,GB-FL,GB-R','Par 3, water right'],
  ['DR','M','F','K','W-R,FB-L-260,GB-FR','Par 4, water right'],
  ['S','M','F','O','W-R,GB-FL,GB-R','Par 4, water right'],
  ['DL','M','U','T','W-L,GB-FL,GB-BR,FC-200','Par 5, lake left, uphill finish'],
];

// a0000010: Harbour Town GL
courses.a0000010 = [
  ['DL','N','F','R','T-L,T-R,GB-FL,GB-R','Tight opener, small green'],
  ['S','N','F','O','T-L,T-R,GB-FL,GB-BR','Par 4, tree-lined'],
  ['S','N','F','R','GB-FL,GB-R,W-R','Par 3, water right'],
  ['S','N','F','LN','T-L,T-R,FB-L-250,GB-FL','Narrow par 4'],
  ['DL','W','F','K','W-L-300,T-R,FB-R-270,GB-FL,GB-BR','Par 5, marsh left'],
  ['DR','N','F','R','T-L,T-R,GB-FL,GB-R,W-L','Par 4, tiny green'],
  ['S','N','F','O','T-S,GB-FL,GB-R','Short par 3'],
  ['DR','N','F','R','T-L,T-R,GB-FL,GB-BR,W-R','Par 4, water right'],
  ['DL','M','F','K','T-L,T-R,FB-L-260,GB-FL','Par 4'],
  ['S','M','F','O','T-L,T-R,GB-FL,GB-R','Par 4'],
  ['S','N','F','R','T-S,GB-FL,GB-R','Par 4, tiny green'],
  ['S','M','F','T','T-L,T-R,FB-R-260,GB-FL,GB-BR','Par 4'],
  ['DL','M','F','K','W-L,T-R,FB-R-260,GB-FL','Par 4, marsh left'],
  ['S','N','F','R','T-S,GB-FL,GB-R,W-L','Par 3, water left'],
  ['DL','W','F','O','W-L-280,T-R,FB-R-270,GB-FL,GB-BR','Par 5, water left'],
  ['DR','M','F','T','W-R,T-L,GB-FL,GB-R','Par 4, water right'],
  ['S','N','F','R','T-S,GB-FL,GB-R,W-R','Par 3, water right'],
  ['S','N','F','LN','W-L,T-R,GB-FL,GB-R','Lighthouse hole, water left, tight finish'],
];

// a0000011: Muirfield Village
courses.a0000011 = [
  ['DR','M','D','T','FB-R-270,GB-FL,T-L','Downhill dogleg right'],
  ['S','M','U','O','FB-L-260,GB-FL,GB-R,T-R','Uphill par 4'],
  ['S','N','U','K','GB-FL,GB-R,W-F,FC-170','Uphill par 3, water front'],
  ['DL','M','D','T','W-L-280,FB-R-260,GB-FL','Creek left, downhill'],
  ['DL','W','D','O','W-L-300,FB-R-280,GB-FL,GB-BR','Par 5, creek left'],
  ['S','M','X','LN','FB-L-260,GB-FL,GB-R,T-S','Par 4'],
  ['DR','M','U','T','FB-R-270,GB-FR,T-L','Par 5, uphill'],
  ['S','N','D','K','GB-FL,GB-R,W-F,FC-180','Par 3 over water'],
  ['DL','M','X','T','FB-L-260,GB-FL,GB-BR','Par 4'],
  ['S','M','U','O','FB-R-270,GB-FL,T-L','Uphill par 4'],
  ['DR','W','D','K','W-R,FB-L-270,GB-FL,GB-BR','Par 5, creek right'],
  ['S','N','D','T','W-F,GB-L,GB-R,FC-185','Par 3 over creek, Nicklaus signature'],
  ['DL','M','X','O','W-L-260,GB-FL,T-R','Par 4, creek left'],
  ['S','M','U','LN','FB-L-260,GB-FL,GB-R','Uphill par 4'],
  ['DR','W','D','T','W-R-290,FB-L-270,GB-FL,GB-BR','Par 5, water right'],
  ['S','N','D','K','W-F,GB-L,GB-R,FC-170','Par 3 over water'],
  ['DL','M','X','T','W-L,FB-R-260,GB-FL','Par 4, water left'],
  ['S','M','U','O','W-L,GB-FL,GB-R,T-R','Uphill finish, water left'],
];

// a0000012: Colonial CC
courses.a0000012 = [
  ['S','N','F','T','T-L,T-R,FB-L-250,GB-FL,GB-R','Tight par 5 opener, Hogan\'s Alley'],
  ['S','N','F','O','T-L,T-R,GB-FL,GB-R','Tight par 4'],
  ['DL','N','F','K','T-L,T-R,W-L-270,GB-FL','Par 4, Trinity River near'],
  ['S','N','F','LN','T-S,GB-FL,GB-R','Par 3, tree-lined'],
  ['DR','N','F','T','T-L,T-R,W-R,FB-L-260,GB-FR','Famous Wall par 4, water right'],
  ['S','N','F','O','T-L,T-R,GB-FL,GB-R','Par 4, tight'],
  ['S','N','F','K','T-S,GB-FL,GB-R','Short par 4'],
  ['S','N','F','T','T-L,T-R,GB-FL,GB-R','Par 3'],
  ['DL','N','F','O','T-L,T-R,FB-L-260,GB-FL','Par 4'],
  ['S','M','F','T','T-L,T-R,GB-FL,GB-R','Par 4'],
  ['DR','W','F','K','T-L,FB-R-270,GB-FL,GB-BR','Par 5, wider'],
  ['S','N','F','O','T-S,GB-FL,GB-R','Par 3'],
  ['DL','N','F','T','T-L,T-R,W-L,FB-R-260,GB-FL','Par 4, water left'],
  ['S','M','F','LN','T-L,T-R,FB-R-260,GB-FL,GB-R','Par 4'],
  ['S','N','F','K','T-S,GB-FL,GB-R,W-R','Par 4'],
  ['S','N','F','T','T-S,GB-FL,GB-R','Par 3'],
  ['DR','M','F','O','T-L,T-R,FB-R-260,GB-FR','Par 4'],
  ['S','N','F','T','T-L,T-R,GB-FL,GB-R,W-R','Finishing par 4, tough'],
];

// a0000013: TPC Southwind
courses.a0000013 = [
  ['S','M','F','T','FB-L-260,GB-FR,W-R','Par 4, water right'],
  ['DL','M','F','O','W-L-270,FB-R-260,GB-FL','Par 4, water left'],
  ['S','N','F','K','W-F,GB-L,GB-R,FC-170','Par 3, water front'],
  ['DR','M','F','T','FB-R-270,GB-FL,GB-BR,W-R','Par 4, water right'],
  ['DL','W','F','O','W-L-290,FB-R-280,GB-FL,GB-BR','Par 5, water left'],
  ['S','M','F','LN','FB-L-260,GB-FL,GB-R','Par 4'],
  ['S','M','F','K','FB-R-270,GB-FL,T-L','Par 4'],
  ['S','N','F','T','GB-FL,GB-R,W-R','Par 3, water right'],
  ['DR','M','F','O','W-R,FB-L-260,GB-FR','Par 4, water right'],
  ['S','M','F','T','FB-L-260,GB-FL,GB-R','Par 4'],
  ['S','N','F','K','W-F,GB-L,GB-R,FC-185','Par 3'],
  ['DL','M','F','O','W-L,FB-R-260,GB-FL','Par 4, water left'],
  ['S','W','F','T','FB-L-280,FB-R-300,GB-FL,GB-BR','Par 5'],
  ['DR','M','F','K','FB-R-270,GB-FL,W-L','Par 4'],
  ['S','M','F','LN','FB-L-260,GB-FL,GB-R','Par 4'],
  ['DL','W','F','T','W-L,FB-R-280,GB-FL,GB-BR','Par 5, water left'],
  ['S','N','F','O','W-R,GB-FL,GB-R','Par 3, water right'],
  ['S','M','F','T','W-L,W-R,GB-FL,GB-BR','Par 4, water both sides'],
];

// a0000014: TPC Summerlin
courses.a0000014 = [
  ['S','W','F','T','WA-L,FB-R-260,GB-FL','Desert opener, waste area left'],
  ['DR','W','F','O','WA-R,FB-L-270,GB-FR','Wide par 4, waste areas'],
  ['S','N','F','K','GB-FL,GB-R,WA-L','Par 3'],
  ['DL','W','F','T','WA-L,FB-R-280,GB-FL,GB-BR','Par 5, waste left'],
  ['S','M','F','O','WA-R,FB-L-260,GB-FL','Par 4'],
  ['DR','W','F','LN','WA-R,GB-FL,GB-R','Par 4'],
  ['S','N','F','T','GB-FL,GB-R,WA-S','Par 3'],
  ['DL','M','F','K','WA-L,FB-R-260,GB-FL','Par 4'],
  ['S','W','F','O','WA-L,WA-R,FB-R-280,GB-FL,GB-BR','Par 5, desert'],
  ['S','M','F','T','WA-R,FB-L-260,GB-FL','Par 4'],
  ['DR','M','F','K','WA-L,GB-FL,GB-R','Par 4'],
  ['S','N','F','O','GB-FL,GB-R,WA-S','Par 3'],
  ['DL','M','F','T','WA-L,FB-R-260,GB-FL','Par 4'],
  ['S','M','F','LN','FB-L-260,GB-FL,GB-R','Par 4'],
  ['S','W','F','K','WA-L,WA-R,FB-R-290,GB-FL,GB-BR','Par 5'],
  ['DR','M','F','T','W-R,WA-L,GB-FL,GB-R','Par 4, water right'],
  ['S','N','F','O','W-F,GB-L,GB-R,FC-170','Par 3, water'],
  ['DL','M','F','T','W-L,WA-R,GB-FL,GB-BR','Par 4, water left'],
];

// a0000015: TPC Scottsdale (Stadium)
courses.a0000015 = [
  ['S','W','F','T','WA-L,FB-R-270,GB-FL','Desert par 4'],
  ['DR','W','F','O','WA-R,FB-L-280,GB-FR','Par 4, waste right'],
  ['S','N','F','K','GB-FL,GB-R,WA-S','Par 3'],
  ['DL','M','F','T','WA-L,W-L-280,FB-R-270,GB-FL','Par 4, water left'],
  ['S','W','F','O','WA-L,WA-R,FB-R-290,GB-FL,GB-BR','Par 5'],
  ['DR','M','F','LN','WA-R,GB-FL,GB-R','Par 4'],
  ['S','M','F','T','FB-L-260,GB-FL,GB-R,W-R','Par 4'],
  ['S','N','F','K','GB-FL,GB-R,WA-S','Par 3'],
  ['DL','M','F','O','WA-L,FB-R-260,GB-FL','Par 4'],
  ['S','W','F','T','WA-L,WA-R,FB-R-290,GB-FL,GB-BR','Par 5'],
  ['DR','M','F','K','W-R,WA-L,GB-FL','Par 4, water right'],
  ['S','N','F','O','W-F,GB-L,GB-R,FC-160','Par 3'],
  ['DL','M','F','T','W-L,WA-R,FB-R-260,GB-FL','Par 4, water left'],
  ['S','M','F','LN','FB-L-260,GB-FL,GB-R','Par 4'],
  ['DR','W','F','K','W-R,WA-L,FB-R-280,GB-FL,GB-BR','Par 5, water right'],
  ['S','N','F','T','W-S,GB-S,FC-150','Stadium par 3, amphitheater hole!'],
  ['S','M','F','O','W-L,FB-R-260,GB-FL,GB-R','Par 4, water left'],
  ['DL','M','F','T','W-L,WA-R,GB-FL,GB-BR','Par 4, water left'],
];

// a0000016: Pinehurst No. 2
courses.a0000016 = [
  ['S','M','X','T','WA-L,WA-R,GB-FL,GB-R','Sand everywhere, turtleback green'],
  ['DL','M','X','O','WA-L,FB-R-260,GB-FL,GB-BR','Dogleg left, sandy waste'],
  ['S','M','X','T','WA-R,GB-FL,GB-R','Par 4, turtleback green'],
  ['S','N','X','K','WA-S,GB-FL,GB-R','Par 3, crowned green'],
  ['DL','M','X','T','WA-L,WA-R,FB-R-260,GB-FL','Par 4, waste areas both sides'],
  ['S','M','X','O','WA-L,GB-FL,GB-R','Par 4'],
  ['DR','M','X','T','WA-R,FB-L-260,GB-FL,GB-BR','Par 4'],
  ['S','N','X','K','WA-S,GB-FL,GB-R','Par 3, domed green'],
  ['DL','M','X','T','WA-L,WA-R,FB-R-270,GB-FL','Long par 4'],
  ['S','W','X','O','WA-L,WA-R,FB-R-280,GB-FL,GB-BR','Par 5, sandy waste'],
  ['S','M','X','T','WA-R,GB-FL,GB-R','Par 4'],
  ['S','N','X','K','WA-S,GB-FL,GB-R','Par 3, classic turtleback'],
  ['DR','M','X','T','WA-L,WA-R,FB-R-260,GB-FL','Par 4'],
  ['S','M','X','O','WA-R,GB-FL,GB-R','Par 4'],
  ['DL','W','X','T','WA-L,WA-R,FB-R-280,GB-FL,GB-BR','Par 5, wide waste areas'],
  ['S','W','X','K','WA-L,WA-R,FB-R-290,GB-FL,GB-BR','Long par 4'],
  ['S','N','X','T','WA-S,GB-FL,GB-R','Par 3'],
  ['S','M','X','O','WA-L,WA-R,GB-FL,GB-R','Finishing par 4, crowned green'],
];

// a0000017: Oak Hill East
courses.a0000017 = [
  ['S','N','F','T','T-L,T-R,FB-L-250,GB-FL,GB-R','Tight opener, tree-lined'],
  ['DL','N','X','O','T-L,T-R,FB-L-260,GB-FL','Dogleg, trees everywhere'],
  ['S','N','F','K','T-S,GB-FL,GB-R','Par 3, tree-lined'],
  ['S','N','X','T','T-L,T-R,FB-R-260,GB-FL,GB-R','Par 4, tight'],
  ['DR','N','U','O','T-L,T-R,FB-R-270,GB-FR','Par 5, uphill'],
  ['S','N','X','LN','T-S,GB-FL,GB-R','Par 4'],
  ['DL','N','F','T','T-L,T-R,W-L,GB-FL,GB-BR','Par 4, creek left'],
  ['S','N','F','K','T-S,GB-FL,GB-R','Par 3'],
  ['S','N','X','O','T-L,T-R,FB-L-260,GB-FL','Par 4'],
  ['DR','N','F','T','T-L,T-R,FB-R-270,GB-FL,GB-R','Par 4'],
  ['S','N','X','K','T-S,FB-L-260,GB-FL,GB-R','Long par 4'],
  ['S','N','F','O','T-S,GB-FL,GB-R','Par 3'],
  ['DL','W','X','T','T-L,T-R,FB-R-280,GB-FL,GB-BR','Par 5'],
  ['S','N','F','K','T-L,T-R,FB-L-260,GB-FL','Par 4'],
  ['DR','N','X','O','T-L,T-R,FB-R-270,GB-FR','Par 4'],
  ['S','N','F','T','T-S,GB-FL,GB-R','Par 3'],
  ['S','N','X','LN','T-L,T-R,FB-L-260,GB-FL,GB-R','Par 4, demanding'],
  ['S','N','U','T','T-L,T-R,GB-FL,GB-R','Uphill finisher'],
];

// a0000018: Bethpage Black
courses.a0000018 = [
  ['S','M','U','T','FB-L-260,FB-R-280,GB-FL,GB-R','Long uphill par 4, brutal start'],
  ['DL','M','D','O','FB-L-270,GB-FL,T-R','Par 4, downhill'],
  ['S','N','U','K','GB-FL,GB-R,T-S','Par 3, long and uphill'],
  ['DR','M','X','T','FB-R-280,GB-FL,GB-BR,T-L','Long par 5'],
  ['DL','M','U','LN','FB-L-270,GB-FL,GB-R,T-R','Long par 4, uphill'],
  ['S','M','D','O','FB-L-260,GB-FL,T-L','Par 4, deep bunkers'],
  ['S','N','D','T','GB-FL,GB-R,T-S','Par 3, downhill'],
  ['DL','M','X','K','FB-L-270,GB-FL,GB-BR,T-R','Par 4'],
  ['S','M','U','T','FB-L-260,FB-R-280,GB-FL,GB-R','Long par 4'],
  ['DR','M','D','O','FB-R-280,GB-FL,T-L','Par 4, downhill'],
  ['S','M','X','K','FB-L-270,GB-FL,GB-R','Par 4'],
  ['S','N','U','T','GB-FL,GB-R,T-S,FC-200','Long par 3, uphill'],
  ['DL','W','D','O','FB-L-280,FB-R-300,GB-FL,GB-BR','Par 5, downhill'],
  ['S','M','X','T','FB-R-270,GB-FL,GB-R','Par 4'],
  ['DR','M','U','K','FB-R-280,GB-FL,T-L','Long par 4, uphill'],
  ['S','N','D','LN','GB-FL,GB-R,T-S','Par 3'],
  ['S','M','X','T','FB-L-270,FB-R-280,GB-FL,GB-R','Par 4'],
  ['S','M','U','O','FB-L-260,GB-FL,GB-R,T-S','Long uphill finisher'],
];

// a0000019: Shinnecock Hills
courses.a0000019 = [
  ['S','W','X','T','FB-L-260,GB-FL,T-R','Open, windy par 4'],
  ['DR','M','X','O','FB-R-270,GB-FR,T-L','Par 4, fescue rough'],
  ['S','M','X','K','FB-L-260,GB-FL,GB-R','Par 4'],
  ['S','N','X','T','GB-FL,GB-R','Par 3, wind-exposed'],
  ['DL','W','X','O','FB-L-280,FB-R-300,GB-FL,GB-BR','Par 5, links style'],
  ['S','M','X','LN','FB-R-260,GB-FL,GB-R','Par 4'],
  ['S','N','X','K','GB-FL,GB-R','Par 3, elevated green'],
  ['S','M','X','T','FB-L-260,GB-FL,GB-R','Par 4'],
  ['DR','M','X','O','FB-R-270,GB-FR','Long par 4, fescue both sides'],
  ['S','M','X','T','FB-L-260,GB-FL,GB-R','Par 4'],
  ['S','N','X','K','GB-FL,GB-R','Par 3'],
  ['DL','W','X','O','FB-L-280,FB-R-300,GB-FL,GB-BR','Par 5'],
  ['S','M','X','T','FB-R-260,GB-FL,GB-R','Par 4'],
  ['DR','M','X','LN','FB-R-270,GB-FL','Par 4, demanding'],
  ['S','M','X','K','FB-L-260,GB-FL,GB-R','Par 4'],
  ['S','N','X','T','GB-FL,GB-R','Par 3, wind'],
  ['DL','M','X','O','FB-L-270,GB-FL,GB-BR','Par 4'],
  ['S','M','U','T','GB-FL,GB-R','Uphill finisher, exposed'],
];

// a0000020: Valhalla
courses.a0000020 = [
  ['DR','W','F','T','FB-R-270,GB-FL,T-L','Wide par 4'],
  ['S','M','F','O','FB-L-260,GB-FL,GB-R','Par 4'],
  ['S','N','F','K','GB-FL,GB-R,W-F,FC-170','Par 3, water front'],
  ['DL','M','F','T','W-L-270,FB-R-260,GB-FL','Par 4, creek left'],
  ['S','W','F','O','FB-L-280,FB-R-300,GB-FL,GB-BR','Par 5'],
  ['S','M','F','LN','FB-R-260,GB-FL,GB-R','Par 4'],
  ['DL','W','F','T','W-L-290,FB-R-280,GB-FL,GB-BR','Par 5, creek left'],
  ['S','N','F','K','GB-FL,GB-R','Par 3'],
  ['DR','M','F','O','FB-R-270,GB-FR,T-L','Par 4'],
  ['DL','M','F','T','W-L,FB-R-260,GB-FL','Par 4, Nicklaus creek'],
  ['S','M','F','K','FB-L-260,GB-FL,GB-R','Par 4'],
  ['S','N','F','O','W-F,GB-L,GB-R,FC-180','Par 3 over water'],
  ['DR','M','F','T','W-R,FB-L-260,GB-FR','Par 4, creek right'],
  ['DL','M','F','LN','W-L,FB-R-260,GB-FL','Par 4, creek left'],
  ['S','M','F','K','FB-L-260,GB-FL,GB-R','Par 4'],
  ['S','N','F','T','GB-FL,GB-R,W-R','Par 3, water right'],
  ['DL','W','F','O','W-L-280,FB-R-270,GB-FL,GB-BR','Par 5, creek left'],
  ['S','M','F','T','W-L,W-R,GB-FL,GB-BR','Par 4, water both sides, dramatic finish'],
];

// a0000021: Olympia Fields North
courses.a0000021 = [
  ['S','N','F','T','T-L,T-R,FB-L-260,GB-FL,GB-R','Tight, tree-lined opener'],
  ['DL','N','X','O','T-L,T-R,FB-L-270,GB-FL','Tree-lined dogleg'],
  ['S','N','F','K','T-S,GB-FL,GB-R','Par 3, tight'],
  ['DR','N','X','T','T-L,T-R,FB-R-270,GB-FL,GB-R','Long par 4'],
  ['DL','M','F','O','T-L,T-R,FB-L-280,GB-FL,GB-BR','Par 5'],
  ['S','N','X','LN','T-S,FB-L-260,GB-FL,GB-R','Par 4'],
  ['S','N','F','T','T-S,GB-FL,GB-R','Par 3'],
  ['DR','N','X','K','T-L,T-R,FB-R-260,GB-FR','Par 4'],
  ['S','N','F','O','T-L,T-R,FB-L-260,GB-FL','Par 4'],
  ['DL','N','X','T','T-L,T-R,W-L,FB-R-260,GB-FL','Par 4, water left'],
  ['S','N','F','K','T-S,FB-L-260,GB-FL,GB-R','Par 4'],
  ['S','N','F','O','T-S,GB-FL,GB-R','Par 3'],
  ['DR','M','X','T','T-L,T-R,FB-R-270,GB-FL,GB-BR','Par 5'],
  ['S','N','F','LN','T-L,T-R,FB-L-260,GB-FL','Par 4'],
  ['DL','N','X','K','T-L,T-R,W-L,GB-FL,GB-R','Par 4, water left'],
  ['S','N','F','T','T-S,GB-FL,GB-R','Par 3'],
  ['S','N','X','O','T-L,T-R,FB-R-260,GB-FL,GB-R','Long par 4'],
  ['S','N','U','T','T-L,T-R,GB-FL,GB-R','Uphill finisher'],
];

// a0000022: Winged Foot West
courses.a0000022 = [
  ['S','N','X','T','FB-L-260,FB-R-270,GB-FL,GB-R,T-S','Bunkers everywhere, Tillinghast'],
  ['DL','N','X','O','FB-L-270,GB-FL,GB-BR,T-L,T-R','Par 4, tree-lined'],
  ['S','N','X','K','GB-FL,GB-R,GB-B,T-S','Par 3, bunkers surround'],
  ['DR','N','X','T','FB-R-280,GB-FL,GB-R,T-L,T-R','Long par 4'],
  ['DL','M','X','O','FB-L-280,FB-R-300,GB-FL,GB-BR,T-S','Par 5, bunkers galore'],
  ['S','N','X','T','FB-L-260,GB-FL,GB-R,T-S','Par 4'],
  ['S','N','X','K','GB-FL,GB-R,T-S','Par 3, tough green'],
  ['DR','N','X','O','FB-R-270,GB-FL,GB-BR,T-L,T-R','Par 4'],
  ['DL','N','X','T','FB-L-270,GB-FL,GB-R,T-S','Par 4'],
  ['S','N','X','K','GB-FL,GB-R,GB-B,T-S','Par 3, devastating bunkers'],
  ['S','N','X','T','FB-L-260,FB-R-270,GB-FL,GB-R,T-S','Par 4'],
  ['DR','M','X','O','FB-R-280,FB-L-290,GB-FL,GB-BR,T-S','Par 5'],
  ['S','N','X','K','FB-L-260,GB-FL,GB-R,T-S','Par 4'],
  ['DL','N','X','T','FB-L-270,GB-FL,GB-BR,T-L,T-R','Par 4'],
  ['S','N','X','O','FB-R-260,GB-FL,GB-R,T-S','Par 4'],
  ['S','N','X','T','GB-FL,GB-R,T-S','Par 3'],
  ['DL','N','X','K','FB-L-270,GB-FL,GB-R,T-S','Par 4'],
  ['S','N','U','T','FB-L-260,FB-R-270,GB-FL,GB-R,T-S','Uphill finisher, bunkers galore'],
];

// a0000023: Kiawah Island Ocean Course
courses.a0000023 = [
  ['S','W','F','T','WA-L,WA-R,GB-FL,GB-R','Seaside opener, wind'],
  ['DR','M','F','O','WA-R,W-R,FB-L-260,GB-FR','Par 4, marsh right'],
  ['S','N','F','K','WA-S,GB-FL,GB-R','Par 3, dunes'],
  ['DL','M','F','T','WA-L,W-L-270,FB-R-260,GB-FL','Par 4, marsh left'],
  ['S','W','F','O','WA-L,WA-R,FB-R-280,GB-FL,GB-BR','Par 5, wind exposed'],
  ['DR','M','F','LN','WA-R,W-R,GB-FL,GB-R','Par 4, ocean right'],
  ['S','N','F','T','WA-S,GB-FL,GB-R','Par 3'],
  ['DL','W','F','K','WA-L,W-L,FB-R-280,GB-FL,GB-BR','Par 5, marsh left'],
  ['S','M','F','O','WA-R,FB-L-260,GB-FL','Par 4'],
  ['DR','M','F','T','WA-L,WA-R,GB-FL,GB-R','Par 4, ocean views'],
  ['S','M','F','K','WA-R,W-R,FB-L-260,GB-FL','Par 4, marsh right'],
  ['S','N','F','O','WA-S,W-R,GB-FL,GB-R','Par 3, ocean right'],
  ['DL','M','F','T','WA-L,W-L,FB-R-260,GB-FL','Par 4, marsh left'],
  ['S','M','F','LN','WA-R,FB-L-260,GB-FL,GB-R','Par 4'],
  ['DR','W','F','K','WA-L,WA-R,W-R,FB-L-280,GB-FL,GB-BR','Par 5, ocean right'],
  ['DL','W','F','T','WA-L,W-L,FB-R-280,GB-FL,GB-BR','Par 5, marsh and ocean'],
  ['S','N','F','O','WA-S,W-L,GB-FL,GB-R,FC-180','Par 3, ocean left, Pete Dye'],
  ['S','M','F','T','WA-L,WA-R,W-R,GB-FL,GB-BR','Par 4, ocean right, epic finish'],
];

// a0000024: Torrey Pines North
courses.a0000024 = [
  ['S','W','F','T','FB-L-260,GB-FR,T-R','Wide par 4'],
  ['DL','W','D','O','FB-L-270,GB-FL,T-R','Downhill par 4'],
  ['S','N','F','K','GB-FL,GB-R','Par 3'],
  ['DR','W','F','T','FB-R-280,GB-FL,GB-BR','Par 4, wide'],
  ['S','W','F','O','FB-L-280,FB-R-300,GB-FL,GB-BR','Par 5'],
  ['DL','M','D','LN','FB-L-260,GB-FL,T-R','Par 4, ocean views'],
  ['S','N','D','T','GB-FL,GB-R','Par 3'],
  ['S','M','F','K','FB-R-260,GB-FL,GB-R','Par 4'],
  ['DR','W','U','O','FB-R-280,GB-FL,GB-BR','Par 5'],
  ['S','M','F','T','FB-L-260,GB-FL,GB-R','Par 4'],
  ['DL','M','D','K','FB-L-260,GB-FL,T-R','Par 4'],
  ['S','N','F','O','GB-FL,GB-R','Par 3'],
  ['S','M','F','T','FB-R-260,GB-FL,GB-R','Par 4'],
  ['DR','W','F','LN','FB-R-280,GB-FL,GB-BR','Par 5'],
  ['S','M','X','K','FB-L-260,GB-FL,GB-R','Par 4'],
  ['DL','M','D','T','FB-L-260,GB-FL,T-R','Par 4'],
  ['S','N','F','O','GB-FL,GB-R','Par 3, scenic'],
  ['S','M','U','T','FB-R-260,GB-FL,GB-R','Finishing par 4'],
];

// a0000025: TPC River Highlands
courses.a0000025 = [
  ['S','M','F','T','FB-L-250,GB-FR,T-R','Par 4 opener'],
  ['DL','M','F','O','W-L-260,GB-FL,T-R','Par 4, water left'],
  ['S','N','F','K','W-F,GB-L,GB-R,FC-160','Par 3 over water'],
  ['DR','M','F','T','FB-R-260,GB-FL,W-R','Par 4'],
  ['S','M','F','O','FB-L-260,GB-FL,GB-R','Par 4'],
  ['DL','W','F','LN','W-L-280,FB-R-270,GB-FL,GB-BR','Par 5, river left'],
  ['S','N','F','T','GB-FL,GB-R,W-R','Par 3'],
  ['S','M','F','K','FB-R-260,GB-FL,T-L','Par 4'],
  ['DR','M','F','O','FB-R-260,GB-FR','Par 4'],
  ['S','M','F','T','FB-L-260,GB-FL,GB-R','Par 4'],
  ['S','N','F','K','W-F,GB-L,GB-R,FC-170','Par 3 over water'],
  ['DL','M','F','O','W-L,FB-R-260,GB-FL','Par 4'],
  ['DR','W','F','T','W-R-290,FB-L-270,GB-FL,GB-BR','Par 5, river right'],
  ['S','M','F','K','FB-L-260,GB-FL,GB-R','Par 4'],
  ['S','M','F','T','W-R,GB-FL,GB-R','Par 4, Travelers scoring stretch'],
  ['DL','N','F','O','W-L,W-R,GB-FL','Par 4, peninsula fairway'],
  ['S','N','F','LN','W-F,W-R,GB-L,FC-170','Par 3, water everywhere'],
  ['S','M','F','T','W-L,GB-FL,GB-R','Par 4, river left'],
];

// a0000026: TPC Craig Ranch
courses.a0000026 = [
  ['S','W','F','T','FB-L-270,GB-FR,W-R','Wide par 4, modern'],
  ['DR','W','F','O','W-R,FB-L-280,GB-FR','Par 4, water right'],
  ['S','N','F','K','W-F,GB-L,GB-R,FC-170','Par 3 over water'],
  ['DL','W','F','T','W-L-280,FB-R-270,GB-FL,GB-BR','Par 5, water left'],
  ['S','M','F','O','FB-L-260,GB-FL,GB-R','Par 4'],
  ['DR','W','F','LN','W-R,FB-L-270,GB-FR','Par 4, water right'],
  ['S','N','F','T','GB-FL,GB-R,W-R','Par 3'],
  ['DL','M','F','K','W-L,FB-R-260,GB-FL','Par 4, water left'],
  ['S','W','F','O','W-R,FB-L-280,GB-FL,GB-BR','Par 5, water right'],
  ['S','M','F','T','FB-R-260,GB-FL,GB-R','Par 4'],
  ['DR','M','F','K','W-R,GB-FL,GB-R','Par 4, water right'],
  ['S','N','F','O','W-F,GB-L,FC-160','Par 3 over water'],
  ['DL','M','F','T','W-L,FB-R-260,GB-FL','Par 4'],
  ['S','W','F','LN','W-L,W-R,FB-R-280,GB-FL,GB-BR','Par 5, water both sides'],
  ['S','M','F','K','FB-L-260,GB-FL,GB-R','Par 4'],
  ['DR','M','F','T','W-R,GB-FL,GB-R','Par 4, water right'],
  ['S','N','F','O','W-F,GB-L,GB-R,FC-175','Par 3 over water'],
  ['S','M','F','T','W-L,W-R,GB-FL,GB-BR','Par 4, water finish'],
];

// a0000027: Detroit Golf Club
courses.a0000027 = [
  ['S','N','F','T','T-L,T-R,FB-L-250,GB-FL,GB-R','Tree-lined opener'],
  ['DL','N','F','O','T-L,T-R,GB-FL,T-R','Par 4, old school'],
  ['S','N','F','K','T-S,GB-FL,GB-R','Par 3'],
  ['DR','N','F','T','T-L,T-R,FB-R-260,GB-FL','Par 4'],
  ['DL','M','F','O','T-L,T-R,FB-L-270,GB-FL,GB-BR','Par 5'],
  ['S','N','F','LN','T-S,GB-FL,GB-R','Par 4'],
  ['S','N','F','T','T-S,GB-FL,GB-R','Par 3'],
  ['DR','N','F','K','T-L,T-R,FB-R-260,GB-FR','Par 4'],
  ['S','M','F','O','T-L,T-R,FB-L-260,GB-FL','Par 4'],
  ['DL','N','F','T','T-L,T-R,FB-L-260,GB-FL,GB-R','Par 4'],
  ['S','N','F','K','T-S,GB-FL,GB-R','Par 4'],
  ['S','N','F','O','T-S,GB-FL,GB-R','Par 3'],
  ['DR','M','F','T','T-L,T-R,FB-R-270,GB-FL,GB-BR','Par 5'],
  ['DL','N','F','K','T-L,T-R,FB-L-260,GB-FL','Par 4'],
  ['S','N','F','O','T-L,T-R,GB-FL,GB-R','Par 4'],
  ['S','N','F','T','T-S,GB-FL,GB-R','Par 3'],
  ['DR','N','F','LN','T-L,T-R,FB-R-260,GB-FL','Par 4'],
  ['S','N','F','T','T-L,T-R,GB-FL,GB-R','Classic finisher'],
];

// a0000028: Sedgefield CC
courses.a0000028 = [
  ['S','N','F','T','T-L,T-R,FB-L-250,GB-FL,GB-R','Tight opener, classic'],
  ['DL','N','F','O','T-L,T-R,FB-L-260,GB-FL','Tight dogleg'],
  ['S','N','F','K','T-S,GB-FL,GB-R','Par 3'],
  ['S','N','F','T','T-L,T-R,FB-R-260,GB-FL,GB-R','Par 4, narrow'],
  ['DR','M','F','O','T-L,T-R,FB-R-270,GB-FL,GB-BR','Par 5'],
  ['S','N','F','LN','T-S,GB-FL,GB-R','Par 4'],
  ['S','N','F','T','T-S,GB-FL,GB-R','Par 3'],
  ['DL','N','F','K','T-L,T-R,W-L,FB-R-260,GB-FL','Par 4, water left'],
  ['S','N','F','O','T-L,T-R,FB-L-260,GB-FL','Par 4'],
  ['DR','N','F','T','T-L,T-R,FB-R-260,GB-FL,GB-R','Par 4'],
  ['S','N','F','K','T-S,FB-L-260,GB-FL,GB-R','Par 4'],
  ['S','N','F','O','T-S,GB-FL,GB-R','Par 3'],
  ['DL','M','F','T','T-L,T-R,FB-L-270,GB-FL,GB-BR','Par 5'],
  ['S','N','F','K','T-L,T-R,FB-R-260,GB-FL','Par 4'],
  ['DR','N','F','O','T-L,T-R,W-R,GB-FR','Par 4, water right'],
  ['S','N','F','T','T-S,GB-FL,GB-R','Par 3'],
  ['S','N','F','LN','T-L,T-R,FB-L-260,GB-FL,GB-R','Par 4'],
  ['S','N','U','T','T-L,T-R,GB-FL,GB-R','Uphill finisher, Wyndham classic'],
];

// a0000029: TPC Twin Cities
courses.a0000029 = [
  ['S','M','F','T','FB-L-260,GB-FR,W-R','Par 4, water right'],
  ['DL','M','F','O','W-L-270,FB-R-260,GB-FL','Par 4, water left'],
  ['S','N','F','K','W-F,GB-L,GB-R,FC-165','Par 3 over water'],
  ['DR','M','F','T','FB-R-270,GB-FL,W-R','Par 4'],
  ['DL','W','F','O','W-L-290,FB-R-280,GB-FL,GB-BR','Par 5, water left'],
  ['S','M','F','LN','FB-L-260,GB-FL,GB-R','Par 4'],
  ['S','N','F','T','GB-FL,GB-R,W-R','Par 3'],
  ['DR','M','F','K','FB-R-260,GB-FR,T-L','Par 4'],
  ['S','M','F','O','FB-L-260,GB-FL,GB-R','Par 4'],
  ['DL','M','F','T','W-L,FB-R-260,GB-FL','Par 4, water left'],
  ['S','M','F','K','FB-R-260,GB-FL,GB-R','Par 4'],
  ['S','N','F','O','W-F,GB-L,GB-R,FC-175','Par 3 over water'],
  ['DR','W','F','T','W-R-290,FB-L-270,GB-FL,GB-BR','Par 5, water right'],
  ['S','M','F','K','FB-L-260,GB-FL,GB-R','Par 4'],
  ['DL','M','F','O','W-L,FB-R-260,GB-FL','Par 4, water left'],
  ['S','N','F','T','GB-FL,GB-R,W-L','Par 3'],
  ['DR','M','F','LN','W-R,FB-L-260,GB-FR','Par 4, water right'],
  ['S','M','F','T','W-L,W-R,GB-FL,GB-BR','Par 4, water both sides'],
];

// a0000030: Southern Hills CC
courses.a0000030 = [
  ['S','M','X','T','FB-L-260,GB-FR,T-R','Perry Maxwell opener'],
  ['DL','M','X','O','W-L-270,T-R,FB-R-260,GB-FL','Par 4, creek left'],
  ['S','N','X','K','GB-FL,GB-R,T-S','Par 3'],
  ['DR','M','X','T','W-R,FB-L-260,GB-FL,T-L','Par 4, creek right'],
  ['DL','W','X','O','W-L-280,FB-R-270,GB-FL,GB-BR','Par 5, creek left'],
  ['S','M','X','LN','FB-L-260,GB-FL,GB-R,T-S','Par 4'],
  ['S','N','X','T','GB-FL,GB-R,W-F,FC-170','Par 3'],
  ['DR','M','X','K','W-R,FB-L-260,GB-FR,T-L','Par 4, creek right'],
  ['S','M','X','O','FB-R-260,GB-FL,T-L','Par 4'],
  ['DL','M','X','T','W-L,FB-R-260,GB-FL,T-R','Par 4, creek left'],
  ['S','M','X','K','FB-L-260,GB-FL,GB-R','Par 4'],
  ['S','N','X','O','GB-FL,GB-R,T-S','Par 3, Tulsa heat'],
  ['DR','W','X','T','W-R,FB-L-280,GB-FL,GB-BR','Par 5, creek right'],
  ['S','M','X','LN','FB-R-260,GB-FL,GB-R','Par 4'],
  ['DL','M','X','K','W-L,FB-R-260,GB-FL','Par 4, creek left'],
  ['S','N','X','T','GB-FL,GB-R,W-R','Par 3'],
  ['S','M','X','O','FB-L-260,GB-FL,GB-R,T-S','Par 4'],
  ['S','M','U','T','W-L,GB-FL,GB-R,T-S','Uphill finish, creek left'],
];

// ACC School Courses

// a0000031: Duke University GC
courses.a0000031 = [
  ['S','M','X','T','FB-L-250,GB-FR,T-R','RTJ design opener'],
  ['DL','M','X','O','T-L,T-R,FB-L-260,GB-FL','Tree-lined dogleg'],
  ['S','N','X','K','T-S,GB-FL,GB-R','Par 3, Durham pines'],
  ['DR','M','X','T','T-L,T-R,FB-R-260,GB-FL,GB-R','Par 4'],
  ['DL','W','X','O','T-L,T-R,FB-L-280,GB-FL,GB-BR','Par 5'],
  ['S','M','X','LN','T-S,FB-R-260,GB-FL,GB-R','Par 4'],
  ['S','N','X','T','T-S,GB-FL,GB-R','Par 3'],
  ['DR','M','X','K','T-L,T-R,FB-R-260,GB-FR','Par 4'],
  ['S','M','X','O','T-L,T-R,FB-L-260,GB-FL','Par 4'],
  ['DL','M','X','T','W-L,T-R,FB-R-260,GB-FL','Par 4, pond left'],
  ['S','M','X','K','T-L,T-R,FB-L-260,GB-FL,GB-R','Par 4'],
  ['S','N','X','O','T-S,GB-FL,GB-R','Par 3'],
  ['DR','W','X','T','T-L,T-R,FB-R-280,GB-FL,GB-BR','Par 5'],
  ['DL','M','X','LN','T-L,T-R,FB-L-260,GB-FL','Par 4'],
  ['S','M','X','K','T-L,T-R,GB-FL,GB-R','Par 4'],
  ['S','N','X','T','T-S,GB-FL,GB-R','Par 3'],
  ['S','M','X','O','T-L,T-R,FB-R-260,GB-FL,GB-R','Par 4'],
  ['S','M','U','T','T-L,T-R,GB-FL,GB-R','Uphill finisher'],
];

// a0000032: Don Veller Seminole GC (FSU)
courses.a0000032 = [
  ['S','W','F','T','FB-L-260,GB-FR','Flat Florida opener'],
  ['DL','W','F','O','W-L-270,FB-R-260,GB-FL','Water left'],
  ['S','N','F','K','W-F,GB-L,GB-R,FC-150','Par 3 over water'],
  ['DR','W','F','T','FB-R-270,GB-FL,W-R','Par 4, water right'],
  ['S','W','F','O','W-L-280,FB-R-270,GB-FL,GB-BR','Par 5, water left'],
  ['S','M','F','LN','FB-L-260,GB-FL,GB-R','Par 4'],
  ['S','N','F','T','GB-FL,GB-R,W-R','Par 3'],
  ['DL','M','F','K','W-L,FB-R-260,GB-FL','Par 4'],
  ['S','W','F','O','FB-L-280,FB-R-300,GB-FL,GB-BR','Par 5'],
  ['DR','M','F','T','FB-R-260,GB-FL,GB-R','Par 4'],
  ['S','M','F','K','W-R,FB-L-260,GB-FL','Par 4'],
  ['S','N','F','O','W-F,GB-L,FC-160','Par 3 over pond'],
  ['DL','M','F','T','W-L,FB-R-260,GB-FL','Par 4'],
  ['S','M','F','LN','FB-L-260,GB-FL,GB-R','Par 4'],
  ['DR','W','F','K','W-R,FB-L-280,GB-FL,GB-BR','Par 5, water right'],
  ['S','M','F','T','FB-R-260,GB-FL,GB-R','Par 4'],
  ['S','N','F','O','W-F,GB-L,GB-R,FC-155','Par 3'],
  ['S','M','F','T','W-L,GB-FL,GB-R','Par 4, Florida flat finish'],
];

// a0000033: Golf Club of Georgia Lakeside
courses.a0000033 = [
  ['S','M','X','T','FB-L-260,GB-FR,W-R','Atlanta area, rolling'],
  ['DL','M','X','O','W-L-270,FB-R-260,GB-FL','Water left'],
  ['S','N','X','K','W-F,GB-L,GB-R,FC-170','Par 3 over water'],
  ['DR','M','X','T','FB-R-270,GB-FL,T-L','Par 4'],
  ['DL','W','X','O','W-L-290,FB-R-280,GB-FL,GB-BR','Par 5, lake left'],
  ['S','M','X','LN','FB-L-260,GB-FL,GB-R,T-S','Par 4'],
  ['S','N','X','T','GB-FL,GB-R,W-R','Par 3'],
  ['DR','M','X','K','W-R,FB-L-260,GB-FR','Par 4, lakeside'],
  ['S','M','X','O','FB-R-260,GB-FL,T-L','Par 4'],
  ['DL','M','X','T','W-L,FB-R-260,GB-FL','Par 4, water left'],
  ['S','M','X','K','FB-L-260,GB-FL,GB-R','Par 4'],
  ['S','N','X','O','W-F,GB-L,GB-R,FC-175','Par 3 over water'],
  ['DR','W','X','T','W-R-290,FB-L-280,GB-FL,GB-BR','Par 5, lake right'],
  ['S','M','X','LN','FB-R-260,GB-FL,T-L','Par 4'],
  ['DL','M','X','K','W-L,FB-R-260,GB-FL','Par 4'],
  ['S','N','X','T','GB-FL,GB-R','Par 3'],
  ['S','M','X','O','FB-L-260,GB-FL,GB-R','Par 4'],
  ['S','M','U','T','W-L,GB-FL,GB-R','Uphill finish, lake left'],
];

// a0000034: Stanford Golf Course
courses.a0000034 = [
  ['S','M','X','T','FB-L-260,GB-FR,T-R','Bay Area, rolling opener'],
  ['DL','M','X','O','T-L,T-R,FB-L-260,GB-FL','Dogleg through oaks'],
  ['S','N','X','K','GB-FL,GB-R,T-S','Par 3'],
  ['DR','M','X','T','FB-R-270,GB-FL,T-L','Rolling par 4'],
  ['DL','W','X','O','FB-L-280,GB-FL,GB-BR,T-R','Par 5'],
  ['S','M','X','LN','FB-R-260,GB-FL,GB-R','Par 4'],
  ['S','N','X','T','GB-FL,GB-R,T-S','Par 3'],
  ['DR','M','X','K','FB-R-260,GB-FR,T-L','Par 4'],
  ['S','M','X','O','FB-L-260,GB-FL,T-R','Par 4'],
  ['DL','M','X','T','FB-L-260,GB-FL,GB-R','Par 4'],
  ['S','M','X','K','FB-R-260,GB-FL,GB-R','Par 4'],
  ['S','N','X','O','GB-FL,GB-R,T-S','Par 3'],
  ['DR','W','X','T','FB-R-280,GB-FL,GB-BR,T-L','Par 5'],
  ['S','M','X','LN','FB-L-260,GB-FL,GB-R','Par 4'],
  ['DL','M','X','K','FB-L-260,GB-FL,T-R','Par 4'],
  ['S','N','X','T','GB-FL,GB-R','Par 3'],
  ['S','M','X','O','FB-R-260,GB-FL,GB-R','Par 4'],
  ['S','M','U','T','FB-L-260,GB-FL,GB-R','Uphill finisher'],
];

// a0000035: Biltmore GC (Coral Gables FL)
courses.a0000035 = [
  ['S','W','F','T','FB-L-260,GB-FR,W-R','Flat Florida, wide opener'],
  ['DL','W','F','O','W-L-270,FB-R-260,GB-FL','Water left'],
  ['S','N','F','K','W-F,GB-L,GB-R,FC-155','Par 3 over water'],
  ['DR','W','F','T','FB-R-270,GB-FL,W-R','Par 4'],
  ['S','W','F','O','W-L-280,FB-R-270,GB-FL,GB-BR','Par 5, canal left'],
  ['S','M','F','LN','FB-L-260,GB-FL,GB-R','Par 4'],
  ['S','N','F','T','GB-FL,GB-R,W-R','Par 3'],
  ['DL','M','F','K','W-L,FB-R-260,GB-FL','Par 4'],
  ['S','W','F','O','FB-L-280,FB-R-300,GB-FL,GB-BR','Par 5, flat'],
  ['DR','M','F','T','FB-R-260,GB-FL,GB-R','Par 4'],
  ['S','M','F','K','W-R,FB-L-260,GB-FL','Par 4'],
  ['S','N','F','O','W-F,GB-L,FC-160','Par 3'],
  ['DL','M','F','T','W-L,FB-R-260,GB-FL','Par 4'],
  ['S','M','F','LN','FB-L-260,GB-FL,GB-R','Par 4'],
  ['DR','W','F','K','W-R,FB-L-280,GB-FL,GB-BR','Par 5'],
  ['S','M','F','T','FB-R-260,GB-FL,GB-R','Par 4'],
  ['S','N','F','O','W-F,GB-L,GB-R,FC-150','Par 3'],
  ['S','M','F','T','W-R,GB-FL,GB-R','Par 4, flat finish'],
];

// a0000036: Trinity Forest GC (Dallas)
courses.a0000036 = [
  ['S','W','F','T','WA-L,WA-R,GB-FL','Minimalist, wide open'],
  ['DL','W','F','O','WA-L,GB-FL,GB-R','Par 4, no trees'],
  ['S','N','F','K','WA-S,GB-FL,GB-R','Par 3, dunes'],
  ['DR','W','F','T','WA-R,GB-FL,GB-BR','Par 4, waste right'],
  ['S','W','F','O','WA-L,WA-R,GB-FL,GB-BR','Par 5, wide open'],
  ['S','M','F','LN','WA-L,GB-FL,GB-R','Par 4'],
  ['S','N','F','T','WA-S,GB-FL,GB-R','Par 3'],
  ['DL','W','F','K','WA-L,GB-FL,GB-BR','Par 4'],
  ['S','W','F','O','WA-L,WA-R,GB-FL,GB-BR','Par 5, minimalist'],
  ['DR','M','F','T','WA-R,GB-FL,GB-R','Par 4'],
  ['S','M','F','K','WA-L,GB-FL,GB-R','Par 4'],
  ['S','N','F','O','WA-S,GB-FL,GB-R','Par 3'],
  ['DL','M','F','T','WA-L,GB-FL','Par 4'],
  ['S','M','F','LN','WA-R,GB-FL,GB-R','Par 4'],
  ['DR','W','F','K','WA-L,WA-R,GB-FL,GB-BR','Par 5'],
  ['S','M','F','T','WA-R,GB-FL,GB-R','Par 4'],
  ['S','N','F','O','WA-S,GB-FL,GB-R','Par 3'],
  ['S','M','F','T','WA-L,WA-R,GB-FL,GB-R','Minimalist finish'],
];

// a0000037: UNC Finley GC (Chapel Hill)
courses.a0000037 = [
  ['S','M','X','T','FB-L-260,GB-FR,T-R','Rolling NC opener'],
  ['DL','M','X','O','T-L,T-R,FB-L-260,GB-FL','Dogleg, wooded'],
  ['S','N','X','K','T-S,GB-FL,GB-R','Par 3, pines'],
  ['DR','M','X','T','T-L,T-R,FB-R-260,GB-FL,GB-R','Par 4'],
  ['DL','W','X','O','T-L,T-R,FB-L-280,GB-FL,GB-BR','Par 5, rolling'],
  ['S','M','X','LN','T-S,FB-R-260,GB-FL,GB-R','Par 4'],
  ['S','N','X','T','T-S,GB-FL,GB-R','Par 3'],
  ['DR','M','X','K','T-L,T-R,FB-R-260,GB-FR','Par 4'],
  ['S','M','X','O','T-L,T-R,FB-L-260,GB-FL','Par 4, near campus'],
  ['DL','M','X','T','W-L,T-R,FB-R-260,GB-FL','Par 4, pond left'],
  ['S','M','X','K','T-L,T-R,FB-L-260,GB-FL,GB-R','Par 4'],
  ['S','N','X','O','T-S,GB-FL,GB-R','Par 3'],
  ['DR','W','X','T','T-L,T-R,FB-R-280,GB-FL,GB-BR','Par 5'],
  ['DL','M','X','LN','T-L,T-R,FB-L-260,GB-FL','Par 4'],
  ['S','M','X','K','T-L,T-R,GB-FL,GB-R','Par 4'],
  ['S','N','X','T','T-S,GB-FL,GB-R','Par 3'],
  ['S','M','X','O','T-L,T-R,FB-R-260,GB-FL,GB-R','Par 4'],
  ['S','M','U','T','T-L,T-R,GB-FL,GB-R','Tar Heel finish'],
];

// a0000038: University of Louisville GC
courses.a0000038 = [
  ['S','M','F','T','FB-L-260,GB-FR,T-R','Kentucky opener'],
  ['DL','M','F','O','T-L,T-R,FB-L-260,GB-FL','Par 4'],
  ['S','N','F','K','W-F,GB-L,GB-R,FC-160','Par 3 over water'],
  ['DR','M','F','T','FB-R-270,GB-FL,T-L','Par 4'],
  ['DL','W','F','O','W-L-280,FB-R-270,GB-FL,GB-BR','Par 5, water left'],
  ['S','M','F','LN','FB-L-260,GB-FL,GB-R','Par 4'],
  ['S','N','F','T','GB-FL,GB-R,W-R','Par 3'],
  ['DR','M','F','K','FB-R-260,GB-FR,T-L','Par 4'],
  ['S','M','F','O','FB-L-260,GB-FL,T-R','Par 4'],
  ['DL','M','F','T','W-L,FB-R-260,GB-FL','Par 4, creek left'],
  ['S','M','F','K','FB-R-260,GB-FL,GB-R','Par 4'],
  ['S','N','F','O','W-F,GB-L,GB-R,FC-165','Par 3'],
  ['DR','W','F','T','W-R-280,FB-L-270,GB-FL,GB-BR','Par 5'],
  ['S','M','F','LN','FB-L-260,GB-FL,GB-R','Par 4'],
  ['DL','M','F','K','W-L,FB-R-260,GB-FL','Par 4, water left'],
  ['S','N','F','T','GB-FL,GB-R','Par 3'],
  ['S','M','F','O','FB-R-260,GB-FL,GB-R','Par 4'],
  ['S','M','F','T','W-L,GB-FL,GB-R','Cardinals finish'],
];

// a0000039: Brae Burn CC (Newton MA)
courses.a0000039 = [
  ['S','N','X','T','T-L,T-R,FB-L-250,GB-FL,GB-R','New England, tree-lined'],
  ['DL','N','X','O','T-L,T-R,FB-L-260,GB-FL','Dogleg through maples'],
  ['S','N','X','K','T-S,GB-FL,GB-R','Par 3'],
  ['DR','N','X','T','T-L,T-R,FB-R-260,GB-FL,GB-R','Par 4'],
  ['DL','M','X','O','T-L,T-R,FB-L-270,GB-FL,GB-BR','Par 5'],
  ['S','N','X','LN','T-S,FB-R-260,GB-FL,GB-R','Par 4'],
  ['S','N','X','T','T-S,GB-FL,GB-R','Par 3'],
  ['DR','N','X','K','T-L,T-R,FB-R-260,GB-FR','Par 4'],
  ['S','N','X','O','T-L,T-R,FB-L-260,GB-FL','Par 4'],
  ['DL','N','X','T','T-L,T-R,W-L,FB-R-260,GB-FL','Par 4, water left'],
  ['S','N','X','K','T-S,FB-L-260,GB-FL,GB-R','Par 4'],
  ['S','N','X','O','T-S,GB-FL,GB-R','Par 3'],
  ['DR','M','X','T','T-L,T-R,FB-R-270,GB-FL,GB-BR','Par 5'],
  ['DL','N','X','K','T-L,T-R,FB-L-260,GB-FL','Par 4'],
  ['S','N','X','O','T-L,T-R,GB-FL,GB-R','Par 4'],
  ['S','N','X','T','T-S,GB-FL,GB-R','Par 3'],
  ['S','N','X','LN','T-L,T-R,FB-R-260,GB-FL,GB-R','Par 4'],
  ['S','N','U','T','T-L,T-R,GB-FL,GB-R','Uphill New England finish'],
];

// a0000040: Pete Dye River Course (VT)
courses.a0000040 = [
  ['S','M','D','T','W-L,T-R,FB-R-260,GB-FL','Mountain river opener'],
  ['DL','M','X','O','W-L-270,T-R,GB-FL','Par 4, river left'],
  ['S','N','U','K','GB-FL,GB-R,T-S,FC-170','Uphill par 3'],
  ['DR','M','D','T','W-R,FB-L-260,GB-FR','Par 4, river right'],
  ['DL','W','X','O','W-L-280,T-R,FB-R-270,GB-FL,GB-BR','Par 5, river left'],
  ['S','M','U','LN','T-S,FB-R-260,GB-FL,GB-R','Uphill par 4'],
  ['S','N','D','T','W-F,GB-L,GB-R,FC-165','Downhill par 3 toward river'],
  ['DR','M','X','K','W-R,T-L,FB-L-260,GB-FR','Par 4, river bends'],
  ['S','M','U','O','T-L,T-R,FB-L-260,GB-FL','Par 4, mountain climb'],
  ['DL','M','D','T','W-L,T-R,FB-R-260,GB-FL','Par 4, back to river'],
  ['S','M','X','K','W-R,FB-L-260,GB-FL,GB-R','Par 4'],
  ['S','N','U','O','T-S,GB-FL,GB-R,FC-180','Par 3, uphill'],
  ['DR','W','D','T','W-R-290,FB-L-270,GB-FL,GB-BR','Par 5, river right'],
  ['S','M','X','LN','T-L,T-R,FB-R-260,GB-FL','Par 4'],
  ['DL','M','U','K','W-L,T-R,GB-FL','Par 4, river left'],
  ['S','N','D','T','W-F,GB-L,GB-R,FC-160','Par 3 over river'],
  ['S','M','X','O','W-R,T-L,FB-L-260,GB-FL,GB-R','Par 4'],
  ['S','M','D','T','W-L,W-R,GB-FL,GB-BR','River finish, Pete Dye drama'],
];

// a0000041: Walker Course (Clemson)
courses.a0000041 = [
  ['S','M','X','T','FB-L-260,GB-FR,T-R','SC rolling opener'],
  ['DL','M','X','O','T-L,T-R,FB-L-260,GB-FL','Par 4, pines'],
  ['S','N','X','K','T-S,GB-FL,GB-R','Par 3'],
  ['DR','M','X','T','FB-R-270,GB-FL,T-L','Par 4'],
  ['DL','W','X','O','T-L,T-R,FB-L-280,GB-FL,GB-BR','Par 5'],
  ['S','M','X','LN','FB-R-260,GB-FL,GB-R,T-S','Par 4'],
  ['S','N','X','T','W-F,GB-L,GB-R,FC-165','Par 3 over water'],
  ['DR','M','X','K','T-L,T-R,FB-R-260,GB-FR','Par 4'],
  ['S','M','X','O','T-L,T-R,FB-L-260,GB-FL','Par 4'],
  ['DL','M','X','T','W-L,T-R,FB-R-260,GB-FL','Par 4, pond left'],
  ['S','M','X','K','T-L,T-R,FB-L-260,GB-FL,GB-R','Par 4'],
  ['S','N','X','O','T-S,GB-FL,GB-R','Par 3'],
  ['DR','W','X','T','T-L,T-R,FB-R-280,GB-FL,GB-BR','Par 5'],
  ['DL','M','X','LN','T-L,T-R,FB-L-260,GB-FL','Par 4'],
  ['S','M','X','K','T-L,T-R,GB-FL,GB-R','Par 4'],
  ['S','N','X','T','GB-FL,GB-R,W-R','Par 3'],
  ['S','M','X','O','T-L,T-R,FB-R-260,GB-FL,GB-R','Par 4'],
  ['S','M','U','T','T-L,T-R,GB-FL,GB-R','Tiger finish'],
];

// a0000042: Drumlins CC (Syracuse NY)
courses.a0000042 = [
  ['S','N','X','T','T-L,T-R,FB-L-250,GB-FL,GB-R','Syracuse opener, hilly'],
  ['DL','N','U','O','T-L,T-R,FB-L-260,GB-FL','Uphill dogleg'],
  ['S','N','D','K','T-S,GB-FL,GB-R','Downhill par 3'],
  ['DR','N','X','T','T-L,T-R,FB-R-260,GB-FL,GB-R','Par 4'],
  ['DL','M','X','O','T-L,T-R,FB-L-270,GB-FL,GB-BR','Par 5'],
  ['S','N','U','LN','T-S,FB-R-260,GB-FL,GB-R','Uphill par 4'],
  ['S','N','D','T','T-S,GB-FL,GB-R','Par 3'],
  ['DR','N','X','K','T-L,T-R,FB-R-260,GB-FR','Par 4'],
  ['S','N','X','O','T-L,T-R,FB-L-260,GB-FL','Par 4'],
  ['DL','N','X','T','T-L,T-R,W-L,FB-R-260,GB-FL','Par 4, pond left'],
  ['S','N','X','K','T-S,FB-L-260,GB-FL,GB-R','Par 4'],
  ['S','N','U','O','T-S,GB-FL,GB-R','Uphill par 3'],
  ['DR','M','X','T','T-L,T-R,FB-R-270,GB-FL,GB-BR','Par 5'],
  ['DL','N','X','K','T-L,T-R,FB-L-260,GB-FL','Par 4'],
  ['S','N','X','O','T-L,T-R,GB-FL,GB-R','Par 4'],
  ['S','N','D','T','T-S,GB-FL,GB-R','Par 3'],
  ['S','N','X','LN','T-L,T-R,FB-R-260,GB-FL,GB-R','Par 4'],
  ['S','N','U','T','T-L,T-R,GB-FL,GB-R','Uphill Central NY finish'],
];

// a0000043: Birdwood GC (UVA) - Lester George redesign
courses.a0000043 = [
  ['S','M','X','T','FB-L-260,GB-FR,WA-R','Modern redesign opener'],
  ['DL','M','X','O','WA-L,FB-R-260,GB-FL','Dogleg, waste area'],
  ['S','N','X','K','WA-S,GB-FL,GB-R','Par 3, waste bunkers'],
  ['DR','M','X','T','FB-R-270,GB-FL,WA-L','Par 4, Charlottesville hills'],
  ['DL','W','X','O','WA-L,FB-R-280,GB-FL,GB-BR','Par 5'],
  ['S','M','X','LN','WA-R,FB-L-260,GB-FL,GB-R','Par 4'],
  ['S','N','X','T','WA-S,GB-FL,GB-R','Par 3'],
  ['DR','M','X','K','WA-R,FB-R-260,GB-FR','Par 4'],
  ['S','M','X','O','WA-L,FB-L-260,GB-FL','Par 4'],
  ['DL','M','X','T','W-L,WA-R,FB-R-260,GB-FL','Par 4, pond left'],
  ['S','M','X','K','WA-L,FB-L-260,GB-FL,GB-R','Par 4'],
  ['S','N','X','O','WA-S,GB-FL,GB-R','Par 3'],
  ['DR','W','X','T','WA-R,FB-R-280,GB-FL,GB-BR','Par 5, Lester George design'],
  ['DL','M','X','LN','WA-L,FB-L-260,GB-FL','Par 4'],
  ['S','M','X','K','WA-R,GB-FL,GB-R','Par 4'],
  ['S','N','X','T','WA-S,GB-FL,GB-R','Par 3'],
  ['S','M','X','O','WA-L,FB-R-260,GB-FL,GB-R','Par 4'],
  ['S','M','U','T','WA-L,WA-R,GB-FL,GB-R','Wahoo finish uphill'],
];

// a0000044: Warren GC (Notre Dame)
courses.a0000044 = [
  ['S','M','F','T','FB-L-260,GB-FR,T-R','Indiana opener'],
  ['DL','M','F','O','T-L,T-R,FB-L-260,GB-FL','Par 4, maples'],
  ['S','N','F','K','W-F,GB-L,GB-R,FC-160','Par 3 over water'],
  ['DR','M','F','T','FB-R-270,GB-FL,T-L','Par 4'],
  ['DL','W','F','O','W-L-280,FB-R-270,GB-FL,GB-BR','Par 5, water left'],
  ['S','M','F','LN','FB-L-260,GB-FL,GB-R','Par 4'],
  ['S','N','F','T','GB-FL,GB-R,W-R','Par 3'],
  ['DR','M','F','K','FB-R-260,GB-FR,T-L','Par 4'],
  ['S','M','F','O','FB-L-260,GB-FL,T-R','Par 4'],
  ['DL','M','F','T','W-L,FB-R-260,GB-FL','Par 4, creek left'],
  ['S','M','F','K','FB-R-260,GB-FL,GB-R','Par 4'],
  ['S','N','F','O','W-F,GB-L,GB-R,FC-165','Par 3'],
  ['DR','W','F','T','W-R-280,FB-L-270,GB-FL,GB-BR','Par 5'],
  ['S','M','F','LN','FB-L-260,GB-FL,GB-R','Par 4'],
  ['DL','M','F','K','W-L,FB-R-260,GB-FL','Par 4'],
  ['S','N','F','T','GB-FL,GB-R','Par 3'],
  ['S','M','F','O','FB-R-260,GB-FL,GB-R','Par 4'],
  ['S','M','F','T','W-L,GB-FL,GB-R','Fighting Irish finish'],
];

// a0000045: Old Town Club (Winston-Salem NC)
courses.a0000045 = [
  ['S','M','X','T','FB-L-260,GB-FR,T-R','Winston-Salem, rolling'],
  ['DL','M','X','O','T-L,T-R,FB-L-260,GB-FL','Dogleg, NC pines'],
  ['S','N','X','K','T-S,GB-FL,GB-R','Par 3'],
  ['DR','M','X','T','T-L,T-R,FB-R-260,GB-FL,GB-R','Par 4'],
  ['DL','W','X','O','T-L,T-R,FB-L-280,GB-FL,GB-BR','Par 5'],
  ['S','M','X','LN','T-S,FB-R-260,GB-FL,GB-R','Par 4'],
  ['S','N','X','T','T-S,GB-FL,GB-R','Par 3'],
  ['DR','M','X','K','T-L,T-R,FB-R-260,GB-FR','Par 4'],
  ['S','M','X','O','T-L,T-R,FB-L-260,GB-FL','Par 4'],
  ['DL','M','X','T','T-L,T-R,W-L,FB-R-260,GB-FL','Par 4'],
  ['S','M','X','K','T-S,FB-L-260,GB-FL,GB-R','Par 4'],
  ['S','N','X','O','T-S,GB-FL,GB-R','Par 3'],
  ['DR','W','X','T','T-L,T-R,FB-R-280,GB-FL,GB-BR','Par 5'],
  ['DL','M','X','LN','T-L,T-R,FB-L-260,GB-FL','Par 4'],
  ['S','M','X','K','T-L,T-R,GB-FL,GB-R','Par 4'],
  ['S','N','X','T','T-S,GB-FL,GB-R','Par 3'],
  ['S','M','X','O','T-L,T-R,FB-R-260,GB-FL,GB-R','Par 4'],
  ['S','M','U','T','T-L,T-R,GB-FL,GB-R','Deacon finish'],
];

// a0000046: Tilden Park GC (Berkeley CA)
courses.a0000046 = [
  ['S','M','U','T','T-L,T-R,FB-L-240,GB-FR','Hilly public opener'],
  ['DL','N','U','O','T-L,T-R,GB-FL','Steep uphill dogleg'],
  ['S','N','D','K','T-S,GB-FL,GB-R','Downhill par 3'],
  ['DR','M','U','T','T-L,T-R,FB-R-250,GB-FL','Uphill par 4'],
  ['DL','M','D','O','T-L,T-R,FB-L-260,GB-FL,GB-BR','Par 5, downhill'],
  ['S','N','U','LN','T-S,GB-FL,GB-R','Steep par 4'],
  ['S','N','D','T','T-S,GB-FL,GB-R','Par 3, downhill'],
  ['DR','M','U','K','T-L,T-R,FB-R-250,GB-FR','Par 4, bay views'],
  ['S','M','X','O','T-L,T-R,FB-L-250,GB-FL','Par 4'],
  ['DL','M','D','T','T-L,T-R,FB-L-250,GB-FL,GB-R','Par 4, downhill'],
  ['S','N','U','K','T-S,FB-L-250,GB-FL,GB-R','Par 4, uphill'],
  ['S','N','D','O','T-S,GB-FL,GB-R','Downhill par 3'],
  ['DR','M','U','T','T-L,T-R,FB-R-260,GB-FL,GB-BR','Par 5, uphill'],
  ['DL','M','X','K','T-L,T-R,FB-L-250,GB-FL','Par 4'],
  ['S','M','D','O','T-L,T-R,GB-FL,GB-R','Downhill par 4'],
  ['S','N','U','T','T-S,GB-FL,GB-R','Uphill par 3'],
  ['S','M','X','LN','T-L,T-R,FB-R-250,GB-FL,GB-R','Par 4'],
  ['S','M','U','T','T-L,T-R,GB-FL,GB-R','Hilly finish back to clubhouse'],
];

// a0000047: Longue Vue Club (Pittsburgh PA)
courses.a0000047 = [
  ['S','M','X','T','FB-L-260,GB-FR,T-R','Pittsburgh opener, rolling'],
  ['DL','M','X','O','T-L,T-R,FB-L-260,GB-FL','Par 4, hardwoods'],
  ['S','N','X','K','T-S,GB-FL,GB-R','Par 3'],
  ['DR','M','X','T','T-L,T-R,FB-R-260,GB-FL,GB-R','Par 4'],
  ['DL','W','X','O','T-L,T-R,FB-L-280,GB-FL,GB-BR','Par 5, creek'],
  ['S','M','X','LN','T-S,FB-R-260,GB-FL,GB-R','Par 4'],
  ['S','N','X','T','T-S,GB-FL,GB-R,W-F,FC-165','Par 3 over water'],
  ['DR','M','X','K','T-L,T-R,FB-R-260,GB-FR','Par 4'],
  ['S','M','X','O','T-L,T-R,FB-L-260,GB-FL','Par 4'],
  ['DL','M','X','T','W-L,T-R,FB-R-260,GB-FL','Par 4, creek left'],
  ['S','M','X','K','T-S,FB-L-260,GB-FL,GB-R','Par 4'],
  ['S','N','X','O','T-S,GB-FL,GB-R','Par 3'],
  ['DR','W','X','T','W-R-280,T-L,FB-L-270,GB-FL,GB-BR','Par 5, creek right'],
  ['DL','M','X','LN','T-L,T-R,FB-L-260,GB-FL','Par 4'],
  ['S','M','X','K','T-L,T-R,GB-FL,GB-R','Par 4'],
  ['S','N','X','T','T-S,GB-FL,GB-R','Par 3'],
  ['S','M','X','O','T-L,T-R,FB-R-260,GB-FL,GB-R','Par 4'],
  ['S','M','U','T','T-L,T-R,W-L,GB-FL,GB-R','Uphill finish, Pittsburgh steel'],
];

// ============================================================
// Build output
// ============================================================

const output = {};

// Also keep legacy keys that existed
const LEGACY_KEYS = {
  'a1000001': 'a0000001',
  'a2000001': 'a0000001',
};

for (const [shortId, holes] of Object.entries(courses)) {
  const key = toKey(shortId);
  output[key] = expandCourse(holes);
}

// Add legacy aliases pointing to Lonnie Poole data
output[toKey('a1000001')] = output[toKey('a0000001')];
output[toKey('a2000001')] = output[toKey('a0000001')];

const outPath = path.join(__dirname, '..', 'src', 'data', 'hole-metadata.json');
fs.writeFileSync(outPath, JSON.stringify(output, null, 2) + '\n');

const courseCount = Object.keys(output).length;
const holeCount = Object.values(output).reduce((sum, c) => sum + Object.keys(c).length, 0);
console.log(`✅ Generated ${courseCount} courses, ${holeCount} holes → ${outPath}`);
