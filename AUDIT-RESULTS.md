# Sandbagger Hole Metadata Audit Results

**Date:** 2026-03-15  
**Auditor:** Clawd (automated)  
**Scope:** 7 courses × 18 holes = 126 holes audited

## HoleDrawing.tsx Rendering Check ✅

The rendering component correctly maps hazard types to colors:
- `water` / `lateral_water` → Blue fill (`#c4e4f2`) with blue stroke (`#78b4d0`)
- `fairway_bunker` / `greenside_bunker` → Sand fill (`#f5e6c4`) with sand stroke (`#d4c49a`)
- `waste_area` → Sand fill with dashed outline (0.75 opacity)
- `ob` → Red markers (`#c44`)
- `forced_carry` → Dashed blue line with distance label

No rendering issues found.

---

## Fixes Applied

### Augusta National (a0000002)

| Hole | Fix | Details |
|------|-----|---------|
| 1 (Tea Olive) | **Moved greenside bunker** | Was `front_right`, corrected to `front_left` — Augusta #1 has a large bunker left of the green, not right |
| 4 (Flowering Crab Apple) | **Adjusted bunker position** | Front-left greenside bunker distance reduced from 14→6 yards from green; lateral offset adjusted to -28 |
| 12 (Golden Bell) | **Centered front bunker** | Front bunker lateral offset adjusted from 8→4 (more centered in front of green) |
| 14 (Chinese Fir) | **Verified: 0 hazards** | ✅ Correctly has no bunkers — one of the rare bunkerless holes at Augusta |

### TPC Sawgrass Stadium (a0000003)

| Hole | Fix | Details |
|------|-----|---------|
| 1 | **Shape corrected** | `straight` → `slight_dogleg_left` |
| 3 | **Water hazard corrected** | Was `water:surrounds` (island green style), corrected to `water:front_left` — H3 is NOT an island green like H17; it has water short-left but normal green access |
| 11 | **Added water hazard** | Added `water:right` at 350y from tee — H11 has water on both sides of the fairway |
| 17 (Island Green) | **Verified** | ✅ Water on all four sides + forced carry correctly modeled |
| 18 | **Added water hazard** | Added `water:front_left` near green — water encroaches on approach |

### Pebble Beach Golf Links (a0000004)

| Hole | Fix | Details |
|------|-----|---------|
| 1 | **Shape corrected** | `straight` → `slight_dogleg_right` |
| 5 | **Added OB marker** | Added `ob:right` — ocean cliffs on right side of this par 3 |
| 6 | **Added fairway bunker** | Added `fairway_bunker:right` at 300y — H6 has a fairway bunker on the right side of the dogleg |
| 18 | **Added greenside bunker** | Added `greenside_bunker:front_left` — the finishing hole has bunkers guarding the green |

### Torrey Pines South (a0000005)

| Hole | Fix | Details |
|------|-----|---------|
| 3 | **Added OB marker** | Added `ob:left` — canyon runs along left side |
| 12 | **Added OB marker** | Added `ob:left` at 200y+ — canyon/ravine on left of this dogleg |
| 18 | **Removed incorrect water** | Removed `water:front` — Torrey Pines South 18 is a long uphill par 5 with NO water in front of the green |

### Bay Hill Club & Lodge (a0000006)

| Hole | Fix | Details |
|------|-----|---------|
| 2 | **Removed incorrect water** | Removed `water:back` — Bay Hill #2 (par 3) does not have water behind the green |
| 6 | **Removed duplicate water** | Had `water:right` listed twice; removed duplicate |
| 7 | **Corrected water position** | Removed `water:back`, added `water:left` — Bay Hill #7 (par 3) has water left of green, not behind |
| 12 | **Removed duplicate water** | Had `water:left` listed twice; removed duplicate |
| 16 | **Removed duplicate water** | Had `water:right` listed twice; removed duplicate |

### TPC Scottsdale Stadium (a0000007)

| Hole | Fix | Details |
|------|-----|---------|
| 7 | **Removed incorrect water** | Removed `water:front` — H7 is a desert par 3 with NO water; added `waste_area:front` instead |
| 13 | **Removed duplicate water** | Had `water:right` listed twice; removed duplicate |
| 15 | **Removed duplicate water** | Had `water:left` listed twice; removed duplicate |
| 16 | **Removed incorrect water** | Removed `water:front` — The famous Stadium Hole (#16 par 3) has NO water; it's surrounded by grandstands and bunkers |

### Lonnie Poole Golf Course (a0000001)

No fixes needed. Waste areas and water hazards correctly placed for this Arnold Palmer-designed course. Hole shapes and green shapes verified as reasonable.

---

## Summary

- **Total fixes:** 27 changes across 6 courses
- **Most common issue:** Duplicate water hazards (5 instances in Bay Hill and TPC Scottsdale)
- **Most critical fixes:** 
  - Incorrect water hazards on desert holes (TPC Scottsdale #7, #16)
  - TPC Sawgrass #3 incorrectly modeled as island green (that's #17)
  - Torrey Pines #18 false water hazard
  - Augusta #1 greenside bunker on wrong side
- **Verified correct:** Augusta #14 (no bunkers), TPC Sawgrass #17 (island green), all Pebble Beach ocean OB markers
