import { createServerFn } from "@tanstack/react-start";
import { subBusinessDays } from "date-fns";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { proposalValuesToDeliverablePatch } from "./workflow";
import { notify } from "./notifications.server";
import { adminClient, assertProjectOwner, cleanOrigin, table } from "./server-helpers";
import type { ProposalValues } from "./types";

const partyRoleSchema = z.enum([
  "developer",
  "architect",
  "creative_agency",
  "digital_agency",
  "content_agency",
  "media_agency",
  "sales_team",
  "builder",
]);

const proposalValuesSchema = z.object({
  notes: z.string().max(10_000).default(""),
  setupBusinessDays: z.number().int().min(0).max(3_650),
  agencyOneOffCents: z.number().int().min(0),
  agencyMonthlyCents: z.number().int().min(0),
  productionUnitCents: z.number().int().min(0),
  productionToBeConfirmed: z.boolean(),
  mediaOneOffCents: z.number().int().min(0),
  mediaMonthlyCents: z.number().int().min(0),
  quantity: z.number().int().min(0).max(1_000_000),
  months: z.number().int().min(0).max(1_200),
});

const deliverableBriefSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1).max(300),
  description: z.string().max(20_000).default(""),
  category: z.string().min(1).max(100),
  requirements: z.string().max(30_000).default(""),
  requiredFormats: z.array(z.string().max(100)).max(50).default([]),
  collateralCutoffAt: z.string().datetime().optional(),
  collectionLeadBusinessDays: z.number().int().min(0).max(365).default(10),
});

export const saveDirectoryParty = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        id: z.string().uuid().optional(),
        organisationName: z.string().trim().min(1).max(200),
        representativeName: z.string().trim().max(200).default(""),
        email: z.string().trim().email().optional().or(z.literal("")),
        phone: z.string().trim().max(80).optional().default(""),
        website: z.string().trim().max(500).optional().default(""),
        role: partyRoleSchema,
      })
      .parse(input),
  )
  .handler(async ({ context, data }) => {
    const client = await adminClient();
    const userId = context.userId as string;
    const portalEnabled = [
      "creative_agency",
      "digital_agency",
      "content_agency",
      "media_agency",
    ].includes(data.role);
    const values = {
      owner_user_id: userId,
      organisation_name: data.organisationName,
      representative_name: data.representativeName,
      email: data.email || null,
      phone: data.phone || null,
      website: data.website || null,
      role: data.role,
      portal_enabled: portalEnabled,
    };

    if (data.id) {
      const { data: updated, error } = await table(client, "party_directory")
        .update(values)
        .eq("id", data.id)
        .eq("owner_user_id", userId)
        .select("*")
        .single();
      if (error || !updated) throw error ?? new Error("Party not found.");
      return updated;
    }

    const { data: created, error } = await table(client, "party_directory")
      .insert(values)
      .select("*")
      .single();
    if (error || !created) throw error ?? new Error("Could not create party.");
    return created;
  });

export const attachProjectParty = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        projectId: z.string().uuid(),
        partyId: z.string().uuid(),
        role: partyRoleSchema,
      })
      .parse(input),
  )
  .handler(async ({ context, data }) => {
    const client = await adminClient();
    const userId = context.userId as string;
    await assertProjectOwner(client, data.projectId, userId);
    const { data: party, error: partyError } = await table(client, "party_directory")
      .select("id")
      .eq("id", data.partyId)
      .eq("owner_user_id", userId)
      .single();
    if (partyError || !party) throw new Error("Party not found or access denied.");

    const { data: row, error } = await table(client, "project_party")
      .upsert(
        { project_id: data.projectId, party_id: data.partyId, role: data.role },
        { onConflict: "project_id,party_id,role" },
      )
      .select("*")
      .single();
    if (error) throw error;
    return row;
  });

