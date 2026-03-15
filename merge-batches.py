#!/usr/bin/env python3
"""Merge course batch JSON files into the main hole-metadata.json"""
import json, glob, os

data_dir = os.path.join(os.path.dirname(__file__), 'src', 'data')
output = os.path.join(data_dir, 'hole-metadata.json')

# Start with existing data
try:
    with open(output) as f:
        merged = json.load(f)
except:
    merged = {}

# Find and merge all batch files
batch_files = sorted(glob.glob(os.path.join(data_dir, 'course-batch-*.json')))
print(f"Found {len(batch_files)} batch files")

for bf in batch_files:
    try:
        with open(bf) as f:
            batch = json.load(f)
        for course_id, holes in batch.items():
            # Only overwrite if the batch data has fairway_points (detailed data)
            if isinstance(holes, dict):
                h1 = holes.get('1', {})
                if 'fairway_points' in h1 or 'green' in h1:
                    merged[course_id] = holes
                    print(f"  ✅ {course_id}: {len(holes)} holes from {os.path.basename(bf)}")
                else:
                    # Only add if we don't have this course yet
                    if course_id not in merged:
                        merged[course_id] = holes
                        print(f"  ➕ {course_id}: {len(holes)} holes (basic) from {os.path.basename(bf)}")
    except Exception as e:
        print(f"  ❌ Error reading {bf}: {e}")

# Write merged output
with open(output, 'w') as f:
    json.dump(merged, f, indent=2)

print(f"\nTotal: {len(merged)} courses in {output}")
print(f"File size: {os.path.getsize(output) / 1024:.0f} KB")
