import { Check, CircleDashed, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  PROJECT_PARTY_ROLE_LABELS,
  type DeliverableAssignmentGroup,
  type PortalContractorSpecialty,
  type ProposalStatus,
} from "@/lib/procurement";

export interface ContractorOption {
  email?: string;
  id: string;
  name: string;
  role: PortalContractorSpecialty;
}

export interface ExistingProposal {
  contractorId: string;
  status: ProposalStatus;
}

interface ContractorAssignmentBoardProps {
  contractors: ContractorOption[];
  existingByDeliverable: Map<string, Map<string, ExistingProposal>>;
  groups: DeliverableAssignmentGroup[];
  onToggle: (deliverableId: string, contractorId: string) => void;
  selectedByDeliverable: Record<string, string[]>;
}

export function ContractorAssignmentBoard({
  contractors,
  existingByDeliverable,
  groups,
  onToggle,
  selectedByDeliverable,
}: ContractorAssignmentBoardProps) {
  if (groups.length === 0) {
    return (
      <div className="rounded-lg border border-dashed px-4 py-10 text-center">
        <p className="font-medium">No deliverables to request prices for</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Add deliverables earlier in the project setup, then return here.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {groups.map((group) => {
        const eligibleContractors =
          group.key === "miscellaneous"
            ? contractors
            : contractors.filter((contractor) => contractor.role === group.recommendedRole);
        const title =
          group.key === "miscellaneous"
            ? "Miscellaneous / needs review"
            : PROJECT_PARTY_ROLE_LABELS[group.key];

        return (
          <section key={group.key} className="overflow-hidden rounded-lg border">
            <div className="flex flex-wrap items-start justify-between gap-3 border-b bg-muted/35 px-4 py-3">
              <div>
                <h3 className="font-semibold">{title}</h3>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {group.key === "miscellaneous"
                    ? "No matching contractor specialty has been added. Choose any available contractor or add the right specialty above."
                    : `${group.deliverables.length} recommended deliverable${group.deliverables.length === 1 ? "" : "s"} for this specialty.`}
                </p>
              </div>
              <Badge variant="outline">
                <Users className="mr-1 size-3.5" />
                {eligibleContractors.length}{" "}
                {eligibleContractors.length === 1 ? "contractor" : "contractors"}
              </Badge>
            </div>

            {eligibleContractors.length === 0 ? (
              <div className="px-4 py-5 text-sm text-muted-foreground">
                Add a matching portal contractor above before requesting prices for these
                deliverables.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[680px] border-collapse text-sm">
                  <thead>
                    <tr className="border-b bg-card">
                      <th
                        scope="col"
                        className="sticky left-0 z-10 min-w-64 border-r bg-card px-4 py-3 text-left font-medium"
                      >
                        Deliverable
                      </th>
                      {eligibleContractors.map((contractor) => (
                        <th
                          key={contractor.id}
                          scope="col"
                          className="min-w-44 border-l px-4 py-3 text-left"
                        >
                          <span className="block font-medium">{contractor.name}</span>
                          <span className="font-normal text-muted-foreground">Request a price</span>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {group.deliverables.map((deliverable) => (
                      <tr key={deliverable.id} className="border-b last:border-0">
                        <th
                          scope="row"
                          className="sticky left-0 z-10 border-r bg-card px-4 py-3 text-left font-medium"
                        >
                          {deliverable.name}
                        </th>
                        {eligibleContractors.map((contractor) => {
                          const existing = existingByDeliverable
                            .get(deliverable.id)
                            ?.get(contractor.id);
                          const selected =
                            selectedByDeliverable[deliverable.id]?.includes(contractor.id) ?? false;
                          const inputId = `quote-${deliverable.id}-${contractor.id}`;
                          return (
                            <td key={contractor.id} className="border-l px-4 py-3">
                              {existing ? (
                                <ProposalStatusBadge status={existing.status} />
                              ) : !contractor.email ? (
                                <span className="text-xs font-medium text-destructive">
                                  Email required
                                </span>
                              ) : (
                                <label
                                  htmlFor={inputId}
                                  className="flex cursor-pointer items-center gap-2"
                                >
                                  <Checkbox
                                    id={inputId}
                                    checked={selected}
                                    onCheckedChange={() => onToggle(deliverable.id, contractor.id)}
                                  />
                                  <span
                                    className={
                                      selected
                                        ? "font-medium text-foreground"
                                        : "text-muted-foreground"
                                    }
                                  >
                                    {selected ? "Will request" : "Not requested"}
                                  </span>
                                </label>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        );
      })}
    </div>
  );
}

function ProposalStatusBadge({ status }: { status: ProposalStatus }) {
  if (status === "awarded") {
    return (
      <Badge>
        <Check className="mr-1 size-3.5" />
        Awarded
      </Badge>
    );
  }

  const labels: Record<ProposalStatus, string> = {
    awarded: "Awarded",
    draft: "Draft",
    expired: "Expired",
    invited: "Invited",
    submitted: "Submitted",
    unsuccessful: "Not selected",
    withdrawn: "Withdrawn",
  };

  return (
    <Badge variant="secondary">
      <CircleDashed className="mr-1 size-3.5" />
      {labels[status]}
    </Badge>
  );
}