export const inviteContractors = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        projectId: z.string().uuid(),
        deliverable: deliverableBriefSchema,
        contractorPartyIds: z.array(z.string().uuid()).min(1).max(50),
        submissionDeadline: z.string().datetime(),
        origin: z.string().url(),
      })
      .parse(input),
  )
  .handler(async ({ context, data }) => {
    const client = await adminClient();
    const userId = context.userId as string;
    const project = await assertProjectOwner(client, data.projectId, userId);
    const origin = cleanOrigin(data.origin);

    const { data: latestBrief } = await table(client, "deliverable_brief")
      .select("*")
      .eq("project_id", data.projectId)
      .eq("deliverable_id", data.deliverable.id)
      .order("revision", { ascending: false })
      .limit(1)
      .maybeSingle();
    const latest = latestBrief as unknown as Record<string, unknown> | null;
    const sameBrief =
      latest &&
      latest.name === data.deliverable.name &&
      latest.description === data.deliverable.description &&
      latest.category === data.deliverable.category &&
      latest.requirements === data.deliverable.requirements &&
      JSON.stringify(latest.required_formats ?? []) ===
        JSON.stringify(data.deliverable.requiredFormats) &&
      latest.proposal_deadline === data.submissionDeadline;

    let briefId = sameBrief ? String(latest.id) : "";
    if (!briefId) {
      const nextRevision = latest ? Number(latest.revision) + 1 : 1;
      const { data: brief, error } = await table(client, "deliverable_brief")
        .insert({
          project_id: data.projectId,
          deliverable_id: data.deliverable.id,
          revision: nextRevision,
          name: data.deliverable.name,
          description: data.deliverable.description,
          category: data.deliverable.category,
          requirements: data.deliverable.requirements,
          required_formats: data.deliverable.requiredFormats,
          proposal_deadline: data.submissionDeadline,
          collateral_cutoff_at: data.deliverable.collateralCutoffAt ?? null,
          collection_lead_business_days: data.deliverable.collectionLeadBusinessDays,
          created_by: userId,
        })
        .select("id")
        .single();
      if (error || !brief) throw error ?? new Error("Could not create the brief.");
      briefId = String((brief as unknown as { id: string }).id);
    }

    const results: Array<{ proposalId: string; contractorPartyId: string }> = [];
    for (const partyId of [...new Set(data.contractorPartyIds)]) {
      const { data: partyData, error: partyError } = await table(client, "party_directory")
        .select("*")
        .eq("id", partyId)
        .eq("owner_user_id", userId)
        .eq("portal_enabled", true)
        .single();
      if (partyError || !partyData) throw new Error("A selected contractor is not available.");
      const party = partyData as unknown as {
        id: string;
        organisation_name: string;
        representative_name: string;
        email: string | null;
        auth_user_id: string | null;
      };
      if (!party.email) {
        throw new Error(`${party.organisation_name} needs an email address before inviting.`);
      }

      let authUserId = party.auth_user_id;
      if (!authUserId) {
        const invite = await client.auth.admin.inviteUserByEmail(party.email, {
          redirectTo: `${origin}/contractor?invited=1`,
          data: {
            organisation_name: party.organisation_name,
            representative_name: party.representative_name,
          },
        });
        if (invite.error) {
          throw new Error(`Could not invite ${party.organisation_name}: ${invite.error.message}`);
        }
        authUserId = invite.data.user.id;
        const { error: partyUpdateError } = await table(client, "party_directory")
          .update({ auth_user_id: authUserId })
          .eq("id", party.id)
          .eq("owner_user_id", userId);
        if (partyUpdateError) throw partyUpdateError;
      }

      const { data: proposalData, error: proposalError } = await table(
        client,
        "contractor_proposal",
      )
        .upsert(
          {
            brief_id: briefId,
            contractor_party_id: party.id,
            status: "invited",
            invitation_sent_at: new Date().toISOString(),
          },
          { onConflict: "brief_id,contractor_party_id" },
        )
        .select("id")
        .single();
      if (proposalError || !proposalData) {
        throw proposalError ?? new Error("Could not create the proposal invitation.");
      }
      const proposalId = String((proposalData as unknown as { id: string }).id);
      const { error: threadError } = await table(client, "deliverable_thread").upsert(
        {
          proposal_id: proposalId,
          project_id: data.projectId,
          deliverable_id: data.deliverable.id,
          owner_user_id: userId,
          contractor_party_id: party.id,
          delivery_status: "invitation_sent",
        },
        { onConflict: "proposal_id" },
      );
      if (threadError) throw threadError;

      await notify(client, {
        userId: authUserId,
        email: party.email,
        kind: "proposal_invitation",
        title: `Proposal requested for ${data.deliverable.name}`,
        body: `${project.name} has invited ${party.organisation_name} to submit a private proposal by ${new Date(data.submissionDeadline).toLocaleDateString("en-AU")}.`,
        href: `${origin}/contractor`,
      });
      results.push({ proposalId, contractorPartyId: party.id });
    }

    return { briefId, invitations: results };
  });

