import { startLogin } from "@/const";
import { trpc } from "@/lib/trpc";
import { TRPCClientError } from "@trpc/client";
import { useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo } from "react";
import { clearPrivateAuthQueries, useAuthBridge } from "@/auth-provider";

export type UseAuthOptions = {
  redirectOnUnauthenticated?: boolean;
  redirectPath?: string;
};

export function useAuth(options?: UseAuthOptions) {
  const { redirectOnUnauthenticated = false, redirectPath } = options ?? {};
  const bridge = useAuthBridge();
  const utils = trpc.useUtils();
  const queryClient = useQueryClient();
  const canQueryIdentity = bridge.configured && bridge.ready;

  const meQuery = trpc.auth.me.useQuery(undefined, {
    enabled: canQueryIdentity,
    retry: false,
    staleTime: 0,
    refetchOnWindowFocus: false,
  });

  const logoutMutation = trpc.auth.logout.useMutation({
    onSuccess: () => {
      utils.auth.me.setData(undefined, null);
    },
  });

  const logout = useCallback(async () => {
    if (bridge.provider === "clerk") {
      if (bridge.configured) await bridge.signOut();
      utils.auth.me.setData(undefined, null);
      clearPrivateAuthQueries(queryClient);
      return;
    }

    try {
      await logoutMutation.mutateAsync();
    } catch (error: unknown) {
      if (
        error instanceof TRPCClientError &&
        error.data?.code === "UNAUTHORIZED"
      ) {
        return;
      }
      throw error;
    } finally {
      try {
        sessionStorage.removeItem("manus-cookie");
      } catch {
        // sessionStorage may be unavailable in an embedded or private browser.
      }
      clearPrivateAuthQueries(queryClient);
      utils.auth.me.setData(undefined, null);
      await utils.auth.me.invalidate();
    }
  }, [bridge, logoutMutation, queryClient, utils]);

  const serverIdentityUnavailable =
    bridge.provider === "clerk" &&
    bridge.providerSignedIn === true &&
    canQueryIdentity &&
    !meQuery.isPending &&
    !meQuery.error &&
    !meQuery.data;

  const user = meQuery.error ? null : (meQuery.data ?? null);
  const loading =
    bridge.loading ||
    (canQueryIdentity && (meQuery.isPending || meQuery.isFetching)) ||
    logoutMutation.isPending;

  const state = useMemo(
    () => ({
      user,
      loading,
      error: meQuery.error ?? logoutMutation.error ?? null,
      isAuthenticated: Boolean(user),
      provider: bridge.provider,
      providerSignedIn: bridge.providerSignedIn,
      authConfigured: bridge.configured,
      serverIdentityUnavailable,
    }),
    [
      bridge.configured,
      bridge.provider,
      bridge.providerSignedIn,
      loading,
      logoutMutation.error,
      meQuery.error,
      serverIdentityUnavailable,
      user,
    ]
  );

  useEffect(() => {
    if (!redirectOnUnauthenticated) return;
    if (loading) return;
    if (state.error || state.serverIdentityUnavailable) return;
    if (state.user) return;
    if (!bridge.configured) return;
    if (bridge.provider === "clerk" && bridge.providerSignedIn !== false)
      return;
    if (typeof window === "undefined") return;
    if (redirectPath && window.location.pathname === redirectPath) return;

    if (redirectPath) {
      window.location.href = redirectPath;
    } else {
      startLogin();
    }
  }, [
    bridge.configured,
    bridge.provider,
    bridge.providerSignedIn,
    loading,
    redirectOnUnauthenticated,
    redirectPath,
    state.error,
    state.serverIdentityUnavailable,
    state.user,
  ]);

  return {
    ...state,
    refresh: () => meQuery.refetch(),
    logout,
  };
}
