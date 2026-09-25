/**
 * Google Maps Embed API URL for an address, or null when no key is configured
 * so callers fall back to a plain Google Maps link.
 */
export function googleMapsEmbedUrl(address: string): string | null {
  const key = import.meta.env.VITE_GOOGLE_MAPS_EMBED_KEY as string | undefined;
  const query = address.trim();
  if (!key || !query) return null;
  const params = new URLSearchParams({ key, q: query, zoom: "15" });
  return `https://www.google.com/maps/embed/v1/place?${params.toString()}`;
}
