import type { PoolOptions } from "mysql2/promise";

export function externalMysqlOptions(
  env: NodeJS.ProcessEnv = process.env
): PoolOptions | null {
  const dsn = env.EXTERNAL_DATABASE_URL?.trim();
  if (!dsn) return null;
  let parsed: URL;
  try {
    parsed = new URL(dsn);
  } catch {
    throw new Error("Invalid external MySQL connection configuration");
  }
  if (parsed.protocol !== "mysql:")
    throw new Error("External database must use the MySQL protocol");
  let user: string;
  let password: string;
  let database: string;
  try {
    user = decodeURIComponent(parsed.username);
    password = decodeURIComponent(parsed.password);
    database = decodeURIComponent(parsed.pathname.slice(1));
  } catch {
    throw new Error("Invalid external MySQL connection configuration");
  }
  const port = parsed.port ? Number(parsed.port) : 3306;
  if (
    !parsed.hostname ||
    !user ||
    !password ||
    !database ||
    database.includes("/") ||
    !Number.isInteger(port) ||
    port < 1 ||
    port > 65535
  ) {
    throw new Error(
      "External MySQL host, credentials, port and database are required"
    );
  }
  const ca = env.EXTERNAL_DATABASE_CA?.replace(/\\n/g, "\n").trim();
  return {
    host: parsed.hostname,
    port,
    user,
    password,
    database,
    charset: "utf8mb4",
    connectionLimit: 5,
    connectTimeout: 10000,
    waitForConnections: true,
    ssl: {
      rejectUnauthorized: true,
      minVersion: "TLSv1.2",
      ...(ca ? { ca } : {}),
    },
  };
}
