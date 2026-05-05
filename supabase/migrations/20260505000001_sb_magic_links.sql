-- Magic links table for passwordless email login
CREATE TABLE IF NOT EXISTS sb_magic_links (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL,
  token TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Auto-delete expired + used tokens (keep table lean)
CREATE INDEX IF NOT EXISTS idx_magic_links_token ON sb_magic_links(token);
CREATE INDEX IF NOT EXISTS idx_magic_links_email ON sb_magic_links(email);

ALTER TABLE sb_magic_links ENABLE ROW LEVEL SECURITY;