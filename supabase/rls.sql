-- =============================================================================
-- Veredoc — Row Level Security (RLS)
-- Eseguire su Supabase SQL Editor
-- =============================================================================

-- -----------------------------------------------------------------------------
-- TABELLA: User
-- -----------------------------------------------------------------------------
ALTER TABLE "User" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_select_own" ON "User"
  FOR SELECT
  USING (auth.uid()::text = id);

CREATE POLICY "users_update_own" ON "User"
  FOR UPDATE
  USING (auth.uid()::text = id);

-- -----------------------------------------------------------------------------
-- TABELLA: AnalysisProfile
-- -----------------------------------------------------------------------------
ALTER TABLE "AnalysisProfile" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "analysis_profiles_select_own" ON "AnalysisProfile"
  FOR SELECT
  USING (auth.uid()::text = "userId");

CREATE POLICY "analysis_profiles_insert_own" ON "AnalysisProfile"
  FOR INSERT
  WITH CHECK (auth.uid()::text = "userId");

CREATE POLICY "analysis_profiles_update_own" ON "AnalysisProfile"
  FOR UPDATE
  USING (auth.uid()::text = "userId");

CREATE POLICY "analysis_profiles_delete_own" ON "AnalysisProfile"
  FOR DELETE
  USING (auth.uid()::text = "userId");

-- -----------------------------------------------------------------------------
-- TABELLA: Document
-- -----------------------------------------------------------------------------
ALTER TABLE "Document" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "documents_select_own" ON "Document"
  FOR SELECT
  USING (auth.uid()::text = "userId");

CREATE POLICY "documents_insert_own" ON "Document"
  FOR INSERT
  WITH CHECK (auth.uid()::text = "userId");

CREATE POLICY "documents_update_own" ON "Document"
  FOR UPDATE
  USING (auth.uid()::text = "userId");

CREATE POLICY "documents_delete_own" ON "Document"
  FOR DELETE
  USING (auth.uid()::text = "userId");

-- -----------------------------------------------------------------------------
-- TABELLA: MarketRate
-- -----------------------------------------------------------------------------
ALTER TABLE "MarketRate" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "market_rates_select_all" ON "MarketRate"
  FOR SELECT
  USING (true);

-- -----------------------------------------------------------------------------
-- NOTA IMPORTANTE
-- -----------------------------------------------------------------------------
-- Veredoc usa Prisma con SERVICE ROLE KEY — la service role bypassa RLS.
-- Le API server verificano comunque ownership di profili e documenti.
-- =============================================================================
