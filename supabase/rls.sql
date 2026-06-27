-- =============================================================================
-- Veredoc — Row Level Security (RLS)
-- Eseguire su Supabase SQL Editor
-- =============================================================================

-- -----------------------------------------------------------------------------
-- TABELLA: User
-- -----------------------------------------------------------------------------
ALTER TABLE "User" ENABLE ROW LEVEL SECURITY;

-- Un utente può leggere solo il proprio record
CREATE POLICY "users_select_own" ON "User"
  FOR SELECT
  USING (auth.uid()::text = id);

-- Un utente può aggiornare solo il proprio record
CREATE POLICY "users_update_own" ON "User"
  FOR UPDATE
  USING (auth.uid()::text = id);

-- INSERT gestito dalla service role (registrazione via NextAuth)
-- Nessuna policy INSERT per utenti — solo service role può creare utenti

-- -----------------------------------------------------------------------------
-- TABELLA: Document
-- -----------------------------------------------------------------------------
ALTER TABLE "Document" ENABLE ROW LEVEL SECURITY;

-- Un utente può leggere solo i propri documenti
CREATE POLICY "documents_select_own" ON "Document"
  FOR SELECT
  USING (auth.uid()::text = "userId");

-- Un utente può inserire documenti solo per se stesso
CREATE POLICY "documents_insert_own" ON "Document"
  FOR INSERT
  WITH CHECK (auth.uid()::text = "userId");

-- Un utente può aggiornare solo i propri documenti
CREATE POLICY "documents_update_own" ON "Document"
  FOR UPDATE
  USING (auth.uid()::text = "userId");

-- Un utente può eliminare (soft delete) solo i propri documenti
CREATE POLICY "documents_delete_own" ON "Document"
  FOR DELETE
  USING (auth.uid()::text = "userId");

-- -----------------------------------------------------------------------------
-- TABELLA: MarketRate
-- -----------------------------------------------------------------------------
ALTER TABLE "MarketRate" ENABLE ROW LEVEL SECURITY;

-- Tutti possono leggere le tariffe di mercato (dati pubblici)
CREATE POLICY "market_rates_select_all" ON "MarketRate"
  FOR SELECT
  USING (true);

-- Solo service role può inserire/aggiornare/eliminare tariffe
-- (le policy INSERT/UPDATE/DELETE non esistono = solo service role può scrivere)

-- -----------------------------------------------------------------------------
-- NOTA IMPORTANTE
-- -----------------------------------------------------------------------------
-- Veredoc usa Prisma con SERVICE ROLE KEY — la service role bypassa RLS.
-- Queste policy proteggono da:
--   1. Accesso diretto al DB con chiave anon
--   2. Query SQL dirette non autorizzate
--   3. Futuri client-side Supabase JS che usassero chiave anon
--
-- Le API Next.js continuano a funzionare normalmente perché usano
-- la service role key tramite Prisma.
-- =============================================================================
