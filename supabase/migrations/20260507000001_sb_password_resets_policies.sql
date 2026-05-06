-- Password reset RLS policies (applied separately after table creation)

DROP POLICY IF EXISTS "Allow public insert" ON sb_magic_links;
CREATE POLICY "Allow public insert" ON sb_magic_links
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public select by token" ON sb_magic_links;
CREATE POLICY "Allow public select by token" ON sb_magic_links
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow update unused tokens" ON sb_magic_links;
CREATE POLICY "Allow update unused tokens" ON sb_magic_links
  FOR UPDATE USING (used_at IS NULL);

-- Allow anyone to insert a password reset request
DROP POLICY IF EXISTS "Allow public insert" ON sb_password_resets;
CREATE POLICY "Allow public insert" ON sb_password_resets
  FOR INSERT WITH CHECK (true);

-- Allow anyone to look up a token (to verify the reset link)
DROP POLICY IF EXISTS "Allow public select by token" ON sb_password_resets;
CREATE POLICY "Allow public select by token" ON sb_password_resets
  FOR SELECT USING (true);

-- Allow updates only if the token hasn't been used
DROP POLICY IF EXISTS "Allow update unused tokens" ON sb_password_resets;
CREATE POLICY "Allow update unused tokens" ON sb_password_resets
  FOR UPDATE USING (used_at IS NULL);