export const submitProposal = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        proposalId: z.string().uuid(),
        values: proposalValuesSchema,
      })
      .parse(input),
  )
  .handler(async ({ context, data }) => {
    const client = await adminClient();
    const userId = context.userId as string;
    const { data: proposalData, error } = await table(client, "contractor_proposal")
      .select(
        "*, brief:deliverable_brief(*), contractor:party_directory(*), thread:deliverable_thread(id)",
      )
      .eq("id", data.proposalId)
      .single();
    if (error || !proposalData) throw new Error("Proposal not found.");
    const proposal = proposalData as unknown as {
      id: string;
      status: string;
      current_revision: number;
      brief: {
        project_id: string;
        name: string;
        proposal_deadline: string | null;
      };
      contractor: { auth_user_id: string | null };
      thread: { id: string } | Array<{ id: string }> | null;
    };
    if (proposal.contractor.auth_user_id !== userId) throw new Error("Access denied.");
    if (!["invited", "submitted"].includes(proposal.status)) {
      throw new Error("This proposal is no longer open.");
    }
    if (
      proposal.brief.proposal_deadline &&
      new Date(proposal.brief.proposal_deadline).getTime() < Date.now()
    ) {
      if (proposal.status === "invited") {
        await table(client, "contractor_proposal")
          .update({ status: "expired" })
          .eq("id", proposal.id);
        throw new Error("The proposal deadline has passed.");
      }
      throw new Error("The revision window has closed. Your submitted proposal remains available.");
    }

    const revision = proposal.current_revision + 1;
    const values = data.values as ProposalValues;
    const { data: revisionRow, error: revisionError } = await table(client, "proposal_revision")
      .insert({
        proposal_id: proposal.id,
        revision,
        notes: values.notes,
        setup_business_days: values.setupBusinessDays,
        agency_one_off_cents: values.agencyOneOffCents,
        agency_monthly_cents: values.agencyMonthlyCents,
        production_unit_cents: values.productionUnitCents,
        production_to_be_confirmed: values.productionToBeConfirmed,
        media_one_off_cents: values.mediaOneOffCents,
        media_monthly_cents: values.mediaMonthlyCents,
        quantity: values.quantity,
        months: values.months,
        submitted_by: userId,
      })
      .select("*")
      .single();
    if (revisionError) throw revisionError;

    const now = new Date().toISOString();
    const { error: updateError } = await table(client, "contractor_proposal")
      .update({ status: "submitted", current_revision: revision, submitted_at: now })
      .eq("id", proposal.id);
    if (updateError) throw updateError;
    const thread = Array.isArray(proposal.thread) ? proposal.thread[0] : proposal.thread;
    if (thread?.id) {
      await table(client, "deliverable_thread")
        .update({ delivery_status: "proposal_submitted" })
        .eq("id", thread.id);
    }

    const { data: project } = await table(client, "project")
      .select("user_id,name")
      .eq("id", proposal.brief.project_id)
      .single();
    if (project) {
      const owner = project as unknown as { user_id: string; name: string };
      await notify(client, {
        userId: owner.user_id,
        kind: revision === 1 ? "proposal_submitted" : "proposal_revised",
        title: `${revision === 1 ? "Proposal submitted" : "Proposal revised"}: ${proposal.brief.name}`,
        body: `A contractor proposal for ${owner.name} is ready to review.`,
        href: `/planner/procurement?projectId=${proposal.brief.project_id}`,
      });
    }
    return revisionRow;
  });

