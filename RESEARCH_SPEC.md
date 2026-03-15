# Course Research Specification

## Metadata Schema

Each hole needs this data in `src/data/hole-metadata.json`:

```json
{
  "COURSE_ID": {
    "1": {
      "shape": "straight|dogleg_left|dogleg_right|double_dogleg|slight_left|slight_right",
      "elevation_change": "uphill|downhill|flat|undulating",
      "notes": "Strategy notes for the hole",
      
      "fairway_points": [
        {"distance": 0, "offset": 0, "width": 10},
        {"distance": 50, "offset": 0, "width": 25},
        {"distance": 100, "offset": 0, "width": 35},
        ...
      ],
      
      "green": {
        "shape": "round|oval|kidney|tiered|long_narrow|wide_shallow|peanut",
        "width": 28,
        "depth": 22,
        "angle": 0,
        "slope_direction": "back_to_front|left_to_right|right_to_left|front_to_back"
      },
      
      "hazards": [
        {
          "type": "fairway_bunker|greenside_bunker|water|lateral_water|waste_area|ob|trees|forced_carry",
          "location": "left|right|center|front|back|front_left|front_right|back_left|back_right|surrounds",
          "distance_from_tee": 250,
          "distance_from_green": null,
          "lateral_offset": -30,
          "width": 15,
          "length": 10,
          "carry_distance": null,
          "notes": ""
        }
      ],
      
      "tree_lines": [
        {
          "side": "left",
          "points": [
            {"distance": 30, "offset": -35},
            {"distance": 100, "offset": -40},
            {"distance": 200, "offset": -38}
          ]
        }
      ],
      
      "distance_markers": [
        {"distance": 100, "label": "100", "side": "left"},
        {"distance": 150, "label": "150", "side": "right"},
        {"distance": 200, "label": "200", "side": "left"}
      ]
    }
  }
}
```

## Field Definitions

- `fairway_points`: Cross-section measurements along the hole
  - `distance`: yards from tee box
  - `offset`: lateral offset of fairway CENTER from hole's straight line (negative = left, positive = right). For doglegs, this is how the fairway curves.
  - `width`: total fairway width at this point in yards
  - Include a point every ~50 yards, more at turns/narrows
  - First point (distance 0) = tee area, width ~10-15 yards
  - Last point should be near the green

- `green`: Putting surface dimensions
  - `width`: left-to-right in yards
  - `depth`: front-to-back in yards  
  - `shape`: visual shape
  - `angle`: rotation in degrees (0 = aligned with approach, positive = clockwise)
  - `slope_direction`: general slope

- `hazards`: Every bunker, water hazard, OB, waste area
  - `distance_from_tee`: yards from tee to CENTER of hazard
  - `lateral_offset`: yards from fairway centerline (negative = left, positive = right)
  - `width`: hazard width in yards
  - `length`: hazard length in yards (along the hole)

- `tree_lines`: Define where tree borders are
  - Points define the tree edge at different distances from tee
  - `offset`: yards from hole centerline (negative = left of center)

## Research Sources

For EACH course, check multiple sources:

1. **Course official website** — most have hole-by-hole guides with descriptions and sometimes flyover videos
2. **BlueGolf** — `https://www.bluegolf.com/` search for the course
3. **18Birdies** — course descriptions
4. **PGA Tour** — for tour venues: `https://www.pgatour.com/tournaments/` then find the course guide
5. **Golf Digest** — course reviews
6. **Wikipedia** — for famous courses, often has detailed hole descriptions
7. **Google Maps satellite** — use browser tool to verify shapes visually

## Accuracy Standards

- Fairway widths: ±5 yards acceptable
- Hazard distances from tee: ±10 yards acceptable
- Green dimensions: ±3 yards acceptable
- Hole shapes (dogleg direction) must be CORRECT — verify this carefully
- All water hazards and bunkers visible on satellite imagery must be included

## Output

Write your researched data to a JSON file at:
`/Users/clawd/.openclaw/workspace/sandbagger/src/data/course-batch-N.json`

where N is your batch number. The main process will merge all batches.

Format: `{ "COURSE_ID": { "1": {...}, "2": {...}, ... "18": {...} }, "COURSE_ID_2": {...} }`
