import { useEffect, useState } from "react";
import { resolveHeroImage } from "@/lib/planner/hero-images";
import { isSignedProjectHeroUrl, projectHeroObjectPath } from "@/lib/planner/hero-storage";
import { signProjectHero } from "@/lib/planner/project-assets.server";

/** Turn a stored hero path or legacy public URL into a URL an `<img>` can load. */
export function useResolvedHeroSrc(stored: string): string {
  const needsSignature = Boolean(projectHeroObjectPath(stored)) && !isSignedProjectHeroUrl(stored);
  const [src, setSrc] = useState(needsSignature ? "" : stored);

  useEffect(() => {
    if (!needsSignature) {
      setSrc(stored);
      return;
    }
    let cancelled = false;
    signProjectHero({ data: { stored } })
      .then((url) => {
        if (!cancelled) setSrc(url);
      })
      .catch(() => {
        if (!cancelled) setSrc("");
      });
    return () => {
      cancelled = true;
    };
  }, [needsSignature, stored]);

  return src;
}

export async function displayHeroSrc(stored: string): Promise<string> {
  if (!stored || !projectHeroObjectPath(stored) || isSignedProjectHeroUrl(stored)) return stored;
  try {
    return await signProjectHero({ data: { stored } });
  } catch {
    return stored;
  }
}

export function ResolvedHeroImage({
  imageId,
  imageUrl,
  alt,
  className,
  loading,
}: {
  imageId: string;
  imageUrl?: string;
  alt?: string;
  className?: string;
  loading?: "eager" | "lazy";
}) {
  const resolved = resolveHeroImage(imageId, imageUrl);
  const src = useResolvedHeroSrc(resolved.src);
  if (!src) return <div className={className} aria-hidden />;
  return <img src={src} alt={alt ?? resolved.alt} className={className} loading={loading} />;
}
