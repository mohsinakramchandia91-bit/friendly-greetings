-- Detach proposals from Supabase auth users
ALTER TABLE public.proposals DROP CONSTRAINT IF EXISTS proposals_user_id_fkey;

DROP POLICY IF EXISTS proposals_select_own ON public.proposals;
DROP POLICY IF EXISTS proposals_insert_own ON public.proposals;
DROP POLICY IF EXISTS proposals_update_own ON public.proposals;
DROP POLICY IF EXISTS proposals_delete_own ON public.proposals;

ALTER TABLE public.proposals RENAME COLUMN user_id TO owner_token;

CREATE INDEX IF NOT EXISTS proposals_owner_token_idx ON public.proposals (owner_token);

-- No client-side (anon/authenticated) access at all: every read and write is
-- brokered by server functions that verify the caller's device token.
REVOKE ALL ON public.proposals FROM anon, authenticated;
GRANT ALL ON public.proposals TO service_role;

ALTER TABLE public.proposals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.proposals FORCE ROW LEVEL SECURITY;

CREATE POLICY proposals_service_role_all ON public.proposals
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Accounts are gone
DROP TABLE IF EXISTS public.profiles CASCADE;
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;