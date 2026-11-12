export type ClerkTokenGetter = () => Promise<string | null>;

let clerkTokenGetter: ClerkTokenGetter | null = null;

export function setClerkTokenGetter(getter: ClerkTokenGetter | null) {
  clerkTokenGetter = getter;
}

export async function getClerkAuthorizationHeaders(): Promise<
  Record<string, string>
> {
  if (!clerkTokenGetter) return {};

  const token = await clerkTokenGetter();
  return token ? { Authorization: `Bearer ${token}` } : {};
}
