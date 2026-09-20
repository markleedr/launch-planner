import { createFileRoute, Link } from "@tanstack/react-router";
import { LegalContact } from "@/components/legal/LegalContact";
import { LegalList } from "@/components/legal/LegalList";
import { LegalPage } from "@/components/legal/LegalPage";
import { LegalSection } from "@/components/legal/LegalSection";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: "Privacy Policy - Launch Planner" },
      {
        name: "description",
        content: "How Launch Planner collects, uses, stores and protects personal information.",
      },
    ],
  }),
  component: PrivacyPolicy,
});

function PrivacyPolicy() {
  return (
    <LegalPage
      title="Privacy Policy"
      summary="This policy explains how Launch Planner Pty Ltd handles personal information when you use Launch Planner, our property-project planning and contractor coordination service."
    >
      <LegalSection title="1. Who we are">
        <p>
          Launch Planner is operated by Launch Planner Pty Ltd (“Launch Planner”, “we”, “us” or
          “our”). We manage personal information in accordance with the Privacy Act 1988 (Cth) and
          the Australian Privacy Principles where they apply.
        </p>
        <LegalContact />
      </LegalSection>

      <LegalSection title="2. Information we collect">
        <p>Depending on how you use Launch Planner, we may collect:</p>
        <LegalList>
          <li>
            <strong className="text-foreground">Account and profile information:</strong> name,
            email address, phone number, organisation, job title, password credentials managed by
            our authentication provider, and profile image.
          </li>
          <li>
            <strong className="text-foreground">Subscription information:</strong> subscription
            status, Stripe customer and subscription references, billing dates and payment status.
            Launch Planner does not receive or store your full card number.
          </li>
          <li>
            <strong className="text-foreground">Project information:</strong> project names,
            addresses, descriptions, images, budgets, schedules, deliverables, supplier and
            contractor contact details, map links and client-facing summaries.
          </li>
          <li>
            <strong className="text-foreground">Procurement and delivery information:</strong>
            invitations, proposals, pricing, notes, messages, deadlines, decisions, collateral,
            files, versions and approval history.
          </li>
          <li>
            <strong className="text-foreground">Communications:</strong> support requests,
            complaints, email delivery records and other correspondence with us.
          </li>
          <li>
            <strong className="text-foreground">Technical information:</strong> IP address, browser
            and device details, session data, timestamps, diagnostic logs and security events.
          </li>
        </LegalList>
        <p>
          Please do not upload sensitive personal information unless it is genuinely required for
          your project and you have authority to provide it.
        </p>
      </LegalSection>

      <LegalSection title="3. How we collect information">
        <p>
          We collect information directly from you when you create an account, subscribe, complete
          your profile, create a project, communicate with us or upload content. We also receive
          information from contractors invited by a project owner, people who use a private share
          link, and service providers that help us operate Launch Planner.
        </p>
        <p>
          We use necessary browser storage and similar technologies to keep you signed in, remember
          application state, protect the service and make core features work. We do not currently
          use Launch Planner data for third-party targeted advertising.
        </p>
      </LegalSection>

      <LegalSection title="4. Why we use information">
        <p>We collect, hold, use and disclose personal information to:</p>
        <LegalList>
          <li>create, secure and administer accounts and subscriptions;</li>
          <li>save projects and provide planning, costing, sharing and export features;</li>
          <li>invite contractors and support proposals, awards, communications and delivery;</li>
          <li>send authentication, onboarding, deadline, collateral and service emails;</li>
          <li>process payments, cancellations and billing enquiries;</li>
          <li>provide support, investigate errors and improve reliability and usability;</li>
          <li>prevent fraud, abuse and unauthorised access; and</li>
          <li>meet legal, accounting, regulatory and dispute-resolution obligations.</li>
        </LegalList>
        <p>
          We will not use personal information for an unrelated purpose unless you consent or the
          use is permitted or required by law.
        </p>
      </LegalSection>

      <LegalSection title="5. Who receives information">
        <p>We may disclose information to:</p>
        <LegalList>
          <li>
            cloud, authentication, database and storage providers, including Supabase and the
            managed hosting infrastructure used by Lovable;
          </li>
          <li>Stripe for subscription billing and payment management;</li>
          <li>Resend and related email infrastructure for transactional messages;</li>
          <li>
            contractors and recipients you choose to invite or provide with a unique project share
            link;
          </li>
          <li>
            professional advisers, insurers, regulators, courts, law-enforcement bodies or other
            parties where reasonably necessary or legally required; and
          </li>
          <li>
            a successor if our business or relevant assets are restructured or transferred, subject
            to appropriate confidentiality protections.
          </li>
        </LegalList>
        <p>
          We do not sell personal information. Project owners control which project details are
          shared with contractors and public-link recipients. Anyone holding an active private link
          may be able to access its permitted content, so links should be shared carefully and
          revoked when no longer needed.
        </p>
      </LegalSection>

      <LegalSection title="6. Overseas processing">
        <p>
          Some service providers may process or store information outside Australia, including in
          the United States and in other locations where they or their subprocessors operate. The
          exact locations may change as provider infrastructure changes. We take reasonable steps to
          use reputable providers and contractual or technical safeguards appropriate to the
          information involved.
        </p>
      </LegalSection>

      <LegalSection title="7. Security and retention">
        <p>
          We use measures including access controls, row-level database permissions, private file
          storage, short-lived signed file links, encrypted network connections and restricted
          administrative credentials. No online service can promise absolute security, so please use
          a unique password and keep invitation and sharing links confidential.
        </p>
        <p>
          We retain information only for as long as reasonably needed to provide Launch Planner,
          resolve disputes, maintain security and meet legal, tax and accounting obligations.
          Retention periods vary by record type. Our{" "}
          <Link
            to="/data-deletion"
            className="font-medium text-foreground underline underline-offset-4"
          >
            Data Deletion Policy
          </Link>{" "}
          explains the account-deletion process.
        </p>
      </LegalSection>

      <LegalSection title="8. Access, correction and complaints">
        <p>
          You can update many profile and project details within Launch Planner. To request access to
          personal information we hold, correct information you cannot edit, or make a privacy
          complaint, contact us using the details below. We may need to verify your identity before
          acting.
        </p>
        <p>
          We will acknowledge a privacy complaint and aim to provide a substantive response within
          30 days. If you are not satisfied, you may contact the{" "}
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

      <LegalSection title="9. Children">
        <p>
          Launch Planner is a business service and is not intended for people under 18. We do not
          knowingly collect personal information from children.
        </p>
      </LegalSection>

      <LegalSection title="10. Changes to this policy">
        <p>
          We may update this policy when the service, our providers or legal requirements change. We
          will publish the updated version here and revise the “last updated” date. If a change
          materially affects how we handle existing personal information, we will take reasonable
          steps to give account holders notice.
        </p>
      </LegalSection>

      <LegalSection title="11. Contact us">
        <p>Address privacy requests and complaints to the Privacy Officer:</p>
        <LegalContact />
      </LegalSection>
    </LegalPage>
  );
}
