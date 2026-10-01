/**
 * Tells Launch Planner's events apart from other products on the shared Stripe
 * account (Content Proof uses the same account, and Stripe delivers every
 * event to every webhook).
 *
 * Existing subscriptions were created before we stamped an app name into
 * checkout metadata, so the price (or, if set, the product) is the check that
 * works for subscriptions already in Stripe. The app name is only a backstop
 * for events that carry no price at all.
 *
 * This follows the same ownership rules as Content Proof's webhook: a known
 * price or product means the event is ours; any other price means it belongs
 * to another product; the app tag is consulted only when the event has no
 * price to inspect.
 */

export const LAUNCH_PLANNER_APP = "launch-planner";

export type BillingSignals = {
  priceIds: string[];
  productIds: string[];
  app: string | null;
};

export type Ownership = "ours" | "foreign" | "unknown";

type MutableSignals = {
  priceIds: Set<string>;
  productIds: Set<string>;
};

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function addPriceRef(signals: MutableSignals, value: unknown) {
  if (typeof value === "string") {
    if (value.startsWith("price_")) signals.priceIds.add(value);
    return;
  }
  const rec = asRecord(value);
  if (!rec) return;
  if (typeof rec.id === "string" && rec.id.startsWith("price_")) {
    signals.priceIds.add(rec.id);
  }
  addProductRef(signals, rec.product);
}

function addProductRef(signals: MutableSignals, value: unknown) {
  if (typeof value === "string") {
    if (value.startsWith("prod_")) signals.productIds.add(value);
    return;
  }
  const rec = asRecord(value);
  if (rec && typeof rec.id === "string" && rec.id.startsWith("prod_")) {
    signals.productIds.add(rec.id);
  }
}

function absorbPriceCarrier(signals: MutableSignals, rec: Record<string, unknown>) {
  addPriceRef(signals, rec.price);
  addPriceRef(signals, rec.plan);
  addProductRef(signals, rec.product);
  const pricing = asRecord(rec.pricing);
  const details = asRecord(pricing?.price_details);
  if (!details) return;
  addPriceRef(signals, details.price);
  addProductRef(signals, details.product);
}

function readApp(value: unknown): string | null {
  const rec = asRecord(value);
  if (!rec || typeof rec.app !== "string") return null;
  const app = rec.app.trim();
  return app || null;
}

function listData(value: unknown): unknown[] {
  const rec = asRecord(value);
  return Array.isArray(rec?.data) ? rec.data : [];
}

/**
 * Price ids, product ids, and the app tag on one Stripe object (checkout
 * session, subscription, or invoice). Knows the shapes this account's webhook
 * API can produce: a price object, a bare price id, a legacy plan, and the
 * newer invoice line `pricing.price_details`.
 */
export function extractBillingSignals(object: unknown): BillingSignals {
  const signals: MutableSignals = { priceIds: new Set(), productIds: new Set() };
  const apps: string[] = [];
  const obj = asRecord(object);
  if (!obj) return { priceIds: [], productIds: [], app: null };

  const metaApp = readApp(obj.metadata);
  if (metaApp) apps.push(metaApp);

  for (const item of listData(obj.items)) {
    const rec = asRecord(item);
    if (!rec) continue;
    absorbPriceCarrier(signals, rec);
    const itemApp = readApp(rec.metadata);
    if (itemApp) apps.push(itemApp);
  }

  for (const item of listData(obj.line_items)) {
    const rec = asRecord(item);
    if (rec) absorbPriceCarrier(signals, rec);
  }

  for (const line of listData(obj.lines)) {
    const rec = asRecord(line);
    if (!rec) continue;
    absorbPriceCarrier(signals, rec);
    const lineApp = readApp(rec.metadata);
    if (lineApp) apps.push(lineApp);
  }

  const subDetails = asRecord(obj.subscription_details);
  const subApp = readApp(subDetails?.metadata);
  if (subApp) apps.push(subApp);

  const parent = asRecord(obj.parent);
  const parentApp = readApp(asRecord(parent?.subscription_details)?.metadata);
  if (parentApp) apps.push(parentApp);

  const app =
    apps.find((candidate) => candidate.toLowerCase() === LAUNCH_PLANNER_APP) ?? apps[0] ?? null;
  return {
    priceIds: [...signals.priceIds],
    productIds: [...signals.productIds],
    app,
  };
}

export function mergeSignals(left: BillingSignals, right: BillingSignals): BillingSignals {
  const app =
    [left.app, right.app].find((candidate) => candidate?.toLowerCase() === LAUNCH_PLANNER_APP) ??
    left.app ??
    right.app ??
    null;
  return {
    priceIds: [...new Set([...left.priceIds, ...right.priceIds])],
    productIds: [...new Set([...left.productIds, ...right.productIds])],
    app,
  };
}

/**
 * A known price or product means the event is ours, even without an app tag.
 * Any other price means it belongs to another product on the shared Stripe
 * account. The app tag is consulted only when the event has no price to inspect.
 *
 * An empty allow-list must not treat every price as foreign: that would drop
 * Launch Planner events when STRIPE_PRICE_ID is missing. Those events stay
 * `unknown`, and the webhook then syncs only customers it already knows.
 */
export function classifyOwnership(
  signals: BillingSignals,
  priceIds: ReadonlySet<string>,
  productIds: ReadonlySet<string>,
): Ownership {
  const hasAllowlist = priceIds.size > 0 || productIds.size > 0;
  if (priceIds.size > 0 && signals.priceIds.some((id) => priceIds.has(id))) return "ours";
  if (productIds.size > 0 && signals.productIds.some((id) => productIds.has(id))) return "ours";
  if (hasAllowlist && signals.priceIds.length > 0) return "foreign";
  if (productIds.size > 0 && signals.productIds.length > 0) return "foreign";
  const app = signals.app?.toLowerCase() ?? "";
  if (app === LAUNCH_PLANNER_APP) return "ours";
  if (app) return "foreign";
  return "unknown";
}

function splitIds(value: string | undefined): string[] {
  if (!value) return [];
  return value
    .split(",")
    .map((part) => part.trim())
    .filter((part) => part.length > 0);
}

/** The checkout price, plus any extras in LAUNCH_PLANNER_PRICE_IDS. */
export function configuredPriceIds(
  env: Record<string, string | undefined> = process.env,
): Set<string> {
  const ids = new Set<string>();
  const primary = env.STRIPE_PRICE_ID?.trim();
  if (primary) ids.add(primary);
  for (const id of splitIds(env.LAUNCH_PLANNER_PRICE_IDS)) ids.add(id);
  return ids;
}

/** Optional. Empty unless LAUNCH_PLANNER_PRODUCT_IDS is set. */
export function configuredProductIds(
  env: Record<string, string | undefined> = process.env,
): Set<string> {
  return new Set(splitIds(env.LAUNCH_PLANNER_PRODUCT_IDS));
}

export function launchPlannerMetadata(extra: Record<string, string> = {}): Record<string, string> {
  return { app: LAUNCH_PLANNER_APP, ...extra };
}

/** Thrown when a subscription cannot be linked to a Launch Planner account. */
export class UnknownStripeCustomerError extends Error {
  constructor() {
    super("Could not match the Stripe customer to an account.");
    this.name = "UnknownStripeCustomerError";
  }
}
