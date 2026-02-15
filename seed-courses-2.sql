-- ACC SCHOOL COURSES (continued)

-- 32. DON VELLER SEMINOLE GC (FSU)
INSERT INTO sb_courses (id, name, city, state, country, num_holes) VALUES
  ('a0000032-0000-0000-0000-000000000001', 'Don Veller Seminole Golf Course', 'Tallahassee', 'FL', 'US', 18);
INSERT INTO sb_tee_sets (id, course_id, color, name, total_yardage, total_par, rating, slope) VALUES
  ('b0000032-0001-0000-0000-000000000001', 'a0000032-0000-0000-0000-000000000001', 'Blue', 'Championship', 7174, 73, 74.5, 136),
  ('b0000032-0002-0000-0000-000000000001', 'a0000032-0000-0000-0000-000000000001', 'White', 'White', 6588, 73, 71.8, 129);

-- 33. GOLF CLUB OF GEORGIA (Georgia Tech)
INSERT INTO sb_courses (id, name, city, state, country, num_holes) VALUES
  ('a0000033-0000-0000-0000-000000000001', 'Golf Club of Georgia - Lakeside', 'Alpharetta', 'GA', 'US', 18);
INSERT INTO sb_tee_sets (id, course_id, color, name, total_yardage, total_par, rating, slope) VALUES
  ('b0000033-0001-0000-0000-000000000001', 'a0000033-0000-0000-0000-000000000001', 'Black', 'Championship', 7017, 72, 74.2, 140),
  ('b0000033-0002-0000-0000-000000000001', 'a0000033-0000-0000-0000-000000000001', 'Blue', 'Blue', 6568, 72, 72.0, 134),
  ('b0000033-0003-0000-0000-000000000001', 'a0000033-0000-0000-0000-000000000001', 'White', 'White', 6095, 72, 69.5, 127);

-- 34. UNIVERSITY OF LOUISVILLE GC
INSERT INTO sb_courses (id, name, city, state, country, num_holes) VALUES
  ('a0000034-0000-0000-0000-000000000001', 'University of Louisville Golf Club', 'Simpsonville', 'KY', 'US', 18);
INSERT INTO sb_tee_sets (id, course_id, color, name, total_yardage, total_par, rating, slope) VALUES
  ('b0000034-0001-0000-0000-000000000001', 'a0000034-0000-0000-0000-000000000001', 'Black', 'Championship', 7193, 72, 74.8, 139),
  ('b0000034-0002-0000-0000-000000000001', 'a0000034-0000-0000-0000-000000000001', 'Blue', 'Blue', 6714, 72, 72.4, 133),
  ('b0000034-0003-0000-0000-000000000001', 'a0000034-0000-0000-0000-000000000001', 'White', 'White', 6221, 72, 70.0, 127);

-- 35. BILTMORE GC (Miami)
INSERT INTO sb_courses (id, name, city, state, country, num_holes) VALUES
  ('a0000035-0000-0000-0000-000000000001', 'Biltmore Golf Course', 'Coral Gables', 'FL', 'US', 18);
INSERT INTO sb_tee_sets (id, course_id, color, name, total_yardage, total_par, rating, slope) VALUES
  ('b0000035-0001-0000-0000-000000000001', 'a0000035-0000-0000-0000-000000000001', 'Blue', 'Championship', 6852, 71, 73.4, 130),
  ('b0000035-0002-0000-0000-000000000001', 'a0000035-0000-0000-0000-000000000001', 'White', 'White', 6396, 71, 71.2, 125),
  ('b0000035-0003-0000-0000-000000000001', 'a0000035-0000-0000-0000-000000000001', 'Red', 'Red', 5474, 71, 72.0, 124);

-- 36. FINLEY GOLF COURSE (UNC)
INSERT INTO sb_courses (id, name, city, state, country, num_holes) VALUES
  ('a0000036-0000-0000-0000-000000000001', 'UNC Finley Golf Course', 'Chapel Hill', 'NC', 'US', 18);
INSERT INTO sb_tee_sets (id, course_id, color, name, total_yardage, total_par, rating, slope) VALUES
  ('b0000036-0001-0000-0000-000000000001', 'a0000036-0000-0000-0000-000000000001', 'Blue', 'Championship', 7117, 72, 74.3, 138),
  ('b0000036-0002-0000-0000-000000000001', 'a0000036-0000-0000-0000-000000000001', 'White', 'White', 6578, 72, 71.6, 131),
  ('b0000036-0003-0000-0000-000000000001', 'a0000036-0000-0000-0000-000000000001', 'Red', 'Red', 5176, 72, 70.4, 125);

