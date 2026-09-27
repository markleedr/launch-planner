/** UTM parameters captured from the landing URL and kept for the session. */

export interface UtmParams {
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  utm_content: string | null;
  utm_term: string | null;
}

const STORAGE_KEY = "launch-planner:utm";

const UTM_KEYS = ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term"] as const;

export function emptyUtm(): UtmParams {
  return {
    utm_source: null,
    utm_medium: null,
    utm_campaign: null,
    utm_content: null,
    utm_term: null,
  };
}

function readParam(params: URLSearchParams, key: (typeof UTM_KEYS)[number]): string | null {
  const value = params.get(key)?.trim();
  return value ? value.slice(0, 200) : null;
}

/** Parse UTM params from a URLSearchParams / query string object. */
export function parseUtmFromSearch(params: URLSearchParams): UtmParams {
  return {
    utm_source: readParam(params, "utm_source"),
    utm_medium: readParam(params, "utm_medium"),
    utm_campaign: readParam(params, "utm_campaign"),
    utm_content: readParam(params, "utm_content"),
    utm_term: readParam(params, "utm_term"),
  };
}

export function hasAnyUtm(utm: UtmParams): boolean {
  return UTM_KEYS.some((key) => Boolean(utm[key]));
}

/** Persist UTMs in sessionStorage so they survive in-page navigation. */
export function persistUtm(utm: UtmParams): void {
  if (typeof sessionStorage === "undefined") return;
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(utm));
  } catch {
    // private mode / quota — ignore
  }
}

export function loadPersistedUtm(): UtmParams | null {
  if (typeof sessionStorage === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<UtmParams>;
    return {
      utm_source: typeof parsed.utm_source === "string" ? parsed.utm_source : null,
      utm_medium: typeof parsed.utm_medium === "string" ? parsed.utm_medium : null,
      utm_campaign: typeof parsed.utm_campaign === "string" ? parsed.utm_campaign : null,
      utm_content: typeof parsed.utm_content === "string" ? parsed.utm_content : null,
      utm_term: typeof parsed.utm_term === "string" ? parsed.utm_term : null,
    };
  } catch {
    return null;
  }
}

/**
 * On first load: prefer UTMs from the URL; if none, fall back to session.
 * When the URL has UTMs, overwrite the session store.
 */
export function captureUtmFromWindow(): UtmParams {
  if (typeof window === "undefined") return emptyUtm();
  const fromUrl = parseUtmFromSearch(new URLSearchParams(window.location.search));
  if (hasAnyUtm(fromUrl)) {
    persistUtm(fromUrl);
    return fromUrl;
  }
  return loadPersistedUtm() ?? emptyUtm();
}
