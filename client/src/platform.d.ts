export {};
declare global {
  interface Window {
    __MANUS_CONFIG__?: {
      authProvider?: "clerk" | "manus";
      clerkPublishableKey?: string;
      authConfigured?: boolean;
      projectId?: string;
      oauthPortalUrl?: string;
      apiUrl?: string;
      apiBrowserKey?: string;
    };
  }
}
