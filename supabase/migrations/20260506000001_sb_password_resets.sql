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
