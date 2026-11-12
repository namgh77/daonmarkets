import "dotenv/config";
import { createPool } from "mysql2/promise";
import { drizzle } from "drizzle-orm/mysql2";
import { migrate } from "drizzle-orm/mysql2/migrator";
import { externalMysqlOptions } from "../server/external-db-config";

async function main() {
  const options = externalMysqlOptions();
  if (!options)
    throw new Error(
      "EXTERNAL_DATABASE_URL is required; managed DATABASE_URL is deliberately not used"
    );
  const pool = createPool(options);
  try {
    console.log(
      "Applying reviewed migrations to the external MySQL database with certificate validation enabled."
    );
    await migrate(drizzle(pool), { migrationsFolder: "drizzle" });
    console.log(
      "External schema migration completed. No accounts or financial fixtures were inserted."
    );
  } finally {
    await pool.end();
  }
}
main().catch((error: unknown) => {
  console.error(
    "External migration failed. Check the protected connection configuration and database access."
  );
  if (error instanceof Error) {
    console.error(`[External migration detail] ${error.message}`);
    const cause = (error as Error & { cause?: unknown }).cause;
    if (cause && typeof cause === "object") {
      const databaseError = cause as {
        code?: unknown;
        errno?: unknown;
        sqlState?: unknown;
        sqlMessage?: unknown;
      };
      console.error(
        `[External migration database] code=${String(databaseError.code ?? "unknown")} errno=${String(databaseError.errno ?? "unknown")} sqlState=${String(databaseError.sqlState ?? "unknown")} message=${String(databaseError.sqlMessage ?? "unknown")}`
      );
    }
  } else {
    console.error("[External migration detail] Unknown migration error");
  }
  process.exitCode = 1;
});
