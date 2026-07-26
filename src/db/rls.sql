-- Row Level Security policies for AI Journal Tools Generator.
-- Apply after `npx drizzle-kit push` with:
-- psql "$DATABASE_URL" -f src/db/rls.sql

ALTER TABLE app_journals ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_journals FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS app_journals_select_own ON app_journals;
DROP POLICY IF EXISTS app_journals_insert_own ON app_journals;
DROP POLICY IF EXISTS app_journals_update_own ON app_journals;
DROP POLICY IF EXISTS app_journals_delete_own ON app_journals;

CREATE POLICY app_journals_select_own
  ON app_journals
  FOR SELECT
  USING (owner_id::text = current_setting('app.user_id', true));

CREATE POLICY app_journals_insert_own
  ON app_journals
  FOR INSERT
  WITH CHECK (owner_id::text = current_setting('app.user_id', true));

CREATE POLICY app_journals_update_own
  ON app_journals
  FOR UPDATE
  USING (owner_id::text = current_setting('app.user_id', true))
  WITH CHECK (owner_id::text = current_setting('app.user_id', true));

CREATE POLICY app_journals_delete_own
  ON app_journals
  FOR DELETE
  USING (owner_id::text = current_setting('app.user_id', true));
