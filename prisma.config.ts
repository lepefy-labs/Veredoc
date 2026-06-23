import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  // DIRECT_URL = connessione diretta Supabase (non pooler) — richiesta da prisma migrate deploy
  datasource: {
    url: process.env.DIRECT_URL,
  },
});