export const awardProposal = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({ proposalId: z.string().uuid(), origin: z.string().url() }).parse(input),
  )
  .handler(async ({ context, data }) => {
    const client = await adminClient();
    const userId = context.userId as string;
    const origin = cleanOrigin(data.origin);
    const { data: proposalData, error } = await table(client, "contractor_proposal")
      .select(
        "*, brief:deliverable_brief(*), contractor:party_directory(*), revisions:proposal_revision(*)",
      )
      .eq("id", data.proposalId)
      .single();
    if (error || !proposalData) throw new Error("Proposal not found.");
    const proposal = proposalData as unknown as {
      id: string;
      status: string;
      current_revision: number;
      brief: {
        project_id: string;
        deliverable_id: string;
        name: string;
        collateral_cutoff_at: string | null;
        collection_lead_business_days: number;
      };
      contractor: {
        id: string;
        organisation_name: string;
        email: string | null;
        auth_user_id: string | null;
      };
      revisions: Array<Record<string, unknown>>;
    };
    if (proposal.status !== "submitted")
      throw new Error("Only submitted proposals can be awarded.");
    const project = await assertProjectOwner(client, proposal.brief.project_id, userId);
    const selected = proposal.revisions.find(
      (row) => Number(row.revision) === proposal.current_revision,
    );
    if (!selected) throw new Error("The submitted proposal revision could not be found.");
    const values = revisionRowToValues(selected);
    const now = new Date().toISOString();

    const { data: allBriefs } = await table(client, "deliverable_brief")
      .select("id")
      .eq("project_id", proposal.brief.project_id)
      .eq("deliverable_id", proposal.brief.deliverable_id);
    const briefIds = ((allBriefs ?? []) as Array<{ id: string }>).map((row) => row.id);
    if (briefIds.length > 0) {
      await table(client, "contractor_proposal")
        .update({ status: "unsuccessful" })
        .in("brief_id", briefIds)
        .neq("id", proposal.id)
        .in("status", ["invited", "submitted"]);
    }
    const { error: awardError } = await table(client, "contractor_proposal")
      .update({ status: "awarded", awarded_at: now })
      .eq("id", proposal.id);
    if (awardError) throw awardError;
    const { data: awardedThread, error: threadUpdateError } = await table(
      client,
      "deliverable_thread",
    )
      .update({ delivery_status: "awarded" })
      .eq("proposal_id", proposal.id)
      .select("id")
      .single();
    if (threadUpdateError || !awardedThread) {
      throw threadUpdateError ?? new Error("Could not open the awarded delivery workspace.");
    }

    const projectData = structuredClone(project.data);
    const deliverables = Array.isArray(projectData.deliverables)
      ? (projectData.deliverables as Array<Record<string, unknown>>)
      : [];
    const index = deliverables.findIndex((item) => item.id === proposal.brief.deliverable_id);
    if (index < 0) throw new Error("The project deliverable could not be found.");
    const patch = proposalValuesToDeliverablePatch(values);
    const original = deliverables[index];
    const next = {
      ...original,
      ...patch,
      awardedContractorPartyId: proposal.contractor.id,
    };
    deliverables[index] = next;
    projectData.deliverables = deliverables;

    const { data: latestRevision } = await table(client, "deliverable_revision")
      .select("revision")
      .eq("project_id", project.id)
      .eq("deliverable_id", proposal.brief.deliverable_id)
      .order("revision", { ascending: false })
      .limit(1)
      .maybeSingle();
    const nextRevision =
      Number((latestRevision as unknown as { revision?: number } | null)?.revision ?? 0) + 1;
    const { error: revisionError } = await table(client, "deliverable_revision").insert({
      project_id: project.id,
      deliverable_id: proposal.brief.deliverable_id,
      revision: nextRevision,
      source: "award",
      snapshot: { before: original, after: next },
      proposal_revision_id: selected.id,
      approved_by: userId,
    });
    if (revisionError) throw revisionError;
    const { error: projectUpdateError } = await table(client, "project")
      .update({ data: projectData })
      .eq("id", project.id)
      .eq("user_id", userId);
    if (projectUpdateError) throw projectUpdateError;

    await notify(client, {
      userId: proposal.contractor.auth_user_id,
      email: proposal.contractor.email,
      kind: "proposal_awarded",
      title: `Proposal awarded: ${proposal.brief.name}`,
      body: `${proposal.contractor.organisation_name} has been selected for ${project.name}.`,
      href: `${origin}/contractor`,
    });

    if (proposal.brief.collateral_cutoff_at) {
      try {
        const cutoff = new Date(proposal.brief.collateral_cutoff_at);
        const scheduledFor = subBusinessDays(
          cutoff,
          Math.max(0, proposal.brief.collection_lead_business_days ?? 0),
        );
        const dueNow = scheduledFor.getTime() <= Date.now();
        const { error: requestError } = await table(client, "collateral_request").insert({
          thread_id: (awardedThread as unknown as { id: string }).id,
          cutoff_at: cutoff.toISOString(),
          scheduled_for: scheduledFor.toISOString(),
          status: dueNow ? "sent" : "scheduled",
          sent_at: dueNow ? now : null,
          created_by: userId,
        });
        if (requestError) throw requestError;
        if (dueNow) {
          await table(client, "deliverable_thread")
            .update({ delivery_status: "collateral_requested" })
            .eq("id", (awardedThread as unknown as { id: string }).id);
          await notify(client, {
            userId: proposal.contractor.auth_user_id,
            email: proposal.contractor.email,
            kind: "collateral_requested",
            title: `Collateral requested: ${proposal.brief.name}`,
            body: `Collateral is required by ${cutoff.toLocaleDateString("en-AU")}.`,
            href: `${origin}/contractor`,
          });
        }
      } catch (error) {
        // Awarding is the authoritative action. A scheduling fault should not
        // tell the owner the award failed after it has already been committed.
        console.error("Could not schedule the collateral request for an awarded proposal", error);
      }
    }

    const { data: unsuccessfulData } = briefIds.length
      ? await table(client, "contractor_proposal")
          .select("contractor:party_directory(organisation_name,email,auth_user_id)")
          .in("brief_id", briefIds)
          .eq("status", "unsuccessful")
      : { data: [] };
    for (const row of (unsuccessfulData ?? []) as Array<Record<string, unknown>>) {
      const contractor = row.contractor as {
        organisation_name: string;
        email: string | null;
        auth_user_id: string | null;
      };
      await notify(client, {
        userId: contractor.auth_user_id,
        email: contractor.email,
        kind: "proposal_unsuccessful",
        title: `Proposal outcome: ${proposal.brief.name}`,
        body: `Thank you for your proposal. Another provider has been selected for ${project.name}.`,
        href: `${origin}/contractor`,
      });
    }

    return { projectId: project.id, deliverableId: proposal.brief.deliverable_id };
  });

