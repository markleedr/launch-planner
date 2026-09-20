import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/hooks/use-session";
import {
  isSubscriptionActive,
  type SubscriptionRecord,
  type SubscriptionStatus,
} from "@/lib/billing/subscription";

/**
 * Billing is part of the hosted product, so it is enabled by default. Local or
 * recovery builds can explicitly opt out with VITE_BILLING_ENABLED=false.
 * Hosted Stripe Checkout does not require a publishable key in the browser.
 */
export const BILLING_ENABLED = import.meta.env.VITE_BILLING_ENABLED !== "false";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const subTable = () => (supabase.from as any)("subscription");

interface UseSubscription {
  active: boolean;
  status: SubscriptionStatus | null;
  loading: boolean;
  billingEnabled: boolean;
  refresh: () => void;
}

/** Reactive subscription state for the signed-in user. */
export function useSubscription(): UseSubscription {
  const { user, loading: authLoading } = useSession();
  const [record, setRecord] = useState<SubscriptionRecord | null>(null);
  const [status, setStatus] = useState<SubscriptionStatus | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(() => {
    if (!BILLING_ENABLED || !user) {
      setRecord(null);
      setStatus(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    subTable()
      .select("status,current_period_end")
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data }: { data: { status: string; current_period_end: string | null } | null }) => {
        if (!data) {
          setRecord(null);
          setStatus(null);
        } else {
          setStatus(data.status as SubscriptionStatus);
          setRecord({
            status: data.status as SubscriptionStatus,
            currentPeriodEnd: data.current_period_end ? new Date(data.current_period_end) : null,
          });
        }
      })
      .catch(() => {
        setRecord(null);
        setStatus(null);
      })
      .finally(() => setLoading(false));
  }, [user]);

  useEffect(() => {
    if (authLoading) return;
    refresh();
  }, [authLoading, refresh]);

  // When billing is off the app is open to everyone.
  const active = !BILLING_ENABLED ? true : isSubscriptionActive(record);

  return {
    active,
    status,
    loading: authLoading || loading,
    billingEnabled: BILLING_ENABLED,
    refresh,
  };
}
