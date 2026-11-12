export type AuthProvider = "clerk" | "manus";

/**
 * Resolve the only supported authentication providers.
 *
 * Clerk is the safe default after the migration. Manus remains available only
 * when it is explicitly selected, so a typo cannot silently select a weaker or
 * unexpected authentication path.
 */
export function resolveAuthProvider(raw?: string): AuthProvider {
  const value = raw?.trim().toLowerCase();
  if (!value || value === "clerk") return "clerk";
  if (value === "manus") return "manus";
  throw new Error(`Unsupported AUTH_PROVIDER: ${raw}`);
}
