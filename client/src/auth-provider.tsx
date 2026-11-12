import { ClerkProvider, useAuth as useClerkAuth } from "@clerk/react";
import { enUS, jaJP, koKR } from "@clerk/localizations";
import { useQueryClient } from "@tanstack/react-query";
import {
  createContext,
  type PropsWithChildren,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { getRuntimeAuthConfig, type AuthProviderName } from "./const";
import { setClerkTokenGetter } from "./auth-token-transport";
import { getAuthLanguage } from "./auth-language";

export const clerkLocalizations = { ko: koKR, en: enUS, ja: jaJP } as const;

export const clerkAppearance = {
  layout: {
    socialButtonsPlacement: "top",
    socialButtonsVariant: "blockButton",
  },
  variables: {
    colorPrimary: "#e2ab35",
    colorText: "#f5f7ff",
    colorTextSecondary: "#aab5d0",
    colorBackground: "#121c3c",
    borderRadius: "0px",
    fontFamily: "inherit",
  },
  elements: {
    card: {
      boxShadow: "none",
      backgroundColor: "transparent",
      width: "100%",
    },
    socialButtonsBlockButton: {
      border: "1px solid #d7dbe5",
      backgroundColor: "#ffffff",
      color: "#080d22",
      minHeight: "48px",
    },
    formFieldLabel: { color: "#f5f7ff" },
    formFieldInput: {
      backgroundColor: "#0b1430",
      border: "1px solid #44527a",
      color: "#f5f7ff",
    },
    formFieldInputShowPasswordButton: { color: "#aab5d0" },
    formFieldHintText: { color: "#aab5d0" },
    formFieldErrorText: { color: "#ffb5a5" },
    formButtonPrimary: {
      backgroundColor: "#080d22",
      color: "#ffffff",
      minHeight: "48px",
    },
    footerActionLink: {
      color: "#b98516",
    },
  },
};

export type AuthBridgeValue = {
  provider: AuthProviderName;
  configured: boolean;
  ready: boolean;
  loading: boolean;
  providerSignedIn: boolean | null;
  signOut: () => Promise<void>;
};

const defaultAuthBridge: AuthBridgeValue = {
  provider: "clerk",
  configured: false,
  ready: false,
  loading: false,
  providerSignedIn: false,
  signOut: async () => undefined,
};

const AuthBridgeContext = createContext<AuthBridgeValue>(defaultAuthBridge);

export function useAuthBridge() {
  return useContext(AuthBridgeContext);
}

function isPrivateQuery(queryKey: readonly unknown[]) {
  const first = queryKey[0];
  const root = Array.isArray(first) ? first[0] : first;
  return (
    root === "auth" ||
    root === "finance" ||
    root === "admin" ||
    root === "portal"
  );
}

export function clearPrivateAuthQueries(
  queryClient: ReturnType<typeof useQueryClient>
) {
  queryClient.removeQueries({
    predicate: query => isPrivateQuery(query.queryKey),
  });
}

function StaticAuthBridge({ children }: PropsWithChildren) {
  const config = getRuntimeAuthConfig();
  const value = useMemo<AuthBridgeValue>(
    () => ({
      provider: config.provider,
      configured: config.configured,
      ready: config.configured,
      loading: false,
      providerSignedIn: null,
      signOut: async () => undefined,
    }),
    [config.configured, config.provider]
  );

  return (
    <AuthBridgeContext.Provider value={value}>
      {children}
    </AuthBridgeContext.Provider>
  );
}

function ClerkSessionBridge({ children }: PropsWithChildren) {
  const { isLoaded, isSignedIn, userId, getToken, signOut } = useClerkAuth();
  const queryClient = useQueryClient();
  const [transportReady, setTransportReady] = useState(false);
  const previousPrincipal = useRef<string | null | undefined>(undefined);

  useEffect(() => {
    if (!isLoaded) {
      setTransportReady(false);
      setClerkTokenGetter(null);
      return;
    }

    setClerkTokenGetter(() => getToken());
    setTransportReady(true);
    return () => setClerkTokenGetter(null);
  }, [getToken, isLoaded]);

  useEffect(() => {
    if (!isLoaded) return;
    if (
      previousPrincipal.current !== undefined &&
      previousPrincipal.current !== userId
    ) {
      clearPrivateAuthQueries(queryClient);
    }
    previousPrincipal.current = userId;
  }, [isLoaded, queryClient, userId]);

  const value = useMemo<AuthBridgeValue>(
    () => ({
      provider: "clerk",
      configured: true,
      ready: isLoaded && transportReady,
      loading: !isLoaded || !transportReady,
      providerSignedIn: Boolean(isSignedIn),
      signOut: async () => {
        await signOut();
        clearPrivateAuthQueries(queryClient);
      },
    }),
    [isLoaded, isSignedIn, queryClient, signOut, transportReady]
  );

  return (
    <AuthBridgeContext.Provider value={value}>
      {children}
    </AuthBridgeContext.Provider>
  );
}

export function AuthProvider({ children }: PropsWithChildren) {
  const config = getRuntimeAuthConfig();

  if (
    config.provider === "clerk" &&
    config.configured &&
    config.clerkPublishableKey
  ) {
    return (
      <ClerkProvider
        publishableKey={config.clerkPublishableKey}
        localization={clerkLocalizations[getAuthLanguage()]}
      >
        <ClerkSessionBridge>{children}</ClerkSessionBridge>
      </ClerkProvider>
    );
  }

  return <StaticAuthBridge>{children}</StaticAuthBridge>;
}
