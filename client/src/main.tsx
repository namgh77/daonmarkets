import { trpc } from "@/lib/trpc";
import { UNAUTHED_ERR_MSG } from "@shared/const";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { httpBatchLink, TRPCClientError } from "@trpc/client";
import { createRoot } from "react-dom/client";
import superjson from "superjson";
import App from "./App";
import { AuthProvider } from "./auth-provider";
import { getClerkAuthorizationHeaders } from "./auth-token-transport";
import { getRuntimeAuthConfig } from "./const";
import PwaInstallPrompt from "./components/PwaInstallPrompt";
import "./index.css";
import "./auth.css";
import "./password-guidance.css";
import "./clerk-auth.css";

const queryClient = new QueryClient();
let redirectingToLogin = false;

const redirectToLoginIfUnauthorized = (error: unknown) => {
  if (!(error instanceof TRPCClientError)) return;
  if (typeof window === "undefined") return;

  const isUnauthorized = error.message === UNAUTHED_ERR_MSG;

  if (!isUnauthorized) return;
  if (redirectingToLogin || window.location.pathname === "/login") return;

  redirectingToLogin = true;
  // Only the explicit login button starts OAuth and creates its one-time nonce.
  window.location.assign("/login");
};

queryClient.getQueryCache().subscribe(event => {
  if (event.type === "updated" && event.action.type === "error") {
    const error = event.query.state.error;
    redirectToLoginIfUnauthorized(error);
    console.error("[API Query Error]", error);
  }
});

queryClient.getMutationCache().subscribe(event => {
  if (event.type === "updated" && event.action.type === "error") {
    const error = event.mutation.state.error;
    redirectToLoginIfUnauthorized(error);
    console.error("[API Mutation Error]", error);
  }
});

const trpcClient = trpc.createClient({
  links: [
    httpBatchLink({
      url: "/api/trpc",
      transformer: superjson,
      async headers() {
        const config = getRuntimeAuthConfig();
        if (config.provider === "clerk") {
          return await getClerkAuthorizationHeaders();
        }
        return {};
      },
      fetch(input, init) {
        return globalThis.fetch(input, {
          ...(init ?? {}),
          credentials:
            getRuntimeAuthConfig().provider === "manus" ? "include" : "omit",
        });
      },
    }),
  ],
});

createRoot(document.getElementById("root")!).render(
  <QueryClientProvider client={queryClient}>
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <AuthProvider>
        <App />
        <PwaInstallPrompt />
      </AuthProvider>
    </trpc.Provider>
  </QueryClientProvider>
);

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    void navigator.serviceWorker.register("/sw.js").catch(error => {
      console.warn("[PWA] Service worker registration failed", error);
    });
  });
}
