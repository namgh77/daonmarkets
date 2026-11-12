import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import type { User } from "../../drizzle/schema";
import { resolveAuthProvider } from "../../shared/auth";
import { authenticateClerkRequest, ClerkAuthError } from "../clerk-auth";
import { sdk } from "./sdk";

export type AuthContextError = {
  code: "AUTH_TEMPORARILY_UNAVAILABLE";
  retryable: true;
};

export type TrpcContext = {
  req: CreateExpressContextOptions["req"];
  res: CreateExpressContextOptions["res"];
  user: User | null;
  authError?: AuthContextError;
};

export async function createContext(
  opts: CreateExpressContextOptions
): Promise<TrpcContext> {
  let user: User | null = null;
  let authError: AuthContextError | undefined;
  const provider = resolveAuthProvider(process.env.AUTH_PROVIDER);

  if (provider === "clerk") {
    try {
      user = await authenticateClerkRequest(opts.req);
    } catch (error) {
      if (error instanceof ClerkAuthError && !error.retryable) {
        user = null;
      } else {
        console.error("[Auth] Clerk authentication failed", error);
        authError = {
          code: "AUTH_TEMPORARILY_UNAVAILABLE",
          retryable: true,
        };
      }
    }
  } else {
    try {
      user = await sdk.authenticateRequest(opts.req);
    } catch (error) {
      // Legacy Manus keeps its existing optional-auth behavior when explicitly
      // selected. Clerk requests never enter this branch.
      user = null;
    }
  }

  return {
    req: opts.req,
    res: opts.res,
    user,
    ...(authError ? { authError } : {}),
  };
}
