import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/hooks/use-session";
import {
  isSubscriptionActive,
  type SubscriptionRecord,
  type SubscriptionStatus,
} from "@/lib/billing/subscription";
import { trialIndicatorText } from "@/lib/billing/trial";

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
  /** Set while status is trialing, for example "14 days left in your trial". */
  trialLabel: string | null;
  /** True once a trial end has passed and the subscription no longer grants access. */
  trialEnded: boolean;
  loading: boolean;
  billingEnabled: boolean;
  refresh: () => void;
}

type SubscriptionRow = {
  status: string;
  current_period_end: string | null;
  trial_end?: string | null;
};

/** Reactive subscription state for the signed-in user. */
export function useSubscription(): UseSubscription {
  const { user, loading: authLoading } = useSession();
  const [record, setRecord] = useState<SubscriptionRecord | null>(null);
  const [trialEnd, setTrialEnd] = useState<Date | null>(null);
  const [status, setStatus] = useState<SubscriptionStatus | null>(null);
  const [loading, setLoading] = useState(true);

  const applyRow = useCallback((data: SubscriptionRow | null) => {
    if (!data) {
      setRecord(null);
      setStatus(null);
      setTrialEnd(null);
      return;
    }
    const nextStatus = data.status as SubscriptionStatus;
    setStatus(nextStatus);
    setTrialEnd(data.trial_end ? new Date(data.trial_end) : null);
    setRecord({
      status: nextStatus,
      currentPeriodEnd: data.current_period_end ? new Date(data.current_period_end) : null,
    });
  }, []);

  const refresh = useCallback(() => {
    if (!BILLING_ENABLED || !user) {
      setRecord(null);
      setStatus(null);
      setTrialEnd(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    subTable()
      .select("status,current_period_end,trial_end")
      .eq("user_id", user.id)
      .maybeSingle()
      .then(
        ({ data, error }: { data: SubscriptionRow | null; error: { message?: string } | null }) => {
          if (error) throw error;
          applyRow(data);
        },
      )
      .catch(() =>
        subTable()
          .select("status,current_period_end")
          .eq("user_id", user.id)
          .maybeSingle()
          .then(({ data }: { data: SubscriptionRow | null }) => applyRow(data))
          .catch(() => applyRow(null)),
      )
      .finally(() => setLoading(false));
  }, [applyRow, user]);

  useEffect(() => {
    if (authLoading) return;
    refresh();
  }, [authLoading, refresh]);

  // When billing is off the app is open to everyone.
  const active = !BILLING_ENABLED ? true : isSubscriptionActive(record);
  const trialLabel = trialIndicatorText(status, record?.currentPeriodEnd ?? null, new Date());
  const trialEnded = Boolean(trialEnd) && trialEnd!.getTime() < Date.now() && !active;

  return {
    active,
    status,
    trialLabel,
    trialEnded,
    loading: authLoading || loading,
    billingEnabled: BILLING_ENABLED,
    refresh,
  };
}
