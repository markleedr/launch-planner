import { supabase } from "@/integrations/supabase/client";
import { prepareProjectHeroUpload } from "@/lib/planner/project-assets.server";

export const HERO_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
export type HeroImageType = (typeof HERO_IMAGE_TYPES)[number];
export const MAX_HERO_IMAGE_BYTES = 10 * 1024 * 1024;

/** The content type we will store, or null when the file is not a supported image. */
export function heroImageContentType(file: File): HeroImageType | null {
  if ((HERO_IMAGE_TYPES as readonly string[]).includes(file.type)) {
    return file.type as HeroImageType;
  }
  const extension = file.name.split(".").pop()?.toLowerCase();
  if (extension === "jpg" || extension === "jpeg") return "image/jpeg";
  if (extension === "png") return "image/png";
  if (extension === "webp") return "image/webp";
  return null;
}

export function heroImageFileError(file: File): string | null {
  if (!heroImageContentType(file)) return "Use a JPG, PNG or WebP image.";
  if (file.size > MAX_HERO_IMAGE_BYTES) return "Use an image up to 10 MB.";
  return null;
}

/** Upload a project cover and return its public URL. The caller saves that URL on the plan. */
export async function uploadProjectHero(projectId: string, file: File): Promise<string> {
  const problem = heroImageFileError(file);
  if (problem) throw new Error(problem);
  const contentType = heroImageContentType(file)!;
  const prepared = await prepareProjectHeroUpload({
    data: { projectId, fileName: file.name },
  });
  const { error } = await supabase.storage
    .from("project-heroes")
    .uploadToSignedUrl(prepared.path, prepared.token, file, { contentType });
  if (error) throw error;
  return prepared.publicUrl;
}
