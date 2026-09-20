import { createFileRoute, Link } from "@tanstack/react-router";
import { LegalContact } from "@/components/legal/LegalContact";
import { LegalList } from "@/components/legal/LegalList";
import { LegalPage } from "@/components/legal/LegalPage";
import { LegalSection } from "@/components/legal/LegalSection";

export const Route = createFileRoute("/data-deletion")({
  head: () => ({
    meta: [
      { title: "Data Deletion Policy - Launch Planner" },
      {
        name: "description",
        content: "How to request deletion of a Launch Planner account and its associated data.",
      },
    ],
  }),
  component: DataDeletionPolicy,
});

function DataDeletionPolicy() {
  return (
    <LegalPage
      title="Data Deletion Policy"
      summary="You can request deletion of your Launch Planner account and personal information. This page explains how, what will be removed, and what we may need to retain."
    >
      <LegalSection title="1. Requesting deletion">
        <p>
          Email{" "}
          <a
            className="font-medium text-foreground underline underline-offset-4"
            href="mailto:admin@launchplanner.com.au?subject=Launch%20Planner%20data%20deletion%20request"
          >
            admin@launchplanner.com.au
          </a>{" "}
          from the email address registered to your Launch Planner account with the subject “Project
          Base data deletion request”. Include your full name and the account email address. Do not
          send your password or payment card details.
        </p>
        <p>
          We will acknowledge the request, normally within five business days. To prevent
          unauthorised deletion, we may ask you to sign in, confirm a secure link or provide other
          reasonable proof of identity and authority.
        </p>
      </LegalSection>

      <LegalSection title="2. Before requesting deletion">
        <LegalList>
          <li>
            Download any summaries, PDFs, project files or records you need. Account deletion is
            intended to be permanent and cannot ordinarily be reversed.
          </li>
          <li>
            Resolve active contractor proposals, awards, collateral reviews and disputes where
            possible.
          </li>
          <li>
            If you only want to stop future billing, cancel the subscription instead. Cancellation
            and data deletion are separate actions.
          </li>
        </LegalList>
        <p>
          You may ask us for access to, or a copy of, personal information before deletion. Some
          planning exports are also available directly within Launch Planner.
        </p>
      </LegalSection>

      <LegalSection title="3. What we delete">
        <p>
          After verification, and subject to the exceptions below, we will delete or de-identify
          information associated with your account from active systems, including:
        </p>
        <LegalList>
          <li>your authentication account, profile details and profile image;</li>
          <li>
            projects you own, including descriptions, budgets, schedules, deliverables and hero
            images;
          </li>
          <li>
            your private contractor directory, project invitations, proposals, award decisions,
            messages and workflow records;
          </li>
          <li>collateral files and their review history;</li>
          <li>active contractor and client-facing share links; and</li>
          <li>transactional email queue entries and non-essential diagnostic records.</li>
        </LegalList>
        <p>
          We will also cancel an active Launch Planner subscription so it does not renew. Amounts
          already due or paid remain subject to the{" "}
          <Link to="/terms" className="font-medium text-foreground underline underline-offset-4">
            Terms and Conditions
          </Link>{" "}
          and applicable law.
        </p>
      </LegalSection>

      <LegalSection title="4. Information we may retain">
        <p>We may retain limited information where reasonably necessary to:</p>
        <LegalList>
          <li>
            comply with tax, accounting, corporate-record, regulatory or other legal obligations
            (financial records are commonly retained for five to seven years);
          </li>
          <li>establish, exercise or defend legal claims and resolve payment disputes;</li>
          <li>maintain security, fraud-prevention and deletion-request audit records; or</li>
          <li>protect the rights and safety of users and third parties.</li>
        </LegalList>
        <p>
          Retained information is restricted from ordinary product use and is deleted or
          de-identified when the retention purpose ends. Payment information held independently by
          Stripe is subject to Stripe’s own legal retention obligations.
        </p>
      </LegalSection>

      <LegalSection title="5. Contractor and shared information">
        <p>
          A project owner’s deletion request removes that owner’s project records and access links
          from Launch Planner. It cannot delete copies that recipients previously downloaded, printed
          or stored outside Launch Planner.
        </p>
        <p>
          If you participated as a contractor, some proposal, award, communication or financial
          records may form part of another user’s legitimate business records. We will assess your
          request against both parties’ rights and legal obligations and, where full deletion is not
          appropriate, restrict or de-identify your personal information where reasonably possible.
        </p>
      </LegalSection>

      <LegalSection title="6. Timing and backups">
        <p>
          We aim to complete verified deletion requests within 30 days. We will tell you if a
          complex request or legal requirement means we need longer.
        </p>
        <p>
          Residual encrypted copies may remain temporarily in protected disaster-recovery backups
          until they are overwritten under our providers’ normal backup rotation. Backup data is not
          available for ordinary use and will not be restored except for disaster recovery or a
          legal requirement.
        </p>
      </LegalSection>

      <LegalSection title="7. Confirmation and complaints">
        <p>
          We will confirm when the request is complete or explain any information we are required to
          retain. If you disagree with our response, contact our Privacy Officer. You may also
          complain to the{" "}
          <a
            href="https://www.oaic.gov.au/privacy/privacy-complaints"
            target="_blank"
            rel="noreferrer"
            className="font-medium text-foreground underline underline-offset-4"
          >
            Office of the Australian Information Commissioner
          </a>
          .
        </p>
      </LegalSection>

      <LegalSection title="8. Contact">
        <LegalContact />
      </LegalSection>
    </LegalPage>
  );
}
