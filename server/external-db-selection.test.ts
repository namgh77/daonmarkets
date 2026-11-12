import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ drizzle: vi.fn(), createPool: vi.fn() }));
vi.mock("drizzle-orm/mysql2", () => ({ drizzle: mocks.drizzle }));
vi.mock("mysql2", () => ({ createPool: mocks.createPool }));

describe("external production DB isolation", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.unstubAllEnvs();
    mocks.drizzle.mockReset().mockReturnValue({ isolated: true });
    mocks.createPool.mockReset().mockReturnValue({ fixturePool: true });
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("AUTH_PROVIDER", "clerk");
    vi.stubEnv("EXTERNAL_DATABASE_URL", "");
    vi.stubEnv(
      "DATABASE_URL",
      "mysql://fixture:never-use@managed.example.invalid/legacy"
    );
  });
  afterEach(() => vi.unstubAllEnvs());
  it("fails closed instead of falling back to a managed DB when an external secret is absent", async () => {
    const { getDb } = await import("./db");
    await expect(getDb()).rejects.toThrow("EXTERNAL_DATABASE_URL is required");
    expect(mocks.drizzle).not.toHaveBeenCalled();
    expect(mocks.createPool).not.toHaveBeenCalled();
  });
  it("connects only to the independent MySQL destination with TLS verification", async () => {
    vi.stubEnv(
      "EXTERNAL_DATABASE_URL",
      "mysql://fixture:never-use@external.example.invalid/member_fixture"
    );
    const { getDb } = await import("./db");
    await expect(getDb()).resolves.toEqual({ isolated: true });
    expect(mocks.createPool).toHaveBeenCalledWith(
      expect.objectContaining({
        host: "external.example.invalid",
        ssl: expect.objectContaining({ rejectUnauthorized: true }),
      })
    );
    expect(mocks.drizzle).toHaveBeenCalledWith({ fixturePool: true });
  });
  it("permits the existing managed connection only for explicit Manus rollback in production", async () => {
    vi.stubEnv("AUTH_PROVIDER", "manus");
    const { getDb } = await import("./db");
    await expect(getDb()).resolves.toEqual({ isolated: true });
    expect(mocks.drizzle).toHaveBeenCalledWith(
      "mysql://fixture:never-use@managed.example.invalid/legacy"
    );
  });
});
