import { describe, expect, test } from "bun:test";
import { heroImageContentType, heroImageFileError } from "./hero-upload";

function file(name: string, type: string, size = 1000): File {
  const body = new Uint8Array(size);
  return new File([body], name, { type });
}

describe("hero image upload checks", () => {
  test("accepts jpeg, png and webp, including a missing browser type", () => {
    expect(heroImageContentType(file("cover.jpg", "image/jpeg"))).toBe("image/jpeg");
    expect(heroImageContentType(file("cover.png", "image/png"))).toBe("image/png");
    expect(heroImageContentType(file("cover.webp", "image/webp"))).toBe("image/webp");
    expect(heroImageContentType(file("cover.JPG", ""))).toBe("image/jpeg");
  });

  test("rejects other files and images over 10 MB", () => {
    expect(heroImageFileError(file("notes.pdf", "application/pdf"))).toBe(
      "Use a JPG, PNG or WebP image.",
    );
    expect(heroImageFileError(file("cover.png", "image/png", 10 * 1024 * 1024 + 1))).toBe(
      "Use an image up to 10 MB.",
    );
    expect(heroImageFileError(file("cover.png", "image/png"))).toBeNull();
  });
});
