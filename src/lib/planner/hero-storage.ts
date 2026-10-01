export const HERO_BUCKET = "project-heroes";
export const HERO_SIGNED_URL_SECONDS = 60 * 60;

const OBJECT_PATH =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\/[A-Za-z0-9][A-Za-z0-9._-]{0,200}$/i;

/**
 * Storage object path for a custom project hero, or null for a built-in
 * placeholder, an empty value, or anything that is not in project-heroes.
 * Accepts a bare path and the public or signed URLs this bucket has used.
 */
export function projectHeroObjectPath(stored: string | null | undefined): string | null {
  if (!stored) return null;
  const value = stored.trim();
  if (!value || value.startsWith("/")) return null;
  if (OBJECT_PATH.test(value)) return value;

  let pathname: string;
  try {
    pathname = new URL(value).pathname;
  } catch {
    return null;
  }

  const markers = [
    `/storage/v1/object/public/${HERO_BUCKET}/`,
    `/storage/v1/object/sign/${HERO_BUCKET}/`,
    `/storage/v1/object/authenticated/${HERO_BUCKET}/`,
  ];
  for (const marker of markers) {
    const index = pathname.indexOf(marker);
    if (index === -1) continue;
    const path = decodeURIComponent(pathname.slice(index + marker.length));
    if (OBJECT_PATH.test(path)) return path;
  }
  return null;
}

export function isSignedProjectHeroUrl(stored: string): boolean {
  return stored.includes(`/object/sign/${HERO_BUCKET}/`);
}
