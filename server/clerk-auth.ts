import type { Express, Request } from "express";
import { clerkClient, clerkMiddleware, getAuth } from "@clerk/express";
import type { User } from "../drizzle/schema";
import { resolveAuthProvider } from "../shared/auth";
import { getOrCreateClerkUser } from "./external-identity";

export const DEFAULT_CLERK_ALLOWED_ORIGINS = [
  "https://8328-ia2jgagze607ercssjrwg-c81a2c3d.sg2.manus.computer",
  "http://localhost:3000",
] as const;

export class ClerkAuthError extends Error {
  readonly retryable: boolean;

  constructor(message: string, options: { retryable?: boolean } = {}) {
    super(message);
    this.name = "ClerkAuthError";
    this.retryable = options.retryable ?? true;
  }
}

type ClerkProviderUser = {
  id: string;
  primaryEmailAddressId: string | null;
  emailAddresses: Array<{
    id: string;
    emailAddress: string;
    verification?: { status?: string | null } | null;
  }>;
  firstName: string | null;
  lastName: string | null;
  unsafeMetadata?: Record<string, unknown>;
};

function hasValue(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function metadataString(
  metadata: Record<string, unknown> | undefined,
  key: string
): string | null {
  const value = metadata?.[key];
  return typeof value === "string" && value.trim().length > 0
    ? value.trim()
    : null;
}

export function isClerkConfigured(
  env: NodeJS.ProcessEnv = process.env
): boolean {
  if (!hasValue(env.CLERK_PUBLISHABLE_KEY) || !hasValue(env.CLERK_SECRET_KEY))
    return false;
  try {
    return clerkAllowedOrigins(env).length > 0;
  } catch {
    return false;
  }
}

function parseAllowedOrigin(value: string): string {
  let url: URL;
  try {
    url = new URL(value.trim());
  } catch {
    throw new Error(`Invalid CLERK_ALLOWED_ORIGINS entry: ${value}`);
  }

  const isLoopback =
    url.protocol === "http:" &&
    (url.hostname === "localhost" ||
      url.hostname === "127.0.0.1" ||
      url.hostname === "[::1]" ||
      url.hostname === "::1");
  const isPublicHttps = url.protocol === "https:";

  if ((!isPublicHttps && !isLoopback) || url.username || url.password) {
    throw new Error(
      `CLERK_ALLOWED_ORIGINS must contain HTTPS public origins or HTTP loopback origins: ${value}`
    );
  }
  if (url.pathname !== "/" || url.search || url.hash) {
    throw new Error(
      `CLERK_ALLOWED_ORIGINS entries must be origins without paths or queries: ${value}`
    );
  }

  return url.origin;
}

export function clerkAllowedOrigins(
  env: NodeJS.ProcessEnv = process.env
): string[] {
  const raw = env.CLERK_ALLOWED_ORIGINS?.trim();
  const production = env.NODE_ENV === "production";
  if (!raw) {
    if (production)
      throw new Error("CLERK_ALLOWED_ORIGINS is required in production");
    return [...DEFAULT_CLERK_ALLOWED_ORIGINS];
  }

  const origins = raw
    .split(",")
    .map(value => value.trim())
    .filter(Boolean)
    .map(parseAllowedOrigin);
  if (origins.length === 0) {
    if (production)
      throw new Error("CLERK_ALLOWED_ORIGINS is required in production");
    return [...DEFAULT_CLERK_ALLOWED_ORIGINS];
  }
  if (production && origins.some(origin => !origin.startsWith("https://"))) {
    throw new Error("Production CLERK_ALLOWED_ORIGINS requires HTTPS origins");
  }
  return [...new Set(origins)];
}

/**
 * Add Clerk's authentication-state middleware. This is a no-op for the
 * explicit Manus rollback and for an unconfigured Clerk deployment; public
 * pages remain available while every protected request is logged out.
 */
export function registerClerkAuth(app: Express): void {
  if (resolveAuthProvider(process.env.AUTH_PROVIDER) !== "clerk") return;
  if (
    process.env.NODE_ENV === "production" &&
    hasValue(process.env.CLERK_PUBLISHABLE_KEY) &&
    hasValue(process.env.CLERK_SECRET_KEY)
  ) {
    clerkAllowedOrigins();
  }
  if (!isClerkConfigured()) {
    console.warn(
      "[Auth] Clerk is not configured; requests remain logged out until keys and trusted origins are configured."
    );
    return;
  }

  app.use(
    clerkMiddleware({
      publishableKey: process.env.CLERK_PUBLISHABLE_KEY,
      secretKey: process.env.CLERK_SECRET_KEY,
      authorizedParties: clerkAllowedOrigins(),
    })
  );
}

function verifiedPrimaryEmail(user: ClerkProviderUser): string | null {
  const primaryId = user.primaryEmailAddressId;
  if (!hasValue(primaryId)) return null;

  const primary = user.emailAddresses.find(address => address.id === primaryId);
  if (!primary || primary.verification?.status !== "verified") return null;
  return hasValue(primary.emailAddress) ? primary.emailAddress : null;
}

/**
 * Authenticate only the Clerk request state attached by clerkMiddleware(). A
 * missing/invalid token is a normal logged-out result. Once Clerk has accepted
 * a subject, provider-user and database failures are surfaced as retryable
 * errors so auth.me does not turn a transient outage into an endless login
 * loop.
 */
export async function authenticateClerkRequest(
  req: Request
): Promise<User | null> {
  if (!isClerkConfigured()) return null;

  let auth: ReturnType<typeof getAuth>;
  try {
    auth = getAuth(req);
  } catch {
    console.warn("[Auth] Clerk request had no usable middleware state");
    return null;
  }

  if (!auth.isAuthenticated || !hasValue(auth.userId)) return null;
  const verifiedSubject = auth.userId;

  let providerUser: ClerkProviderUser;
  try {
    providerUser = await clerkClient.users.getUser(verifiedSubject);
  } catch {
    console.error("[Auth] Clerk user lookup failed");
    throw new ClerkAuthError("Clerk user lookup is temporarily unavailable");
  }

  if (providerUser.id !== verifiedSubject) {
    console.warn("[Auth] Clerk subject did not match the provider user");
    return null;
  }

  const email = verifiedPrimaryEmail(providerUser);
  if (!email) {
    console.warn("[Auth] Clerk user has no verified primary email");
    return null;
  }

  try {
    const identity = {
      subject: verifiedSubject,
      email,
      name:
        [
          metadataString(providerUser.unsafeMetadata, "nickname") ??
            providerUser.firstName,
          providerUser.lastName,
        ]
          .filter(hasValue)
          .join(" ") || null,
      ...(metadataString(providerUser.unsafeMetadata, "phoneNumber")
        ? { phoneNumber: metadataString(providerUser.unsafeMetadata, "phoneNumber") }
        : {}),
    };
    const isInviteConsumeRequest = (req.originalUrl || req.url || "").includes(
      "invites.consume"
    );
    return isInviteConsumeRequest
      ? await getOrCreateClerkUser(identity, { allowUninvited: true })
      : await getOrCreateClerkUser(identity);
  } catch (error) {
    if (error instanceof ClerkAuthError) throw error;
    console.error("[Auth] Clerk identity lookup failed");
    throw new ClerkAuthError("Clerk identity is temporarily unavailable");
  }
}