export const updateProposalDeadline = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        projectId: z.string().uuid(),
        deliverableId: z.string().min(1),
        submissionDeadline: z.string().datetime(),
        origin: z.string().url(),
      })
      .parse(input),
  )
  .handler(async ({ context, data }) => {
    const client = await adminClient();
    const userId = context.userId as string;
    const origin = cleanOrigin(data.origin);
    const project = await assertProjectOwner(client, data.projectId, userId);
    const { data: briefs, error: briefError } = await table(client, "deliverable_brief")
      .select("id,name")
      .eq("project_id", data.projectId)
      .eq("deliverable_id", data.deliverableId);
    if (briefError) throw briefError;
    const briefRows = (briefs ?? []) as Array<{ id: string; name: string }>;
    const briefIds = briefRows.map((brief) => brief.id);
    if (briefIds.length === 0) throw new Error("Deliverable brief not found.");
    const { error: updateError } = await table(client, "deliverable_brief")
      .update({ proposal_deadline: data.submissionDeadline })
      .in("id", briefIds);
    if (updateError) throw updateError;
    await table(client, "contractor_proposal")
      .update({ status: "invited" })
      .in("brief_id", briefIds)
      .eq("status", "expired");

    const { data: proposals } = await table(client, "contractor_proposal")
      .select("contractor:party_directory(auth_user_id,email)")
      .in("brief_id", briefIds)
      .in("status", ["invited", "submitted"]);
    for (const row of (proposals ?? []) as Array<Record<string, unknown>>) {
      const contractor = row.contractor as {
        auth_user_id: string | null;
        email: string | null;
      };
      await notify(client, {
        userId: contractor.auth_user_id,
        email: contractor.email,
        kind: "deadline_changed",
        title: `Proposal deadline updated: ${briefRows[0].name}`,
        body: `The proposal deadline for ${project.name} is now ${new Date(data.submissionDeadline).toLocaleDateString("en-AU")}.`,
        href: `${origin}/contractor`,
      });
    }
    return { updated: true };
  });

