import { describe, expect, it } from "vitest";
import { isConfiguredClerkAdminEmail } from "./external-identity";

describe("explicit Clerk admin provisioning", () => {
  it("matches only the configured, normalized email allowlist", () => {
    const env = { CLERK_ADMIN_EMAILS: " admin@example.com,second@example.com " };

    expect(isConfiguredClerkAdminEmail("ADMIN@example.com", env)).toBe(true);
    expect(isConfiguredClerkAdminEmail("second@example.com", env)).toBe(true);
    expect(isConfiguredClerkAdminEmail("member@example.com", env)).toBe(false);
    expect(isConfiguredClerkAdminEmail("", env)).toBe(false);
  });

  it("does not grant admin when the allowlist is absent", () => {
    expect(isConfiguredClerkAdminEmail("admin@example.com", {})).toBe(false);
  });
});
