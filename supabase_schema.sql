-- Sandbagger Golf Stats App Schema
-- All tables prefixed with sb_

CREATE TABLE IF NOT EXISTS sb_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text UNIQUE NOT NULL,
  username text UNIQUE NOT NULL,
  password_hash text NOT NULL,
  salt text NOT NULL,
  display_name text,
  profile_type text DEFAULT 'player',
  bio text,
  handicap numeric,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS sb_relationships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL,
  target_id text NOT NULL,
  type text NOT NULL,
  status text DEFAULT 'pending',
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS sb_courses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  city text,
  state text,
  country text DEFAULT 'US',
  num_holes int DEFAULT 18,
  created_by text,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS sb_holes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid REFERENCES sb_courses(id) ON DELETE CASCADE,
  hole_number int NOT NULL,
  par int NOT NULL,
  distance_yards int,
  shape text,
  hazards jsonb DEFAULT '[]',
  notes text
);

CREATE TABLE IF NOT EXISTS sb_rounds (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL,
  course_id uuid REFERENCES sb_courses(id),
  date_played date NOT NULL,
  total_score int,
  weather text,
  wind text,
  notes text,
  is_complete boolean DEFAULT false,
  visibility text DEFAULT 'private',
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS sb_hole_scores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  round_id uuid REFERENCES sb_rounds(id) ON DELETE CASCADE,
  hole_id uuid REFERENCES sb_holes(id),
  hole_number int,
  score int,
  putts int,
  fairway_hit boolean,
  gir boolean,
  penalties int DEFAULT 0,
  notes text
);

CREATE TABLE IF NOT EXISTS sb_shots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hole_score_id uuid REFERENCES sb_hole_scores(id) ON DELETE CASCADE,
  shot_number int,
  club text,
  shot_type text,
  distance_yards int,
  playing_distance_yards int,
  result text,
  notes text
);

CREATE TABLE IF NOT EXISTS sb_coach_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id text NOT NULL,
  player_id text NOT NULL,
  round_id uuid REFERENCES sb_rounds(id),
  note text NOT NULL,
  category text,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS sb_practice_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id text,
  player_id text,
  title text,
  description text,
  drills jsonb,
  status text DEFAULT 'active',
  created_at timestamptz DEFAULT now()
);

-- Enable RLS on all tables with permissive policies
ALTER TABLE sb_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE sb_relationships ENABLE ROW LEVEL SECURITY;
ALTER TABLE sb_courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE sb_holes ENABLE ROW LEVEL SECURITY;
ALTER TABLE sb_rounds ENABLE ROW LEVEL SECURITY;
ALTER TABLE sb_hole_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE sb_shots ENABLE ROW LEVEL SECURITY;
ALTER TABLE sb_coach_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE sb_practice_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "allow all" ON sb_users FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow all" ON sb_relationships FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow all" ON sb_courses FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow all" ON sb_holes FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow all" ON sb_rounds FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow all" ON sb_hole_scores FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow all" ON sb_shots FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow all" ON sb_coach_notes FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow all" ON sb_practice_plans FOR ALL USING (true) WITH CHECK (true);
