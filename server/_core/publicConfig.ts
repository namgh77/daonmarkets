import { isClerkConfigured } from "../clerk-auth";
import { resolveAuthProvider } from "../../shared/auth";

// Only named, browser-safe values may reach the browser. Never serialize
// process.env wholesale or include Clerk/Manus signing secrets.
export function publicPlatformConfig(env: NodeJS.ProcessEnv = process.env) {
  const authProvider = resolveAuthProvider(env.AUTH_PROVIDER);
  const clerkMode = authProvider === "clerk";

  if (clerkMode) {
    return {
      authProvider,
      clerkPublishableKey: env.CLERK_PUBLISHABLE_KEY ?? "",
      authConfigured: isClerkConfigured(env),
    };
  }

  return {
    authProvider,
    clerkPublishableKey: "",
    authConfigured:
      Boolean(env.MANUS_PROJECT_ID?.trim()) &&
      Boolean(env.MANUS_OAUTH_PORTAL_URL?.trim()),
    projectId: env.MANUS_PROJECT_ID ?? "",
    oauthPortalUrl: env.MANUS_OAUTH_PORTAL_URL ?? "",
    apiUrl: env.MANUS_API_URL ?? "",
    apiBrowserKey: env.MANUS_API_BROWSER_KEY ?? "",
  };
}

export function publicPlatformScript(
  env: NodeJS.ProcessEnv = process.env
): string {
  const json = JSON.stringify(publicPlatformConfig(env)).replaceAll(
    "<",
    "\\u003c"
  );
  return `window.__MANUS_CONFIG__=${json};`;
}
