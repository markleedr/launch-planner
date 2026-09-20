import type { ProjectType } from "./types";

export interface HeroImageOption {
  id: string;
  name: string;
  src: string;
  alt: string;
  recommendedFor: ProjectType[];
}

export const HERO_IMAGE_LIBRARY: HeroImageOption[] = [
  {
    id: "apartments",
    name: "Multi Residential",
    src: "/hero-placeholders/apartments.jpg",
    alt: "Contemporary Australian apartment development with landscaped frontage",
    recommendedFor: ["multi_residential"],
  },
  {
    id: "house-and-land",
    name: "House and land",
    src: "/hero-placeholders/house-and-land.jpg",
    alt: "Contemporary Australian house in a landscaped residential community",
    recommendedFor: ["house_and_land"],
  },
  {
    id: "coastal",
    name: "Retirement living",
    src: "/hero-placeholders/coastal.jpg",
    alt: "Modern Australian retirement living community with landscaped gardens and villas",
    recommendedFor: ["multi_residential", "house_and_land"],
  },
  {
    id: "commercial",
    name: "Commercial",
    src: "/hero-placeholders/commercial.jpg",
    alt: "Modern Australian shopping centre and retail precinct with landscaped parking and contemporary architecture",
    recommendedFor: ["multi_residential"],
  },
];

export function resolveHeroImage(id: string, customUrl?: string): HeroImageOption {
  if (customUrl) {
    return {
      id: "custom",
      name: "Custom project image",
      src: customUrl,
      alt: "Project hero image",
      recommendedFor: [],
    };
  }
  return HERO_IMAGE_LIBRARY.find((image) => image.id === id) ?? HERO_IMAGE_LIBRARY[0];
}
