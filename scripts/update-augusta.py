#!/usr/bin/env python3
"""Rewrite Augusta National hole data with accurate layouts based on real course."""
import json

augusta = {
    # HOLE 1 - Tea Olive - Par 4, 445 yards - Slight dogleg right, downhill
    "1": {
        "shape": "dogleg_right",
        "green_shape": "tiered",
        "fairway_width": ">50 yds",
        "elevation_change": "downhill",
        "landing_zone_distance": 290,
        "fairway_points": [
            {"distance": 0, "offset": 0, "width": 25},
            {"distance": 50, "offset": 0, "width": 35},
            {"distance": 120, "offset": 2, "width": 48},
            {"distance": 180, "offset": 5, "width": 55},
            {"distance": 240, "offset": 8, "width": 58},
            {"distance": 290, "offset": 10, "width": 52},
            {"distance": 340, "offset": 8, "width": 48},
            {"distance": 380, "offset": 5, "width": 42},
            {"distance": 420, "offset": 3, "width": 38},
            {"distance": 445, "offset": 0, "width": 35}
        ],
        "tree_lines": [
            {"side": "left", "points": [
                {"distance": 0, "offset": -30}, {"distance": 100, "offset": -38},
                {"distance": 200, "offset": -40}, {"distance": 300, "offset": -38},
                {"distance": 400, "offset": -35}, {"distance": 445, "offset": -32}
            ]},
            {"side": "right", "points": [
                {"distance": 0, "offset": 30}, {"distance": 100, "offset": 42},
                {"distance": 200, "offset": 48}, {"distance": 300, "offset": 45},
                {"distance": 400, "offset": 38}, {"distance": 445, "offset": 32}
            ]}
        ],
        "green": {"shape": "tiered", "depth": 35, "width": 38, "slope_direction": "back_to_front"},
        "hazards": [
            {"type": "fairway_bunker", "location": "right", "distance_from_tee": 285, "lateral_offset": 32, "length": 28, "width": 12},
            {"type": "greenside_bunker", "location": "front_right", "distance_from_green": 5, "lateral_offset": 20, "length": 12, "width": 8}
        ],
        "notes": "Tea Olive. Slight dogleg right, big downhill tee shot. Bunker right at 285. Favor left center."
    },

    # HOLE 2 - Pink Dogwood - Par 5, 585 yards - Dogleg left, downhill then uphill
    "2": {
        "shape": "dogleg_left",
        "green_shape": "kidney",
        "fairway_width": "40-50 yds",
        "elevation_change": "downhill_then_uphill",
        "landing_zone_distance": 300,
        "fairway_points": [
            {"distance": 0, "offset": 0, "width": 25},
            {"distance": 60, "offset": 0, "width": 38},
            {"distance": 140, "offset": -3, "width": 45},
            {"distance": 220, "offset": -8, "width": 50},
            {"distance": 300, "offset": -15, "width": 48},
            {"distance": 370, "offset": -18, "width": 42},
            {"distance": 430, "offset": -15, "width": 38},
            {"distance": 490, "offset": -10, "width": 35},
            {"distance": 540, "offset": -5, "width": 32},
            {"distance": 585, "offset": 0, "width": 30}
        ],
        "tree_lines": [
            {"side": "left", "points": [
                {"distance": 0, "offset": -28}, {"distance": 100, "offset": -35},
                {"distance": 200, "offset": -42}, {"distance": 300, "offset": -45},
                {"distance": 400, "offset": -40}, {"distance": 500, "offset": -32},
                {"distance": 585, "offset": -28}
            ]},
            {"side": "right", "points": [
                {"distance": 0, "offset": 28}, {"distance": 100, "offset": 38},
                {"distance": 200, "offset": 42}, {"distance": 300, "offset": 40},
                {"distance": 400, "offset": 35}, {"distance": 500, "offset": 30},
                {"distance": 585, "offset": 28}
            ]}
        ],
        "green": {"shape": "kidney", "depth": 32, "width": 30, "angle": -10, "slope_direction": "back_to_front"},
        "hazards": [
            {"type": "fairway_bunker", "location": "left", "distance_from_tee": 290, "lateral_offset": -28, "length": 22, "width": 10},
            {"type": "water", "location": "left", "distance_from_tee": 420, "lateral_offset": -45, "length": 120, "width": 35, "notes": "Creek runs along left side"},
            {"type": "water", "location": "front_right", "distance_from_green": 30, "lateral_offset": 25, "length": 50, "width": 40, "notes": "Pond front right of green"},
            {"type": "greenside_bunker", "location": "front_left", "distance_from_green": 5, "lateral_offset": -18, "length": 14, "width": 8},
            {"type": "greenside_bunker", "location": "back_right", "distance_from_green": -5, "lateral_offset": 16, "length": 10, "width": 7}
        ],
        "notes": "Pink Dogwood. Longest hole. Creek left, pond right of green. Classic risk-reward second shot."
    },

    # HOLE 3 - Flowering Peach - Par 4, 350 yards - Dogleg left, downhill
    "3": {
        "shape": "dogleg_left",
        "green_shape": "oval",
        "fairway_width": "35-45 yds",
        "elevation_change": "downhill",
        "landing_zone_distance": 260,
        "fairway_points": [
            {"distance": 0, "offset": 0, "width": 25},
            {"distance": 50, "offset": 0, "width": 35},
            {"distance": 120, "offset": -5, "width": 42},
            {"distance": 180, "offset": -10, "width": 45},
            {"distance": 240, "offset": -12, "width": 42},
            {"distance": 290, "offset": -8, "width": 38},
            {"distance": 330, "offset": -3, "width": 35},
            {"distance": 350, "offset": 0, "width": 32}
        ],
        "tree_lines": [
            {"side": "left", "points": [
                {"distance": 0, "offset": -25}, {"distance": 100, "offset": -35},
                {"distance": 200, "offset": -38}, {"distance": 300, "offset": -30},
                {"distance": 350, "offset": -25}
            ]},
            {"side": "right", "points": [
                {"distance": 0, "offset": 25}, {"distance": 100, "offset": 35},
                {"distance": 200, "offset": 38}, {"distance": 300, "offset": 32},
                {"distance": 350, "offset": 28}
            ]}
        ],
        "green": {"shape": "oval", "depth": 28, "width": 25, "slope_direction": "back_to_front"},
        "hazards": [
            {"type": "fairway_bunker", "location": "left", "distance_from_tee": 240, "lateral_offset": -25, "length": 18, "width": 8},
            {"type": "greenside_bunker", "location": "front_left", "distance_from_green": 4, "lateral_offset": -15, "length": 12, "width": 8},
            {"type": "greenside_bunker", "location": "front_right", "distance_from_green": 6, "lateral_offset": 14, "length": 10, "width": 7},
            {"type": "greenside_bunker", "location": "back_left", "distance_from_green": -4, "lateral_offset": -12, "length": 8, "width": 6},
            {"type": "greenside_bunker", "location": "back_right", "distance_from_green": -3, "lateral_offset": 13, "length": 9, "width": 6}
        ],
        "notes": "Flowering Peach. Short par 4 but four bunkers guard the green. Precision approach critical."
    },

    # HOLE 4 - Flowering Crab Apple - Par 3, 240 yards - Long par 3, downhill
    "4": {
        "shape": "straight",
        "green_shape": "wide_shallow",
        "fairway_width": "30-40 yds",
        "elevation_change": "downhill",
        "landing_zone_distance": 240,
        "fairway_points": [
            {"distance": 0, "offset": 0, "width": 20},
            {"distance": 60, "offset": 0, "width": 32},
            {"distance": 120, "offset": 0, "width": 38},
            {"distance": 180, "offset": 0, "width": 35},
            {"distance": 220, "offset": 0, "width": 32},
            {"distance": 240, "offset": 0, "width": 30}
        ],
        "tree_lines": [
            {"side": "left", "points": [
                {"distance": 0, "offset": -22}, {"distance": 80, "offset": -30},
                {"distance": 160, "offset": -32}, {"distance": 240, "offset": -28}
            ]},
            {"side": "right", "points": [
                {"distance": 0, "offset": 22}, {"distance": 80, "offset": 30},
                {"distance": 160, "offset": 32}, {"distance": 240, "offset": 28}
            ]}
        ],
        "green": {"shape": "wide_shallow", "depth": 22, "width": 38, "slope_direction": "right_to_left"},
        "hazards": [
            {"type": "greenside_bunker", "location": "front_left", "distance_from_green": 8, "lateral_offset": -20, "length": 15, "width": 8},
            {"type": "greenside_bunker", "location": "right", "distance_from_green": 2, "lateral_offset": 22, "length": 12, "width": 7}
        ],
        "notes": "Flowering Crab Apple. Longest par 3 on course. Wide shallow green slopes right to left."
    },

    # HOLE 5 - Magnolia - Par 4, 495 yards - Dogleg left, uphill
    "5": {
        "shape": "dogleg_left",
        "green_shape": "tiered",
        "fairway_width": "35-50 yds",
        "elevation_change": "uphill",
        "landing_zone_distance": 290,
        "fairway_points": [
            {"distance": 0, "offset": 0, "width": 25},
            {"distance": 60, "offset": 0, "width": 38},
            {"distance": 140, "offset": -5, "width": 48},
            {"distance": 220, "offset": -10, "width": 50},
            {"distance": 300, "offset": -12, "width": 45},
            {"distance": 370, "offset": -8, "width": 40},
            {"distance": 430, "offset": -4, "width": 35},
            {"distance": 470, "offset": -2, "width": 32},
            {"distance": 495, "offset": 0, "width": 30}
        ],
        "tree_lines": [
            {"side": "left", "points": [
                {"distance": 0, "offset": -28}, {"distance": 120, "offset": -38},
                {"distance": 250, "offset": -42}, {"distance": 380, "offset": -35},
                {"distance": 495, "offset": -28}
            ]},
            {"side": "right", "points": [
                {"distance": 0, "offset": 28}, {"distance": 120, "offset": 40},
                {"distance": 250, "offset": 42}, {"distance": 380, "offset": 36},
                {"distance": 495, "offset": 30}
            ]}
        ],
        "green": {"shape": "tiered", "depth": 30, "width": 32, "slope_direction": "back_to_front"},
        "hazards": [
            {"type": "fairway_bunker", "location": "left", "distance_from_tee": 290, "lateral_offset": -28, "length": 30, "width": 12},
            {"type": "fairway_bunker", "location": "right", "distance_from_tee": 310, "lateral_offset": 28, "length": 22, "width": 10},
            {"type": "greenside_bunker", "location": "left", "distance_from_green": 3, "lateral_offset": -18, "length": 14, "width": 8},
            {"type": "greenside_bunker", "location": "right", "distance_from_green": 3, "lateral_offset": 18, "length": 12, "width": 7}
        ],
        "notes": "Magnolia. Long uphill par 4. Two fairway bunkers at landing zone. Heavily contoured green."
    },

    # HOLE 6 - Juniper - Par 3, 180 yards - Sharply downhill
    "6": {
        "shape": "straight",
        "green_shape": "kidney",
        "fairway_width": "25-35 yds",
        "elevation_change": "sharply_downhill",
        "landing_zone_distance": 180,
        "fairway_points": [
            {"distance": 0, "offset": 0, "width": 20},
            {"distance": 50, "offset": 0, "width": 28},
            {"distance": 100, "offset": 0, "width": 32},
            {"distance": 150, "offset": 0, "width": 30},
            {"distance": 180, "offset": 0, "width": 28}
        ],
        "tree_lines": [
            {"side": "left", "points": [
                {"distance": 0, "offset": -22}, {"distance": 60, "offset": -28},
                {"distance": 130, "offset": -30}, {"distance": 180, "offset": -26}
            ]},
            {"side": "right", "points": [
                {"distance": 0, "offset": 22}, {"distance": 60, "offset": 28},
                {"distance": 130, "offset": 30}, {"distance": 180, "offset": 26}
            ]}
        ],
        "green": {"shape": "kidney", "depth": 28, "width": 30, "angle": 5, "slope_direction": "back_to_front"},
        "hazards": [
            {"type": "greenside_bunker", "location": "front_right", "distance_from_green": 5, "lateral_offset": 18, "length": 14, "width": 8},
            {"type": "greenside_bunker", "location": "back", "distance_from_green": -5, "lateral_offset": 0, "length": 10, "width": 12}
        ],
        "notes": "Juniper. Sharply downhill par 3. One of highest greens on course. Slopes severely front to back."
    },

    # HOLE 7 - Pampas - Par 4, 450 yards - Dogleg right
    "7": {
        "shape": "dogleg_right",
        "green_shape": "peanut",
        "fairway_width": "35-45 yds",
        "elevation_change": "uphill",
        "landing_zone_distance": 280,
        "fairway_points": [
            {"distance": 0, "offset": 0, "width": 25},
            {"distance": 60, "offset": 2, "width": 35},
            {"distance": 140, "offset": 5, "width": 42},
            {"distance": 220, "offset": 10, "width": 45},
            {"distance": 300, "offset": 12, "width": 40},
            {"distance": 370, "offset": 8, "width": 35},
            {"distance": 420, "offset": 4, "width": 32},
            {"distance": 450, "offset": 0, "width": 28}
        ],
        "tree_lines": [
            {"side": "left", "points": [
                {"distance": 0, "offset": -25}, {"distance": 120, "offset": -32},
                {"distance": 250, "offset": -35}, {"distance": 380, "offset": -30},
                {"distance": 450, "offset": -25}
            ]},
            {"side": "right", "points": [
                {"distance": 0, "offset": 25}, {"distance": 120, "offset": 38},
                {"distance": 250, "offset": 42}, {"distance": 380, "offset": 35},
                {"distance": 450, "offset": 28}
            ]}
        ],
        "green": {"shape": "peanut", "depth": 32, "width": 28, "slope_direction": "right_to_left"},
        "hazards": [
            {"type": "fairway_bunker", "location": "right", "distance_from_tee": 280, "lateral_offset": 28, "length": 22, "width": 10},
            {"type": "greenside_bunker", "location": "front_left", "distance_from_green": 5, "lateral_offset": -16, "length": 12, "width": 8},
            {"type": "greenside_bunker", "location": "front_right", "distance_from_green": 6, "lateral_offset": 16, "length": 10, "width": 7}
        ],
        "notes": "Pampas. Uphill dogleg right. Peanut-shaped green is one of the smallest on course."
    },

    # HOLE 8 - Yellow Jasmine - Par 5, 570 yards - Uphill, slight dogleg left
    "8": {
        "shape": "dogleg_left",
        "green_shape": "tiered",
        "fairway_width": "35-50 yds",
        "elevation_change": "uphill",
        "landing_zone_distance": 295,
        "fairway_points": [
            {"distance": 0, "offset": 0, "width": 25},
            {"distance": 70, "offset": 0, "width": 38},
            {"distance": 150, "offset": -3, "width": 48},
            {"distance": 240, "offset": -8, "width": 50},
            {"distance": 320, "offset": -12, "width": 45},
            {"distance": 400, "offset": -10, "width": 40},
            {"distance": 470, "offset": -6, "width": 35},
            {"distance": 530, "offset": -3, "width": 32},
            {"distance": 570, "offset": 0, "width": 30}
        ],
        "tree_lines": [
            {"side": "left", "points": [
                {"distance": 0, "offset": -28}, {"distance": 150, "offset": -40},
                {"distance": 300, "offset": -42}, {"distance": 450, "offset": -35},
                {"distance": 570, "offset": -28}
            ]},
            {"side": "right", "points": [
                {"distance": 0, "offset": 28}, {"distance": 150, "offset": 40},
                {"distance": 300, "offset": 42}, {"distance": 450, "offset": 36},
                {"distance": 570, "offset": 30}
            ]}
        ],
        "green": {"shape": "tiered", "depth": 30, "width": 35, "slope_direction": "back_to_front"},
        "hazards": [
            {"type": "fairway_bunker", "location": "left", "distance_from_tee": 295, "lateral_offset": -30, "length": 25, "width": 10},
            {"type": "greenside_bunker", "location": "left", "distance_from_green": 3, "lateral_offset": -20, "length": 15, "width": 8},
            {"type": "greenside_bunker", "location": "right", "distance_from_green": 4, "lateral_offset": 18, "length": 12, "width": 7}
        ],
        "notes": "Yellow Jasmine. Uphill par 5 through a chute of pines. Green sits on a mound."
    },

    # HOLE 9 - Carolina Cherry - Par 4, 460 yards - Dogleg left, downhill
    "9": {
        "shape": "dogleg_left",
        "green_shape": "oval",
        "fairway_width": "30-45 yds",
        "elevation_change": "downhill",
        "landing_zone_distance": 280,
        "fairway_points": [
            {"distance": 0, "offset": 0, "width": 22},
            {"distance": 60, "offset": -2, "width": 32},
            {"distance": 140, "offset": -8, "width": 40},
            {"distance": 220, "offset": -14, "width": 45},
            {"distance": 300, "offset": -12, "width": 40},
            {"distance": 370, "offset": -8, "width": 35},
            {"distance": 430, "offset": -3, "width": 30},
            {"distance": 460, "offset": 0, "width": 28}
        ],
        "tree_lines": [
            {"side": "left", "points": [
                {"distance": 0, "offset": -22}, {"distance": 120, "offset": -35},
                {"distance": 260, "offset": -40}, {"distance": 400, "offset": -30},
                {"distance": 460, "offset": -25}
            ]},
            {"side": "right", "points": [
                {"distance": 0, "offset": 22}, {"distance": 120, "offset": 32},
                {"distance": 260, "offset": 38}, {"distance": 400, "offset": 32},
                {"distance": 460, "offset": 28}
            ]}
        ],
        "green": {"shape": "oval", "depth": 25, "width": 30, "slope_direction": "left_to_right"},
        "hazards": [
            {"type": "fairway_bunker", "location": "left", "distance_from_tee": 275, "lateral_offset": -25, "length": 20, "width": 8},
            {"type": "greenside_bunker", "location": "front_left", "distance_from_green": 5, "lateral_offset": -16, "length": 12, "width": 8}
        ],
        "notes": "Carolina Cherry. Downhill dogleg left. Green slopes sharply left to right."
    },

    # HOLE 10 - Camellia - Par 4, 495 yards - Sharp dogleg left, dramatic downhill
    "10": {
        "shape": "dogleg_left",
        "green_shape": "tiered",
        "fairway_width": "35-50 yds",
        "elevation_change": "sharply_downhill",
        "landing_zone_distance": 285,
        "fairway_points": [
            {"distance": 0, "offset": 0, "width": 25},
            {"distance": 60, "offset": 0, "width": 38},
            {"distance": 150, "offset": -8, "width": 48},
            {"distance": 240, "offset": -18, "width": 50},
            {"distance": 310, "offset": -25, "width": 45},
            {"distance": 380, "offset": -22, "width": 38},
            {"distance": 440, "offset": -15, "width": 35},
            {"distance": 495, "offset": -8, "width": 32}
        ],
        "tree_lines": [
            {"side": "left", "points": [
                {"distance": 0, "offset": -28}, {"distance": 120, "offset": -38},
                {"distance": 260, "offset": -48}, {"distance": 400, "offset": -40},
                {"distance": 495, "offset": -32}
            ]},
            {"side": "right", "points": [
                {"distance": 0, "offset": 28}, {"distance": 120, "offset": 40},
                {"distance": 260, "offset": 42}, {"distance": 400, "offset": 35},
                {"distance": 495, "offset": 28}
            ]}
        ],
        "green": {"shape": "tiered", "depth": 30, "width": 33, "slope_direction": "back_to_front"},
        "hazards": [
            {"type": "fairway_bunker", "location": "right", "distance_from_tee": 305, "lateral_offset": 25, "length": 25, "width": 10},
            {"type": "greenside_bunker", "location": "front_left", "distance_from_green": 6, "lateral_offset": -18, "length": 14, "width": 8}
        ],
        "notes": "Camellia. Dramatic 70-foot drop. Sharp dogleg left. One of hardest holes on Tour."
    },

    # HOLE 11 - White Dogwood - Par 4, 520 yards - Dogleg left, AMEN CORNER starts
    "11": {
        "shape": "dogleg_left",
        "green_shape": "kidney",
        "fairway_width": "30-45 yds",
        "elevation_change": "downhill",
        "landing_zone_distance": 280,
        "fairway_points": [
            {"distance": 0, "offset": 0, "width": 25},
            {"distance": 60, "offset": 0, "width": 35},
            {"distance": 140, "offset": -5, "width": 42},
            {"distance": 220, "offset": -12, "width": 45},
            {"distance": 300, "offset": -15, "width": 40},
            {"distance": 380, "offset": -12, "width": 35},
            {"distance": 450, "offset": -6, "width": 30},
            {"distance": 500, "offset": -3, "width": 28},
            {"distance": 520, "offset": 0, "width": 26}
        ],
        "tree_lines": [
            {"side": "left", "points": [
                {"distance": 0, "offset": -25}, {"distance": 130, "offset": -35},
                {"distance": 280, "offset": -40}, {"distance": 420, "offset": -32},
                {"distance": 520, "offset": -25}
            ]},
            {"side": "right", "points": [
                {"distance": 0, "offset": 25}, {"distance": 130, "offset": 35},
                {"distance": 280, "offset": 38}, {"distance": 420, "offset": 32},
                {"distance": 520, "offset": 26}
            ]}
        ],
        "green": {"shape": "kidney", "depth": 28, "width": 32, "angle": -8, "slope_direction": "back_to_front"},
        "hazards": [
            {"type": "water", "location": "front_left", "distance_from_green": 15, "lateral_offset": -25, "length": 60, "width": 30, "notes": "Pond guarding left side of green"},
            {"type": "fairway_bunker", "location": "right", "distance_from_tee": 290, "lateral_offset": 25, "length": 20, "width": 8},
            {"type": "greenside_bunker", "location": "right", "distance_from_green": 4, "lateral_offset": 18, "length": 12, "width": 8}
        ],
        "notes": "White Dogwood. AMEN CORNER begins. Pond guards left of green. Larry Mize's famous chip-in."
    },

    # HOLE 12 - Golden Bell - Par 3, 155 yards - THE iconic par 3
    "12": {
        "shape": "straight",
        "green_shape": "wide_shallow",
        "fairway_width": "25-35 yds",
        "elevation_change": "slightly_downhill",
        "landing_zone_distance": 155,
        "fairway_points": [
            {"distance": 0, "offset": 0, "width": 18},
            {"distance": 40, "offset": 0, "width": 25},
            {"distance": 80, "offset": 0, "width": 30},
            {"distance": 120, "offset": 0, "width": 35},
            {"distance": 155, "offset": 0, "width": 40}
        ],
        "tree_lines": [
            {"side": "left", "points": [
                {"distance": 0, "offset": -20}, {"distance": 50, "offset": -25},
                {"distance": 110, "offset": -30}, {"distance": 155, "offset": -35}
            ]},
            {"side": "right", "points": [
                {"distance": 0, "offset": 20}, {"distance": 50, "offset": 25},
                {"distance": 110, "offset": 30}, {"distance": 155, "offset": 35}
            ]}
        ],
        "green": {"shape": "wide_shallow", "depth": 12, "width": 40, "slope_direction": "right_to_left"},
        "hazards": [
            {"type": "water", "location": "front", "distance_from_green": 10, "lateral_offset": 0, "length": 25, "width": 55, "notes": "Rae's Creek - runs entire front of green"},
            {"type": "greenside_bunker", "location": "front_left", "distance_from_green": 6, "lateral_offset": -22, "length": 10, "width": 8},
            {"type": "greenside_bunker", "location": "front_right", "distance_from_green": 6, "lateral_offset": 22, "length": 10, "width": 8},
            {"type": "greenside_bunker", "location": "back", "distance_from_green": -6, "lateral_offset": 5, "length": 18, "width": 10, "notes": "Large bunker behind green"}
        ],
        "notes": "Golden Bell. Most famous par 3 in golf. Rae's Creek fronts the shallowest green. Swirling winds."
    },

    # HOLE 13 - Azalea - Par 5, 545 yards - Sharp dogleg left, Amen Corner finale
    "13": {
        "shape": "dogleg_left",
        "green_shape": "tiered",
        "fairway_width": "30-45 yds",
        "elevation_change": "downhill_then_uphill",
        "landing_zone_distance": 270,
        "fairway_points": [
            {"distance": 0, "offset": 0, "width": 22},
            {"distance": 60, "offset": -3, "width": 32},
            {"distance": 140, "offset": -10, "width": 40},
            {"distance": 220, "offset": -20, "width": 42},
            {"distance": 280, "offset": -25, "width": 38},
            {"distance": 350, "offset": -20, "width": 35},
            {"distance": 420, "offset": -12, "width": 32},
            {"distance": 480, "offset": -6, "width": 30},
            {"distance": 520, "offset": -3, "width": 28},
            {"distance": 545, "offset": 0, "width": 26}
        ],
        "tree_lines": [
            {"side": "left", "points": [
                {"distance": 0, "offset": -22}, {"distance": 120, "offset": -35},
                {"distance": 260, "offset": -45}, {"distance": 400, "offset": -35},
                {"distance": 545, "offset": -25}
            ]},
            {"side": "right", "points": [
                {"distance": 0, "offset": 22}, {"distance": 120, "offset": 30},
                {"distance": 260, "offset": 35}, {"distance": 400, "offset": 30},
                {"distance": 545, "offset": 25}
            ]}
        ],
        "green": {"shape": "tiered", "depth": 30, "width": 34, "slope_direction": "back_to_front"},
        "hazards": [
            {"type": "water", "location": "left", "distance_from_tee": 240, "lateral_offset": -35, "length": 150, "width": 25, "notes": "Rae's Creek tributary runs along left/front"},
            {"type": "water", "location": "front", "distance_from_green": 20, "lateral_offset": 0, "length": 15, "width": 40, "notes": "Rae's Creek crosses in front of green"},
            {"type": "greenside_bunker", "location": "back_right", "distance_from_green": -5, "lateral_offset": 18, "length": 14, "width": 8},
            {"type": "greenside_bunker", "location": "front_left", "distance_from_green": 8, "lateral_offset": -18, "length": 12, "width": 7},
            {"type": "greenside_bunker", "location": "back_left", "distance_from_green": -6, "lateral_offset": -15, "length": 10, "width": 6}
        ],
        "notes": "Azalea. Amen Corner finale. Sharp dogleg left over Rae's Creek. Classic eagle-or-bogey hole."
    },

    # HOLE 14 - Chinese Fir - Par 4, 440 yards - Straight, no bunkers
    "14": {
        "shape": "straight",
        "green_shape": "tiered",
        "fairway_width": "40-55 yds",
        "elevation_change": "downhill_then_uphill",
        "landing_zone_distance": 280,
        "fairway_points": [
            {"distance": 0, "offset": 0, "width": 25},
            {"distance": 60, "offset": 0, "width": 38},
            {"distance": 140, "offset": 0, "width": 50},
            {"distance": 220, "offset": 0, "width": 55},
            {"distance": 300, "offset": 0, "width": 48},
            {"distance": 370, "offset": 0, "width": 42},
            {"distance": 420, "offset": 0, "width": 35},
            {"distance": 440, "offset": 0, "width": 32}
        ],
        "tree_lines": [
            {"side": "left", "points": [
                {"distance": 0, "offset": -28}, {"distance": 120, "offset": -40},
                {"distance": 260, "offset": -45}, {"distance": 380, "offset": -35},
                {"distance": 440, "offset": -28}
            ]},
            {"side": "right", "points": [
                {"distance": 0, "offset": 28}, {"distance": 120, "offset": 40},
                {"distance": 260, "offset": 45}, {"distance": 380, "offset": 36},
                {"distance": 440, "offset": 30}
            ]}
        ],
        "green": {"shape": "tiered", "depth": 32, "width": 35, "slope_direction": "right_to_left"},
        "hazards": [],
        "notes": "Chinese Fir. Only hole with NO bunkers. Don't be fooled — the green is the defense. Huge ridge."
    },

    # HOLE 15 - Firethorn - Par 5, 550 yards - Slight dogleg left, pond fronts green
    "15": {
        "shape": "dogleg_left",
        "green_shape": "oval",
        "fairway_width": "35-50 yds",
        "elevation_change": "downhill_then_uphill",
        "landing_zone_distance": 295,
        "fairway_points": [
            {"distance": 0, "offset": 0, "width": 25},
            {"distance": 70, "offset": 0, "width": 38},
            {"distance": 150, "offset": -3, "width": 48},
            {"distance": 240, "offset": -8, "width": 50},
            {"distance": 320, "offset": -10, "width": 45},
            {"distance": 400, "offset": -6, "width": 40},
            {"distance": 470, "offset": -3, "width": 35},
            {"distance": 520, "offset": 0, "width": 32},
            {"distance": 550, "offset": 0, "width": 30}
        ],
        "tree_lines": [
            {"side": "left", "points": [
                {"distance": 0, "offset": -28}, {"distance": 140, "offset": -40},
                {"distance": 300, "offset": -42}, {"distance": 450, "offset": -35},
                {"distance": 550, "offset": -28}
            ]},
            {"side": "right", "points": [
                {"distance": 0, "offset": 28}, {"distance": 140, "offset": 40},
                {"distance": 300, "offset": 42}, {"distance": 450, "offset": 36},
                {"distance": 550, "offset": 30}
            ]}
        ],
        "green": {"shape": "oval", "depth": 28, "width": 32, "slope_direction": "back_to_front"},
        "hazards": [
            {"type": "water", "location": "front", "distance_from_green": 12, "lateral_offset": 0, "length": 30, "width": 55, "notes": "Pond directly in front of green"},
            {"type": "fairway_bunker", "location": "left", "distance_from_tee": 290, "lateral_offset": -28, "length": 22, "width": 10},
            {"type": "greenside_bunker", "location": "back_right", "distance_from_green": -5, "lateral_offset": 16, "length": 12, "width": 8}
        ],
        "notes": "Firethorn. Famous risk-reward par 5. Pond fronts green. Gene Sarazen's 'shot heard round the world.'"
    },

    # HOLE 16 - Redbud - Par 3, 170 yards - Over water
    "16": {
        "shape": "straight",
        "green_shape": "kidney",
        "fairway_width": "25-35 yds",
        "elevation_change": "downhill",
        "landing_zone_distance": 170,
        "fairway_points": [
            {"distance": 0, "offset": 0, "width": 18},
            {"distance": 40, "offset": 0, "width": 25},
            {"distance": 90, "offset": 0, "width": 30},
            {"distance": 140, "offset": 0, "width": 35},
            {"distance": 170, "offset": 0, "width": 38}
        ],
        "tree_lines": [
            {"side": "left", "points": [
                {"distance": 0, "offset": -20}, {"distance": 50, "offset": -28},
                {"distance": 120, "offset": -32}, {"distance": 170, "offset": -35}
            ]},
            {"side": "right", "points": [
                {"distance": 0, "offset": 20}, {"distance": 50, "offset": 28},
                {"distance": 120, "offset": 32}, {"distance": 170, "offset": 35}
            ]}
        ],
        "green": {"shape": "kidney", "depth": 25, "width": 35, "angle": 10, "slope_direction": "right_to_left"},
        "hazards": [
            {"type": "water", "location": "front", "distance_from_green": 8, "lateral_offset": -5, "length": 40, "width": 50, "notes": "Large pond between tee and green"},
            {"type": "greenside_bunker", "location": "right", "distance_from_green": 4, "lateral_offset": 20, "length": 15, "width": 8},
            {"type": "greenside_bunker", "location": "back_left", "distance_from_green": -5, "lateral_offset": -18, "length": 12, "width": 7}
        ],
        "notes": "Redbud. Par 3 over water. Tiger's iconic chip-in 2005. Sunday pins are tucked behind bunker right."
    },

    # HOLE 17 - Nandina - Par 4, 440 yards - Slight dogleg left
    "17": {
        "shape": "dogleg_left",
        "green_shape": "tiered",
        "fairway_width": "30-45 yds",
        "elevation_change": "uphill",
        "landing_zone_distance": 275,
        "fairway_points": [
            {"distance": 0, "offset": 0, "width": 22},
            {"distance": 60, "offset": -2, "width": 32},
            {"distance": 140, "offset": -5, "width": 40},
            {"distance": 220, "offset": -8, "width": 42},
            {"distance": 300, "offset": -6, "width": 38},
            {"distance": 370, "offset": -3, "width": 34},
            {"distance": 420, "offset": -2, "width": 30},
            {"distance": 440, "offset": 0, "width": 28}
        ],
        "tree_lines": [
            {"side": "left", "points": [
                {"distance": 0, "offset": -22}, {"distance": 120, "offset": -32},
                {"distance": 260, "offset": -35}, {"distance": 380, "offset": -28},
                {"distance": 440, "offset": -24}
            ]},
            {"side": "right", "points": [
                {"distance": 0, "offset": 22}, {"distance": 120, "offset": 30},
                {"distance": 260, "offset": 35}, {"distance": 380, "offset": 30},
                {"distance": 440, "offset": 26}
            ]}
        ],
        "green": {"shape": "tiered", "depth": 28, "width": 30, "slope_direction": "back_to_front"},
        "hazards": [
            {"type": "greenside_bunker", "location": "front_left", "distance_from_green": 5, "lateral_offset": -16, "length": 14, "width": 8},
            {"type": "greenside_bunker", "location": "front_right", "distance_from_green": 6, "lateral_offset": 15, "length": 10, "width": 6}
        ],
        "notes": "Nandina. Uphill approach to a plateau green. 'Eisenhower Tree' once guarded the left side."
    },

    # HOLE 18 - Holly - Par 4, 465 yards - Dogleg right, uphill finish
    "18": {
        "shape": "dogleg_right",
        "green_shape": "tiered",
        "fairway_width": "30-45 yds",
        "elevation_change": "uphill",
        "landing_zone_distance": 280,
        "fairway_points": [
            {"distance": 0, "offset": 0, "width": 22},
            {"distance": 60, "offset": 2, "width": 32},
            {"distance": 140, "offset": 6, "width": 42},
            {"distance": 220, "offset": 10, "width": 45},
            {"distance": 300, "offset": 8, "width": 40},
            {"distance": 370, "offset": 5, "width": 35},
            {"distance": 430, "offset": 2, "width": 30},
            {"distance": 465, "offset": 0, "width": 28}
        ],
        "tree_lines": [
            {"side": "left", "points": [
                {"distance": 0, "offset": -22}, {"distance": 120, "offset": -32},
                {"distance": 260, "offset": -38}, {"distance": 400, "offset": -30},
                {"distance": 465, "offset": -25}
            ]},
            {"side": "right", "points": [
                {"distance": 0, "offset": 22}, {"distance": 120, "offset": 35},
                {"distance": 260, "offset": 42}, {"distance": 400, "offset": 35},
                {"distance": 465, "offset": 28}
            ]}
        ],
        "green": {"shape": "tiered", "depth": 30, "width": 33, "slope_direction": "back_to_front"},
        "hazards": [
            {"type": "fairway_bunker", "location": "left", "distance_from_tee": 275, "lateral_offset": -25, "length": 28, "width": 12},
            {"type": "fairway_bunker", "location": "right", "distance_from_tee": 290, "lateral_offset": 28, "length": 22, "width": 10},
            {"type": "greenside_bunker", "location": "front_left", "distance_from_green": 5, "lateral_offset": -18, "length": 14, "width": 8},
            {"type": "greenside_bunker", "location": "right", "distance_from_green": 3, "lateral_offset": 18, "length": 12, "width": 7}
        ],
        "notes": "Holly. Uphill finishing hole with iconic walk to the clubhouse. Two fairway bunkers at corner."
    }
}

# Load existing data and update Augusta
with open('src/data/hole-metadata.json', 'r') as f:
    data = json.load(f)

data['a0000002-0000-0000-0000-000000000001'] = augusta

with open('src/data/hole-metadata.json', 'w') as f:
    json.dump(data, f, indent=2)

print("Augusta National updated with 18 holes of accurate data")
