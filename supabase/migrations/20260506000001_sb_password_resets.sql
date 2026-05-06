-- Password reset tokens table
CREATE TABLE IF NOT EXISTS sb_password_resets (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL,
  token TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_password_resets_token ON sb_password_resets(token);
CREATE INDEX IF NOT EXISTS idx_password_resets_email ON sb_password_resets(email);

ALTER TABLE sb_password_resets ENABLE ROW LEVEL SECURITY;

-- Allow anyone to insert a password reset request
CREATE POLICY "Allow public insert" ON sb_password_resets
  FOR INSERT WITH CHECK (true);

-- Allow anyone to look up a token (to verify the reset link)
CREATE POLICY "Allow public select by token" ON sb_password_resets
  FOR SELECT USING (true);

-- Allow updates only if the token hasn't been used
CREATE POLICY "Allow update unused tokens" ON sb_password_resets
  FOR UPDATE USING (used_at IS NULL);
