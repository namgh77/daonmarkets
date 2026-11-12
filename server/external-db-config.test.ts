import { describe, expect, it } from "vitest";
import { externalMysqlOptions } from "./external-db-config";

describe("independent MySQL configuration", () => {
  it("never reuses a platform DATABASE_URL as an external destination", () => {
    expect(
      externalMysqlOptions({ DATABASE_URL: "mysql://managed.invalid/source" })
    ).toBeNull();
  });
  it("requires certificate validation and TLS 1.2 with bounded pooling", () => {
    const options = externalMysqlOptions({
      EXTERNAL_DATABASE_URL:
        "mysql://fixture:never-use@db.example.invalid:3306/fixture?ssl=false",
    });
    expect(options).toMatchObject({
      host: "db.example.invalid",
      database: "fixture",
      port: 3306,
      connectionLimit: 5,
      ssl: { rejectUnauthorized: true, minVersion: "TLSv1.2" },
    });
  });
  it("does not accept PostgreSQL as a MySQL URL", () => {
    expect(() =>
      externalMysqlOptions({
        EXTERNAL_DATABASE_URL:
          "postgresql://fixture:never-use@db.example.invalid/fixture",
      })
    ).toThrow("MySQL protocol");
  });
  it("does not expose a malformed protected URL in its error message", () => {
    expect(() =>
      externalMysqlOptions({
        EXTERNAL_DATABASE_URL: "invalid protected-connection-test-value",
      })
    ).toThrow("Invalid external MySQL connection configuration");
  });
  it("requires credentials and a single named database", () => {
    expect(() =>
      externalMysqlOptions({
        EXTERNAL_DATABASE_URL: "mysql://db.example.invalid/fixture",
      })
    ).toThrow("required");
    expect(() =>
      externalMysqlOptions({
        EXTERNAL_DATABASE_URL:
          "mysql://fixture:never-use@db.example.invalid/fixture/extra",
      })
    ).toThrow("required");
  });
  it("accepts a provider CA without weakening verification", () => {
    const options = externalMysqlOptions({
      EXTERNAL_DATABASE_URL:
        "mysql://fixture:never-use@db.example.invalid/fixture",
      EXTERNAL_DATABASE_CA: "line-one\\nline-two",
    });
    expect(options?.ssl).toMatchObject({
      ca: "line-one\nline-two",
      rejectUnauthorized: true,
    });
  });
});
