import { type ReactNode, useEffect, useRef, useState } from "react";
import { Navigate, useRouterState } from "@tanstack/react-router";
import { useSubscription } from "@/hooks/use-subscription";
import { useSession } from "@/hooks/use-session";
import { syncSubscription } from "@/lib/billing/billing.server";

/**
 * Gate app content behind sign-in and, when billing is configured, an active
 * subscription. The requested path is preserved across authentication.
 *
 * A stored subscription row can lag Stripe (missed or delayed webhook), which
 * would bounce a paying customer straight back to /pricing after signing in.
 * Before redirecting, sync once with Stripe and re-check.
 */
export function RequireSubscription({ children }: { children: ReactNode }) {
  const { user, loading: authLoading } = useSession();
  const { active, loading, billingEnabled, refresh } = useSubscription();
  const currentLocation = useRouterState({ select: (state) => state.location.href });
  const redirect = useRef(currentLocation).current;
  const [syncing, setSyncing] = useState(false);
  const syncAttempted = useRef(false);

  const needsSync = Boolean(user) && billingEnabled && !loading && !active;

  useEffect(() => {
    if (!needsSync || syncAttempted.current) return;
    syncAttempted.current = true;
    setSyncing(true);
    syncSubscription()
      .catch(() => {})
      .finally(() => {
        refresh();
        setSyncing(false);
      });
  }, [needsSync, refresh]);

  if (authLoading) return null;
  if (!user) return <Navigate to="/login" search={{ redirect }} replace />;
  if (!billingEnabled) return <>{children}</>;
  if (loading || syncing) return null;
  if (!active && !syncAttempted.current) return null;
  if (!active) return <Navigate to="/pricing" search={{ reason: "resubscribe" }} />;
  return <>{children}</>;
}