-- 37. WARREN GOLF COURSE (Notre Dame)
INSERT INTO sb_courses (id, name, city, state, country, num_holes) VALUES
  ('a0000037-0000-0000-0000-000000000001', 'Warren Golf Course', 'Notre Dame', 'IN', 'US', 18);
INSERT INTO sb_tee_sets (id, course_id, color, name, total_yardage, total_par, rating, slope) VALUES
  ('b0000037-0001-0000-0000-000000000001', 'a0000037-0000-0000-0000-000000000001', 'Black', 'Championship', 7261, 71, 75.3, 140),
  ('b0000037-0002-0000-0000-000000000001', 'a0000037-0000-0000-0000-000000000001', 'Blue', 'Blue', 6780, 71, 72.8, 134),
  ('b0000037-0003-0000-0000-000000000001', 'a0000037-0000-0000-0000-000000000001', 'White', 'White', 6295, 71, 70.5, 128);

-- 38. WALKER COURSE AT CLEMSON
INSERT INTO sb_courses (id, name, city, state, country, num_holes) VALUES
  ('a0000038-0000-0000-0000-000000000001', 'Walker Course at Clemson', 'Clemson', 'SC', 'US', 18);
INSERT INTO sb_tee_sets (id, course_id, color, name, total_yardage, total_par, rating, slope) VALUES
  ('b0000038-0001-0000-0000-000000000001', 'a0000038-0000-0000-0000-000000000001', 'Blue', 'Championship', 6911, 72, 73.5, 137),
  ('b0000038-0002-0000-0000-000000000001', 'a0000038-0000-0000-0000-000000000001', 'White', 'White', 6400, 72, 71.0, 130),
  ('b0000038-0003-0000-0000-000000000001', 'a0000038-0000-0000-0000-000000000001', 'Red', 'Red', 5289, 72, 70.5, 126);

-- 39. BRAE BURN CC (Boston College)
INSERT INTO sb_courses (id, name, city, state, country, num_holes) VALUES
  ('a0000039-0000-0000-0000-000000000001', 'Brae Burn Country Club', 'Newton', 'MA', 'US', 18);
INSERT INTO sb_tee_sets (id, course_id, color, name, total_yardage, total_par, rating, slope) VALUES
  ('b0000039-0001-0000-0000-000000000001', 'a0000039-0000-0000-0000-000000000001', 'Blue', 'Championship', 6639, 70, 72.5, 135),
  ('b0000039-0002-0000-0000-000000000001', 'a0000039-0000-0000-0000-000000000001', 'White', 'White', 6190, 70, 70.3, 129);

-- 40. TRINITY FOREST GC (SMU)
INSERT INTO sb_courses (id, name, city, state, country, num_holes) VALUES
  ('a0000040-0000-0000-0000-000000000001', 'Trinity Forest Golf Club', 'Dallas', 'TX', 'US', 18);
INSERT INTO sb_tee_sets (id, course_id, color, name, total_yardage, total_par, rating, slope) VALUES
  ('b0000040-0001-0000-0000-000000000001', 'a0000040-0000-0000-0000-000000000001', 'Black', 'Championship', 7393, 71, 76.0, 140),
  ('b0000040-0002-0000-0000-000000000001', 'a0000040-0000-0000-0000-000000000001', 'Blue', 'Blue', 6920, 71, 73.5, 134),
  ('b0000040-0003-0000-0000-000000000001', 'a0000040-0000-0000-0000-000000000001', 'White', 'White', 6440, 71, 71.2, 128);

-- 41. STANFORD GOLF COURSE
INSERT INTO sb_courses (id, name, city, state, country, num_holes) VALUES
  ('a0000041-0000-0000-0000-000000000001', 'Stanford Golf Course', 'Stanford', 'CA', 'US', 18);
INSERT INTO sb_tee_sets (id, course_id, color, name, total_yardage, total_par, rating, slope) VALUES
  ('b0000041-0001-0000-0000-000000000001', 'a0000041-0000-0000-0000-000000000001', 'Blue', 'Championship', 6727, 71, 72.8, 130),
  ('b0000041-0002-0000-0000-000000000001', 'a0000041-0000-0000-0000-000000000001', 'White', 'White', 6231, 71, 70.4, 124),
  ('b0000041-0003-0000-0000-000000000001', 'a0000041-0000-0000-0000-000000000001', 'Red', 'Red', 5651, 72, 72.8, 126);

-- 42. DRUMLINS CC (Syracuse)
INSERT INTO sb_courses (id, name, city, state, country, num_holes) VALUES
  ('a0000042-0000-0000-0000-000000000001', 'Drumlins Country Club', 'Syracuse', 'NY', 'US', 18);
