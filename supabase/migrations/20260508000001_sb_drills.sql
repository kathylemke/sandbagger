-- Drill feature: sb_drills, sb_drill_rounds, sb_drill_logs + RLS policies
-- Migration: 20260508000001

BEGIN;

-- =============================================================================
-- TABLE: sb_drills (custom drill templates created by users)
-- =============================================================================
CREATE TABLE IF NOT EXISTS sb_drills (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES sb_users(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  type text NOT NULL CHECK (type IN ('score-based', 'shot-log')),
  category text DEFAULT 'general',
  is_default boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- =============================================================================
-- TABLE: sb_drill_rounds (individual attempts/rounds of a drill)
-- =============================================================================
CREATE TABLE IF NOT EXISTS sb_drill_rounds (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  drill_id uuid REFERENCES sb_drills(id) ON DELETE CASCADE,
  user_id uuid REFERENCES sb_users(id) ON DELETE CASCADE,
  started_at timestamptz DEFAULT now(),
  completed_at timestamptz,
  total_score numeric,
  notes text
);

-- =============================================================================
-- TABLE: sb_drill_logs (per-hole/per-shot logging for shot-log drills)
-- =============================================================================
CREATE TABLE IF NOT EXISTS sb_drill_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  drill_round_id uuid REFERENCES sb_drill_rounds(id) ON DELETE CASCADE,
  hole_number int,
  shot_intent text,
  success boolean,
  miss_direction text,
  score numeric,
  club text,
  shot_shape text,
  notes text,
  created_at timestamptz DEFAULT now()
);

-- =============================================================================
-- INDEXES
-- =============================================================================
CREATE INDEX IF NOT EXISTS idx_drills_user ON sb_drills(user_id);
CREATE INDEX IF NOT EXISTS idx_drills_default ON sb_drills(is_default) WHERE is_default = true;
CREATE INDEX IF NOT EXISTS idx_drill_rounds_user ON sb_drill_rounds(user_id);
CREATE INDEX IF NOT EXISTS idx_drill_rounds_drill ON sb_drill_rounds(drill_id);
CREATE INDEX IF NOT EXISTS idx_drill_logs_round ON sb_drill_logs(drill_round_id);

-- =============================================================================
-- RLS POLICIES
-- =============================================================================

-- Enable RLS
ALTER TABLE sb_drills ENABLE ROW LEVEL SECURITY;
ALTER TABLE sb_drill_rounds ENABLE ROW LEVEL SECURITY;
ALTER TABLE sb_drill_logs ENABLE ROW LEVEL SECURITY;

-- sb_drills: users see their own drills + default drills
DROP POLICY IF EXISTS "Users see own and default drills" ON sb_drills;
CREATE POLICY "Users see own and default drills" ON sb_drills
  FOR SELECT USING (
    auth.uid() = user_id OR is_default = true
  );

DROP POLICY IF EXISTS "Users insert own drills" ON sb_drills;
CREATE POLICY "Users insert own drills" ON sb_drills
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users update own drills" ON sb_drills;
CREATE POLICY "Users update own drills" ON sb_drills
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users delete own drills" ON sb_drills;
CREATE POLICY "Users delete own drills" ON sb_drills
  FOR DELETE USING (auth.uid() = user_id AND is_default = false);

-- sb_drill_rounds: users manage their own drill rounds
DROP POLICY IF EXISTS "Users manage own drill rounds" ON sb_drill_rounds;
CREATE POLICY "Users manage own drill rounds" ON sb_drill_rounds
  FOR ALL USING (auth.uid() = user_id);

-- sb_drill_logs: users manage logs for their own drill rounds
DROP POLICY IF EXISTS "Users manage own drill logs" ON sb_drill_logs;
CREATE POLICY "Users manage own drill logs" ON sb_drill_logs
  FOR ALL USING (
    drill_round_id IN (
      SELECT id FROM sb_drill_rounds WHERE user_id = auth.uid()
    )
  );

-- =============================================================================
-- SEED DEFAULT DRILLS (preload 2 example drills)
-- =============================================================================

-- Insert "Miss Greens Up-and-Down" drill (score-based)
INSERT INTO sb_drills (id, user_id, name, description, type, category, is_default)
VALUES (
  'a1b2c3d4-0000-0000-0000-000000000001',
  NULL,
  'Miss Greens Up-and-Down',
  'Track how many up-and-downs you make from missed greens. Score: 1 point for successful up-and-down (chip + 1 putt or holed), 0 for failed. Try to beat your personal best over 10 missed greens. Rules: Chip must be within 3 feet of hole to count as "good". Missed green = anything not on the putting surface.',
  'score-based',
  'short_game',
  true
) ON CONFLICT DO NOTHING;

-- Insert "Shot Shaping Approaches" drill (shot-log based)
INSERT INTO sb_drills (id, user_id, name, description, type, category, is_default)
VALUES (
  'a1b2c3d4-0000-0000-0000-000000000002',
  NULL,
  'Shot Shaping Approaches',
  'Log every approach shot by intended shape. Track success/failure and miss direction to identify patterns. For each shot: record club used, intended shot shape (draw/fade/straight), whether you executed, and miss direction if mishit. Look for trends over time.',
  'shot-log',
  'full_swing',
  true
) ON CONFLICT DO NOTHING;

COMMIT;