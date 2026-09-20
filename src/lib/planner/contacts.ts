/**
 * Contacts & suppliers: a directory of people/organisations that can be
 * assigned to deliverables (an owning agency/department head and one or more
 * suppliers). Pure data + helpers; assignment lives on the Deliverable.
 *
 * v1 stores contacts as plain records (no logins); the model carries enough to
 * later link a contact to an invited collaborator.
 */

import type { Deliverable } from "./types";

export type ContactType = "agency_head" | "department_head" | "supplier";

export interface Contact {
  id: string;
  name: string;
  organisation?: string;
  type: ContactType;
  /** Free-text role/discipline, e.g. "Print", "Media buying", "Web". */
  roleCategory?: string;
  email?: string;
}

export const CONTACT_TYPE_LABELS: Record<ContactType, string> = {
  agency_head: "Agency",
  department_head: "Department head",
  supplier: "Supplier",
};

export const CONTACT_TYPES = Object.keys(CONTACT_TYPE_LABELS) as ContactType[];

/** Contacts eligible to OWN a deliverable (agency or department head). */
export function ownerCandidates(contacts: Contact[]): Contact[] {
  return contacts.filter((c) => c.type === "agency_head" || c.type === "department_head");
}

/** Contacts eligible to be allocated as suppliers. */
export function supplierCandidates(contacts: Contact[]): Contact[] {
  return contacts.filter((c) => c.type === "supplier");
}

export interface AssignmentCoverage {
  total: number;
  /** Deliverables with an owner assigned. */
  owned: number;
  /** Deliverables with at least one supplier. */
  supplied: number;
  /** Deliverables with both an owner and a supplier. */
  fullyAssigned: number;
}

/** How well the deliverables are covered by owners/suppliers. */
export function assignmentCoverage(deliverables: Deliverable[]): AssignmentCoverage {
  let owned = 0;
  let supplied = 0;
  let fullyAssigned = 0;
  for (const d of deliverables) {
    const hasOwner = Boolean(d.ownerContactId);
    const hasSupplier = (d.supplierIds?.length ?? 0) > 0;
    if (hasOwner) owned += 1;
    if (hasSupplier) supplied += 1;
    if (hasOwner && hasSupplier) fullyAssigned += 1;
  }
  return { total: deliverables.length, owned, supplied, fullyAssigned };
}

/** A starter contacts directory (placeholder examples). */
export function seedContacts(): Contact[] {
  return [
    {
      id: "c-agency",
      name: "Acme Creative",
      type: "agency_head",
      organisation: "Acme Creative",
      roleCategory: "Creative & brand",
    },
    {
      id: "c-marketing",
      name: "Marketing lead",
      type: "department_head",
      roleCategory: "Marketing",
    },
    {
      id: "c-print",
      name: "PrintCo",
      type: "supplier",
      organisation: "PrintCo",
      roleCategory: "Print",
    },
    {
      id: "c-media",
      name: "MediaBuy Co",
      type: "supplier",
      organisation: "MediaBuy Co",
      roleCategory: "Media buying",
    },
    {
      id: "c-web",
      name: "Webwright",
      type: "supplier",
      organisation: "Webwright",
      roleCategory: "Web",
    },
  ];
}
