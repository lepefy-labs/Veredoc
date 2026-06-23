import { defineConfig } from "prisma/config";
import { Pool } from "pg";

export default defineConfig({
  // @ts-expect-error earlyAccess non è ancora nel tipo pubblico ma è richiesto per driver adapters in Prisma 7
  earlyAccess: true,
  schema: "prisma/schema.prisma",
  migrate: {
    async adapter() {
      const { PrismaPg } = await import("@prisma/adapter-pg");
      const pool = new Pool({
        connectionString: process.env.DIRECT_URL,
      });
      return new PrismaPg(pool);
    },
  },
  client: {
    async adapter() {
      const { PrismaPg } = await import("@prisma/adapter-pg");
      const pool = new Pool({
        connectionString: process.env.DATABASE_URL,
      });
      return new PrismaPg(pool);
    },
  },
});