export const submitVariation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        proposalId: z.string().uuid(),
        reason: z.string().trim().min(1).max(10_000),
        values: proposalValuesSchema,
      })
      .parse(input),
  )
  .handler(async ({ context, data }) => {
    const client = await adminClient();
    const userId = context.userId as string;
    const { data: proposalData } = await table(client, "contractor_proposal")
      .select(
        "*, contractor:party_directory(auth_user_id), brief:deliverable_brief(project_id,name)",
      )
      .eq("id", data.proposalId)
      .eq("status", "awarded")
      .single();
    if (!proposalData) throw new Error("Awarded proposal not found.");
    const proposal = proposalData as unknown as {
      contractor: { auth_user_id: string | null };
      brief: { project_id: string; name: string };
    };
    if (proposal.contractor.auth_user_id !== userId) throw new Error("Access denied.");
    const { data: latest } = await table(client, "proposal_variation")
      .select("revision")
      .eq("proposal_id", data.proposalId)
      .order("revision", { ascending: false })
      .limit(1)
      .maybeSingle();
    const revision = Number((latest as unknown as { revision?: number } | null)?.revision ?? 0) + 1;
    const { data: created, error } = await table(client, "proposal_variation")
      .insert({
        proposal_id: data.proposalId,
        revision,
        reason: data.reason,
        values: data.values,
        submitted_by: userId,
      })
      .select("*")
      .single();
    if (error) throw error;
    const { data: project } = await table(client, "project")
      .select("user_id")
      .eq("id", proposal.brief.project_id)
      .single();
    if (project) {
      await notify(client, {
        userId: String((project as unknown as { user_id: string }).user_id),
        kind: "variation_submitted",
        title: `Variation submitted: ${proposal.brief.name}`,
        body: data.reason,
        href: `/planner/procurement?projectId=${proposal.brief.project_id}`,
      });
    }
    return created;
  });

export const decideVariation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        variationId: z.string().uuid(),
        decision: z.enum(["approved", "rejected"]),
        origin: z.string().url(),
      })
      .parse(input),
  )
  .handler(async ({ context, data }) => {
    const client = await adminClient();
    const userId = context.userId as string;
    const origin = cleanOrigin(data.origin);
    const { data: variationData } = await table(client, "proposal_variation")
      .select(
        "*, proposal:contractor_proposal(*, contractor:party_directory(*), brief:deliverable_brief(*))",
      )
      .eq("id", data.variationId)
      .eq("status", "submitted")
      .single();
    if (!variationData) throw new Error("Variation not found.");
    const variation = variationData as unknown as {
      id: string;
      values: ProposalValues;
      proposal: {
        id: string;
        contractor: {
          id: string;
          organisation_name: string;
          auth_user_id: string | null;
          email: string | null;
        };
        brief: { project_id: string; deliverable_id: string; name: string };
      };
    };
    const project = await assertProjectOwner(client, variation.proposal.brief.project_id, userId);
    const now = new Date().toISOString();
    const { error } = await table(client, "proposal_variation")
      .update({ status: data.decision, decided_by: userId, decided_at: now })
      .eq("id", variation.id);
    if (error) throw error;

    if (data.decision === "approved") {
      const projectData = structuredClone(project.data);
      const deliverables = Array.isArray(projectData.deliverables)
        ? (projectData.deliverables as Array<Record<string, unknown>>)
        : [];
      const index = deliverables.findIndex(
        (item) => item.id === variation.proposal.brief.deliverable_id,
      );
      if (index < 0) throw new Error("The project deliverable could not be found.");
      const original = deliverables[index];
      const next = {
        ...original,
        ...proposalValuesToDeliverablePatch(variation.values),
        awardedContractorPartyId: variation.proposal.contractor.id,
      };
      deliverables[index] = next;
      projectData.deliverables = deliverables;
      const { data: latestRevision } = await table(client, "deliverable_revision")
        .select("revision")
        .eq("project_id", project.id)
        .eq("deliverable_id", variation.proposal.brief.deliverable_id)
        .order("revision", { ascending: false })
        .limit(1)
        .maybeSingle();
      const revision =
        Number((latestRevision as unknown as { revision?: number } | null)?.revision ?? 0) + 1;
      await table(client, "deliverable_revision").insert({
        project_id: project.id,
        deliverable_id: variation.proposal.brief.deliverable_id,
        revision,
        source: "variation",
        snapshot: { before: original, after: next, variationId: variation.id },
        approved_by: userId,
      });
      await table(client, "project")
        .update({ data: projectData })
        .eq("id", project.id)
        .eq("user_id", userId);
    }

    await notify(client, {
      userId: variation.proposal.contractor.auth_user_id,
      email: variation.proposal.contractor.email,
      kind: data.decision === "approved" ? "variation_approved" : "variation_rejected",
      title: `Variation ${data.decision}: ${variation.proposal.brief.name}`,
      body: `Your variation for ${project.name} was ${data.decision}.`,
      href: `${origin}/contractor`,
    });
    return { status: data.decision };
  });