INSERT INTO sb_tee_sets (id, course_id, color, name, total_yardage, total_par, rating, slope) VALUES
  ('b0000042-0001-0000-0000-000000000001', 'a0000042-0000-0000-0000-000000000001', 'Blue', 'Blue', 6891, 72, 73.0, 130),
  ('b0000042-0002-0000-0000-000000000001', 'a0000042-0000-0000-0000-000000000001', 'White', 'White', 6400, 72, 70.8, 124);

-- 43. BIRDWOOD GOLF COURSE (Virginia)
INSERT INTO sb_courses (id, name, city, state, country, num_holes) VALUES
  ('a0000043-0000-0000-0000-000000000001', 'Birdwood Golf Course', 'Charlottesville', 'VA', 'US', 18);
INSERT INTO sb_tee_sets (id, course_id, color, name, total_yardage, total_par, rating, slope) VALUES
  ('b0000043-0001-0000-0000-000000000001', 'a0000043-0000-0000-0000-000000000001', 'Black', 'Championship', 7350, 72, 76.0, 142),
  ('b0000043-0002-0000-0000-000000000001', 'a0000043-0000-0000-0000-000000000001', 'Blue', 'Blue', 6845, 72, 73.5, 136),
  ('b0000043-0003-0000-0000-000000000001', 'a0000043-0000-0000-0000-000000000001', 'White', 'White', 6352, 72, 71.2, 130),
  ('b0000043-0004-0000-0000-000000000001', 'a0000043-0000-0000-0000-000000000001', 'Gold', 'Gold', 5810, 72, 68.5, 123);

-- 44. PETE DYE RIVER COURSE (Virginia Tech)
INSERT INTO sb_courses (id, name, city, state, country, num_holes) VALUES
  ('a0000044-0000-0000-0000-000000000001', 'Pete Dye River Course of Virginia Tech', 'Radford', 'VA', 'US', 18);
INSERT INTO sb_tee_sets (id, course_id, color, name, total_yardage, total_par, rating, slope) VALUES
  ('b0000044-0001-0000-0000-000000000001', 'a0000044-0000-0000-0000-000000000001', 'Black', 'Championship', 7187, 72, 75.5, 147),
  ('b0000044-0002-0000-0000-000000000001', 'a0000044-0000-0000-0000-000000000001', 'Blue', 'Blue', 6719, 72, 73.0, 140),
  ('b0000044-0003-0000-0000-000000000001', 'a0000044-0000-0000-0000-000000000001', 'White', 'White', 6208, 72, 70.5, 133),
  ('b0000044-0004-0000-0000-000000000001', 'a0000044-0000-0000-0000-000000000001', 'Gold', 'Gold', 5685, 72, 68.0, 126);

-- 45. OLD TOWN CLUB (Wake Forest)
INSERT INTO sb_courses (id, name, city, state, country, num_holes) VALUES
  ('a0000045-0000-0000-0000-000000000001', 'Old Town Club', 'Winston-Salem', 'NC', 'US', 18);
INSERT INTO sb_tee_sets (id, course_id, color, name, total_yardage, total_par, rating, slope) VALUES
  ('b0000045-0001-0000-0000-000000000001', 'a0000045-0000-0000-0000-000000000001', 'Blue', 'Championship', 7091, 72, 74.1, 139),
  ('b0000045-0002-0000-0000-000000000001', 'a0000045-0000-0000-0000-000000000001', 'White', 'White', 6588, 72, 71.6, 132);

-- 46. TILDEN PARK GC (Cal)
INSERT INTO sb_courses (id, name, city, state, country, num_holes) VALUES
  ('a0000046-0000-0000-0000-000000000001', 'Tilden Park Golf Course', 'Berkeley', 'CA', 'US', 18);
INSERT INTO sb_tee_sets (id, course_id, color, name, total_yardage, total_par, rating, slope) VALUES
  ('b0000046-0001-0000-0000-000000000001', 'a0000046-0000-0000-0000-000000000001', 'Blue', 'Blue', 6307, 70, 70.5, 124),
  ('b0000046-0002-0000-0000-000000000001', 'a0000046-0000-0000-0000-000000000001', 'White', 'White', 5914, 70, 68.6, 119);

-- 47. LONGUE VUE CLUB (Pittsburgh)
INSERT INTO sb_courses (id, name, city, state, country, num_holes) VALUES
  ('a0000047-0000-0000-0000-000000000001', 'Longue Vue Club', 'Verona', 'PA', 'US', 18);
INSERT INTO sb_tee_sets (id, course_id, color, name, total_yardage, total_par, rating, slope) VALUES
  ('b0000047-0001-0000-0000-000000000001', 'a0000047-0000-0000-0000-000000000001', 'Blue', 'Championship', 6803, 72, 72.8, 134),
  ('b0000047-0002-0000-0000-000000000001', 'a0000047-0000-0000-0000-000000000001', 'White', 'White', 6321, 72, 70.5, 128);
