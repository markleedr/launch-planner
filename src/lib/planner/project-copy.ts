import { PROJECT_TYPE_LABELS } from "./labels";
import type { ProjectAddress, ProjectType } from "./types";

export function formatProjectAddress(address: ProjectAddress): string {
  return [address.street, address.suburb, address.state, address.postcode]
    .map((part) => part.trim())
    .filter(Boolean)
    .join(", ");
}

export function generateProjectBlurb(input: {
  name: string;
  projectType: ProjectType;
  units: number;
  address: ProjectAddress;
}): string {
  const name = input.name.trim() || "This project";
  const type = PROJECT_TYPE_LABELS[input.projectType].toLowerCase();
  const unitCopy = input.units > 0 ? ` comprising ${Math.trunc(input.units)} residences` : "";
  const location = formatProjectAddress(input.address);
  const locationCopy = location ? ` in ${location}` : "";

  return `${name} is a considered ${type} development${unitCopy}${locationCopy}, supported by a coordinated launch plan designed to connect the project with its intended buyers.`;
}

export function googleMapsUrl(address: ProjectAddress): string | null {
  const value = formatProjectAddress(address);
  return value
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(value)}`
    : null;
}
