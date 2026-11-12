import { createHash } from "node:crypto";
import { and, eq } from "drizzle-orm";
import type { User } from "../drizzle/schema";
import { users } from "../drizzle/schema";
import { getDb } from "./db";

export type ClerkIdentityInput = {
  subject: string;
  email: string;
  name?: string | null;
  phoneNumber?: string | null;
};

export type ClerkIdentityOptions = {
  allowUninvited?: boolean;
};

export class ExternalIdentityError extends Error {
  readonly retryable: boolean;

  constructor(message: string, options: { retryable?: boolean } = {}) {
    super(message);
    this.name = "ExternalIdentityError";
    this.retryable = options.retryable ?? true;
  }
}

/**
 * Explicit operator provisioning for the external Clerk deployment.
 * Client input and Clerk metadata never grant an admin role.
 */
export function isConfiguredClerkAdminEmail(
  email: string,
  env: NodeJS.ProcessEnv = process.env
): boolean {
  const normalizedEmail = email.trim().toLowerCase();
  if (!normalizedEmail) return false;
  return (env.CLERK_ADMIN_EMAILS ?? "")
    .split(",")
    .map(value => value.trim().toLowerCase())
    .filter(Boolean)
    .includes(normalizedEmail);
}

/** A 64-character, non-email identity suitable for users.openId. */
export function clerkOpenId(subject: string): string {
  if (!subject.trim()) throw new Error("Clerk subject is required");
  return `clerk:${createHash("sha256").update(subject, "utf8").digest("hex").slice(0, 58)}`;
}

function isClerkLoginMethod(value: string | null): boolean {
  return value === "clerk";
}

/**
 * Find or create the local account for a verified Clerk subject. This does not
 * use db.upsertUser because that helper can infer owner/admin status from a
 * Manus environment variable. Omitting role from all writes preserves the
 * existing database role and leaves first-time accounts at the schema default.
 */
export async function getOrCreateClerkUser(
  input: ClerkIdentityInput,
  options: ClerkIdentityOptions = {}
): Promise<User> {
  const openId = clerkOpenId(input.subject);
  const database = await getDb();
  if (!database) {
    throw new ExternalIdentityError("Database is temporarily unavailable");
  }

  const existingRows = await database
    .select()
    .from(users)
    .where(eq(users.openId, openId))
    .limit(1);
  const existing = existingRows[0];

  if (existing && !isClerkLoginMethod(existing.loginMethod)) {
    throw new ExternalIdentityError(
      "The external identity collides with an existing non-Clerk account",
      { retryable: false }
    );
  }

  const operatorAccount = isConfiguredClerkAdminEmail(input.email);
  if (
    existing &&
    existing.inviteRequired &&
    !operatorAccount &&
    !options.allowUninvited
  ) {
    throw new ExternalIdentityError(
      "This account requires a valid Daonmarkets invitation link",
      { retryable: false }
    );
  }
  if (!existing && !operatorAccount && !options.allowUninvited) {
    throw new ExternalIdentityError(
      "A valid Daonmarkets invitation link is required before account creation",
      { retryable: false }
    );
  }

  if (existing) {
    await database
      .update(users)
      .set({
        name: input.name ?? existing.name,
        email: input.email,
        phoneNumber: input.phoneNumber ?? existing.phoneNumber,
        ...(operatorAccount
          ? { role: "admin" as const }
          : {}),
        lastSignedIn: new Date(),
      })
      .where(and(eq(users.id, existing.id), eq(users.loginMethod, "clerk")));
    return {
      ...existing,
      name: input.name ?? existing.name,
      email: input.email,
      phoneNumber: input.phoneNumber ?? existing.phoneNumber,
      lastSignedIn: new Date(),
    };
  }

  try {
    await database.insert(users).values({
      openId,
      name: input.name ?? null,
      email: input.email,
      phoneNumber: input.phoneNumber ?? null,
      loginMethod: "clerk",
      ...(operatorAccount
        ? { role: "admin" as const }
        : {}),
      inviteRequired: !operatorAccount,
    });
  } catch (error) {
    // A concurrent first login may have won the insert. Re-read and apply the
    // same collision rule rather than converting the error into a new account.
    const concurrentRows = await database
      .select()
      .from(users)
      .where(eq(users.openId, openId))
      .limit(1);
    const concurrent = concurrentRows[0];
    if (!concurrent) {
      throw new ExternalIdentityError("Failed to create the external identity");
    }
    if (!isClerkLoginMethod(concurrent.loginMethod)) {
      throw new ExternalIdentityError(
        "The external identity collides with an existing non-Clerk account",
        { retryable: false }
      );
    }
    return concurrent;
  }

  const createdRows = await database
    .select()
    .from(users)
    .where(eq(users.openId, openId))
    .limit(1);
  const created = createdRows[0];
  if (!created || !isClerkLoginMethod(created.loginMethod)) {
    throw new ExternalIdentityError(
      "Created external identity could not be read"
    );
  }
  return created;
}

// Descriptive aliases keep the provider-specific boundary easy to discover for
// callers without introducing a second implementation.
export const resolveExternalIdentity = getOrCreateClerkUser;
export const getOrCreateExternalUser = getOrCreateClerkUser;
