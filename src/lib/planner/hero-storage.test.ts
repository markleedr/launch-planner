import { describe, expect, test } from "bun:test";
import { isSignedProjectHeroUrl, projectHeroObjectPath } from "./hero-storage";

const projectId = "11111111-1111-4111-8111-111111111111";
const path = `${projectId}/22222222-2222-4222-8222-222222222222.jpg`;

describe("project hero storage paths", () => {
  test("reads a bare path and the public and signed URLs", () => {
    expect(projectHeroObjectPath(path)).toBe(path);
    expect(
      projectHeroObjectPath(
        `https://example.supabase.co/storage/v1/object/public/project-heroes/${path}`,
      ),
    ).toBe(path);
    expect(
      projectHeroObjectPath(
        `https://example.supabase.co/storage/v1/object/sign/project-heroes/${path}?token=abc`,
      ),
    ).toBe(path);
  });

  test("leaves placeholders and other urls alone", () => {
    expect(projectHeroObjectPath("")).toBeNull();
    expect(projectHeroObjectPath("/hero-placeholders/apartments.jpg")).toBeNull();
    expect(projectHeroObjectPath("https://example.com/photo.jpg")).toBeNull();
    expect(projectHeroObjectPath(`${projectId}/../secret.jpg`)).toBeNull();
  });

  test("recognises an already signed url", () => {
    const signed = `https://example.supabase.co/storage/v1/object/sign/project-heroes/${path}?token=abc`;
    expect(isSignedProjectHeroUrl(signed)).toBe(true);
    expect(isSignedProjectHeroUrl(path)).toBe(false);
  });
});