export async function processProposalDeadlines(origin = "") {
  const client = await adminClient();
  const now = new Date();
  const warningWindow = new Date(now.getTime() + 48 * 60 * 60 * 1000);
  const { data: proposalData, error } = await table(client, "contractor_proposal")
    .select(
      "id,status,deadline_warning_sent_at,brief:deliverable_brief!inner(name,proposal_deadline),contractor:party_directory(auth_user_id,email)",
    )
    .in("status", ["invited", "submitted"])
    .lte("brief.proposal_deadline", warningWindow.toISOString())
    .limit(500);
  if (error) throw error;

  let expired = 0;
  let warned = 0;
  for (const row of (proposalData ?? []) as Array<Record<string, unknown>>) {
    const brief = row.brief as { name: string; proposal_deadline: string | null };
    const contractor = row.contractor as {
      auth_user_id: string | null;
      email: string | null;
    };
    if (!brief.proposal_deadline) continue;
    const deadline = new Date(brief.proposal_deadline);
    if (deadline.getTime() <= now.getTime()) {
      if (row.status === "submitted") continue;
      const { data: closed, error: closeError } = await table(client, "contractor_proposal")
        .update({ status: "expired" })
        .eq("id", row.id)
        .eq("status", "invited")
        .select("id")
        .maybeSingle();
      if (closeError) throw closeError;
      if (closed) expired += 1;
      continue;
    }
    if (row.deadline_warning_sent_at) continue;
    const { data: claimed, error: claimError } = await table(client, "contractor_proposal")
      .update({ deadline_warning_sent_at: now.toISOString() })
      .eq("id", row.id)
      .is("deadline_warning_sent_at", null)
      .select("id")
      .maybeSingle();
    if (claimError) throw claimError;
    if (!claimed) continue;
    await notify(client, {
      userId: contractor.auth_user_id,
      email: contractor.email,
      kind: "deadline_approaching",
      title: `Proposal deadline approaching: ${brief.name}`,
      body: `Your private proposal is due ${deadline.toLocaleString("en-AU")}.`,
      href: `${origin}/contractor`,
    });
    warned += 1;
  }
  return { expired, warned };
}

function revisionRowToValues(row: Record<string, unknown>): ProposalValues {
  return {
    notes: String(row.notes ?? ""),
    setupBusinessDays: Number(row.setup_business_days) || 0,
    agencyOneOffCents: Number(row.agency_one_off_cents) || 0,
    agencyMonthlyCents: Number(row.agency_monthly_cents) || 0,
    productionUnitCents: Number(row.production_unit_cents) || 0,
    productionToBeConfirmed: Boolean(row.production_to_be_confirmed),
    mediaOneOffCents: Number(row.media_one_off_cents) || 0,
    mediaMonthlyCents: Number(row.media_monthly_cents) || 0,
    quantity: Number(row.quantity) || 0,
    months: Number(row.months) || 0,
  };
}
