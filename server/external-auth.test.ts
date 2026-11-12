import { beforeEach, describe, expect, it, vi } from "vitest";
import type { User } from "../drizzle/schema";

const getUser = vi.fn();
const getAuth = vi.fn();
const getOrCreateClerkUser = vi.fn();

vi.mock("@clerk/express", () => ({
  clerkClient: { users: { getUser } },
  clerkMiddleware: vi.fn(
    () => (_req: unknown, _res: unknown, next: () => void) => next()
  ),
  getAuth,
}));
vi.mock("./external-identity", async importOriginal => ({
  ...(await importOriginal<typeof import("./external-identity")>()),
  getOrCreateClerkUser,
}));

const fakeUser = (overrides: Partial<User> = {}): User => ({
  id: 7,
  openId: "clerk:identity",
  name: "Test User",
  email: "test@example.com",
  loginMethod: "clerk",
  role: "user",
  createdAt: new Date(),
  updatedAt: new Date(),
  lastSignedIn: new Date(),
  ...overrides,
});

describe("external authentication", () => {
  beforeEach(() => {
    vi.resetModules();
    getUser.mockReset();
    getAuth.mockReset();
    getOrCreateClerkUser.mockReset();
    vi.unstubAllEnvs();
  });

  it("defaults to Clerk and rejects unknown providers", async () => {
    const { resolveAuthProvider } = await import("../shared/auth");
    expect(resolveAuthProvider()).toBe("clerk");
    expect(resolveAuthProvider(" manus ")).toBe("manus");
    expect(() => resolveAuthProvider("other")).toThrow(
      "Unsupported AUTH_PROVIDER"
    );
  });

  it("derives a stable 64-character Clerk namespace identity", async () => {
    const { clerkOpenId } = await import("./external-identity");
    const first = clerkOpenId("user_123");
    expect(first).toBe(clerkOpenId("user_123"));
    expect(first).toMatch(/^clerk:[0-9a-f]{58}$/);
    expect(first).toHaveLength(64);
    expect(first).not.toContain("@");
  });

  it("requires the verified primary email and passes only provider data to identity mapping", async () => {
    vi.stubEnv("CLERK_PUBLISHABLE_KEY", "pk_test_public");
    vi.stubEnv("CLERK_SECRET_KEY", "sk_test_private");
    getAuth.mockReturnValue({ isAuthenticated: true, userId: "user_123" });
    getUser.mockResolvedValue({
      id: "user_123",
      primaryEmailAddressId: "email_primary",
      emailAddresses: [
        {
          id: "email_other",
          emailAddress: "other@example.com",
          verification: { status: "verified" },
        },
        {
          id: "email_primary",
          emailAddress: "primary@example.com",
          verification: { status: "verified" },
        },
      ],
      firstName: "Test",
      lastName: "User",
    });
    getOrCreateClerkUser.mockResolvedValue(fakeUser());

    const { authenticateClerkRequest } = await import("./clerk-auth");
    await expect(authenticateClerkRequest({} as never)).resolves.toMatchObject({
      id: 7,
      role: "user",
      loginMethod: "clerk",
    });
    expect(getOrCreateClerkUser).toHaveBeenCalledWith({
      subject: "user_123",
      email: "primary@example.com",
      name: "Test User",
    });
  });

  it("treats missing Clerk keys and missing sessions as logged out", async () => {
    const { authenticateClerkRequest } = await import("./clerk-auth");
    await expect(authenticateClerkRequest({} as never)).resolves.toBeNull();

    vi.stubEnv("CLERK_PUBLISHABLE_KEY", "pk_test_public");
    vi.stubEnv("CLERK_SECRET_KEY", "sk_test_private");
    getAuth.mockReturnValue({ isAuthenticated: false, userId: null });
    await expect(authenticateClerkRequest({} as never)).resolves.toBeNull();
    expect(getUser).not.toHaveBeenCalled();
  });

  it("uses only explicit trusted HTTPS or loopback Clerk origins", async () => {
    const { DEFAULT_CLERK_ALLOWED_ORIGINS, clerkAllowedOrigins } = await import(
      "./clerk-auth"
    );
    expect(clerkAllowedOrigins({})).toEqual([...DEFAULT_CLERK_ALLOWED_ORIGINS]);
    expect(
      clerkAllowedOrigins({
        CLERK_ALLOWED_ORIGINS:
          "https://app.example, http://127.0.0.1:5173, https://app.example",
      })
    ).toEqual(["https://app.example", "http://127.0.0.1:5173"]);
    expect(() =>
      clerkAllowedOrigins({ CLERK_ALLOWED_ORIGINS: "http://attacker.example" })
    ).toThrow("HTTPS public origins or HTTP loopback origins");
  });

  it("requires an explicit production origin before publishing auth as configured", async () => {
    const { clerkAllowedOrigins, isClerkConfigured, registerClerkAuth } =
      await import("./clerk-auth");
    const env = {
      NODE_ENV: "production",
      CLERK_PUBLISHABLE_KEY: "pk_test_public",
      CLERK_SECRET_KEY: "sk_test_private",
    };
    expect(isClerkConfigured(env)).toBe(false);
    expect(() => clerkAllowedOrigins(env)).toThrow("required in production");
    expect(() =>
      clerkAllowedOrigins({ ...env, CLERK_ALLOWED_ORIGINS: " , " })
    ).toThrow("required in production");
    expect(() =>
      clerkAllowedOrigins({
        ...env,
        CLERK_ALLOWED_ORIGINS: "http://localhost:3000",
      })
    ).toThrow("requires HTTPS");
    expect(
      isClerkConfigured({
        ...env,
        CLERK_ALLOWED_ORIGINS: "https://app.example.invalid",
      })
    ).toBe(true);
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("AUTH_PROVIDER", "clerk");
    vi.stubEnv("CLERK_PUBLISHABLE_KEY", "pk_test_public");
    vi.stubEnv("CLERK_SECRET_KEY", "sk_test_private");
    vi.stubEnv("CLERK_ALLOWED_ORIGINS", "");
    expect(() => registerClerkAuth({ use: vi.fn() } as never)).toThrow(
      "required in production"
    );
  });

  it("rejects an unverified primary email without creating an identity", async () => {
    vi.stubEnv("CLERK_PUBLISHABLE_KEY", "pk_test_public");
    vi.stubEnv("CLERK_SECRET_KEY", "sk_test_private");
    getAuth.mockReturnValue({ isAuthenticated: true, userId: "user_123" });
    getUser.mockResolvedValue({
      id: "user_123",
      primaryEmailAddressId: "email_primary",
      emailAddresses: [
        {
          id: "email_primary",
          emailAddress: "primary@example.com",
          verification: { status: "unverified" },
        },
      ],
      firstName: "Test",
      lastName: "User",
    });

    const { authenticateClerkRequest } = await import("./clerk-auth");
    await expect(authenticateClerkRequest({} as never)).resolves.toBeNull();
    expect(getOrCreateClerkUser).not.toHaveBeenCalled();
  });
});
