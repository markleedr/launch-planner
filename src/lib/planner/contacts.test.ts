import { describe, expect, test } from "bun:test";
import { assignmentCoverage, ownerCandidates, seedContacts, supplierCandidates } from "./contacts";
import type { Deliverable } from "./types";

function deliverable(partial: Partial<Deliverable>): Deliverable {
  const date = new Date("2026-07-01");
  return {
    id: partial.id ?? "d",
    name: "x",
    category: "digital_performance",
    productionCostCents: 0,
    mediaCostCents: 0,
    setupLeadDays: 0,
    startDate: date,
    endDate: date,
    ...partial,
  };
}

describe("candidate filters", () => {
  const contacts = seedContacts();

  test("owners are agency or department heads", () => {
    const owners = ownerCandidates(contacts);
    expect(owners.every((c) => c.type !== "supplier")).toBe(true);
    expect(owners.length).toBeGreaterThan(0);
  });

  test("suppliers are supplier-type only", () => {
    const suppliers = supplierCandidates(contacts);
    expect(suppliers.every((c) => c.type === "supplier")).toBe(true);
  });
});

describe("assignmentCoverage", () => {
  test("counts owned, supplied and fully-assigned deliverables", () => {
    const deliverables = [
      deliverable({ id: "a", ownerContactId: "c-agency", supplierIds: ["c-print"] }),
      deliverable({ id: "b", ownerContactId: "c-agency" }),
      deliverable({ id: "c", supplierIds: ["c-media"] }),
      deliverable({ id: "d" }),
    ];
    const cov = assignmentCoverage(deliverables);
    expect(cov.total).toBe(4);
    expect(cov.owned).toBe(2);
    expect(cov.supplied).toBe(2);
    expect(cov.fullyAssigned).toBe(1);
  });

  test("empty supplierIds does not count as supplied", () => {
    const cov = assignmentCoverage([deliverable({ supplierIds: [] })]);
    expect(cov.supplied).toBe(0);
  });
});
