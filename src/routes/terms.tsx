import { createFileRoute, Link } from "@tanstack/react-router";
import { LegalContact } from "@/components/legal/LegalContact";
import { LegalList } from "@/components/legal/LegalList";
import { LegalPage } from "@/components/legal/LegalPage";
import { LegalSection } from "@/components/legal/LegalSection";

export const Route = createFileRoute("/terms")({
  head: () => ({
    meta: [
      { title: "Terms and Conditions - Launch Planner" },
      {
        name: "description",
        content: "The terms that apply when you create an account or use Launch Planner.",
      },
    ],
  }),
  component: TermsAndConditions,
});

function TermsAndConditions() {
  return (
    <LegalPage
      title="Terms and Conditions"
      summary="These terms govern your access to and use of Launch Planner. Please read them before creating an account or starting a paid subscription."
    >
      <LegalSection title="1. Agreement and provider">
        <p>
          Launch Planner is provided by Launch Planner Pty Ltd (ABN 57 674 795 745) (“Project
          Profile”, “we”, “us” or “our”). By creating an account, purchasing a subscription or using
          Launch Planner, you agree to these Terms and our{" "}
          <Link to="/privacy" className="font-medium text-foreground underline underline-offset-4">
            Privacy Policy
          </Link>
          . If you use Launch Planner for an organisation, you confirm that you have authority to
          accept these Terms on its behalf.
        </p>
        <LegalContact />
      </LegalSection>

      <LegalSection title="2. The service">
        <p>
          Launch Planner helps property professionals prepare project details, deliverables, budgets,
          schedules, supplier information, contractor requests, proposals, collateral workflows,
          summaries and exports. We may improve or update the service over time, provided changes do
          not remove rights that cannot lawfully be excluded.
        </p>
        <p>
          A subscription is licensed to one individual login. You must not share login credentials,
          resell access, or allow another person to use your account. Contractors invited into a
          project use their own access and only see the project content made available to them.
        </p>
      </LegalSection>

      <LegalSection title="3. Accounts and security">
        <LegalList>
          <li>You must be at least 18 and provide accurate, current account information.</li>
          <li>You are responsible for activity carried out through your login.</li>
          <li>
            You must protect your password and unique contractor or sharing links and notify us
            promptly if you suspect unauthorised access.
          </li>
          <li>
            We may require verification, restrict access or reset credentials where reasonably
            necessary to protect users or the service.
          </li>
        </LegalList>
      </LegalSection>

      <LegalSection title="4. Subscription, billing and cancellation">
        <p>
          Launch Planner costs A$49 per month unless a different price is clearly displayed
          before checkout. Prices are inclusive of GST where applicable. Stripe processes payment
          details on our behalf.
        </p>
        <LegalList>
          <li>
            Your subscription begins when Stripe confirms payment and renews automatically each
            month until cancelled.
          </li>
          <li>
            You authorise recurring charges to your selected payment method. If payment fails, we
            may retry it and restrict paid features while the account is unpaid.
          </li>
          <li>
            You may cancel at any time through the billing controls made available in Launch Planner
            or by contacting us. Cancellation takes effect at the end of the paid billing period,
            and access normally continues until then.
          </li>
          <li>
            Fees already paid are not refundable merely because you change your mind, except where
            required by the Australian Consumer Law or another applicable law.
          </li>
          <li>
            We will give reasonable advance notice of a price increase. The new price will apply
            from a future renewal, and you may cancel before it takes effect.
          </li>
        </LegalList>
      </LegalSection>

      <LegalSection title="5. Your projects and content">
        <p>
          You retain ownership of project information, images, files, messages and other content you
          or your contractors submit (“User Content”). You give us a limited, non-exclusive licence
          to host, copy, process, display and transmit User Content only as needed to provide,
          secure and support Launch Planner.
        </p>
        <p>You are responsible for ensuring that:</p>
        <LegalList>
          <li>User Content is accurate enough for its intended use;</li>
          <li>
            you have the rights, permissions and privacy notices needed to upload and share it;
          </li>
          <li>
            contractor and supplier contact details are used for legitimate project purposes; and
          </li>
          <li>
            your sharing settings and recipients are appropriate. You should revoke links that are
            no longer required.
          </li>
        </LegalList>
      </LegalSection>

      <LegalSection title="6. Contractors and third parties">
        <p>
          Launch Planner facilitates invitations, proposals, comparisons, awards and delivery
          communications. Unless Launch Planner is separately engaged under a written services
          agreement, contractors and suppliers are independent third parties. You are responsible
          for selecting them and agreeing their final scope, price, timing, intellectual property,
          insurance and other commercial terms.
        </p>
        <p>
          Template deliverables, contractor proposals and supplier details are planning inputs, not
          endorsements or guarantees by Launch Planner.
        </p>
      </LegalSection>

      <LegalSection title="7. Estimates and professional decisions">
        <p>
          Calculations, benchmarks, schedules, critical paths, suggested copy, images and exports
          are planning aids. Actual costs, media performance, production requirements, timelines and
          regulatory obligations can differ. You must review outputs and obtain suitable
          professional advice before making financial, contractual, development, media or legal
          decisions.
        </p>
      </LegalSection>

      <LegalSection title="8. Acceptable use">
        <p>You must not use Launch Planner to:</p>
        <LegalList>
          <li>break a law, infringe rights, mislead, defraud, harass or distribute malware;</li>
          <li>upload unlawful, confidential or personal information without authority;</li>
          <li>
            probe, bypass or interfere with security, access controls, rate limits or another
            account;
          </li>
          <li>scrape, reverse engineer or copy the service except where law expressly permits;</li>
          <li>send spam or use contractor invitations for unrelated marketing; or</li>
          <li>use the service in a way that unreasonably burdens or damages it.</li>
        </LegalList>
      </LegalSection>

      <LegalSection title="9. Our intellectual property">
        <p>
          We and our licensors own Launch Planner, including its software, design, branding,
          templates, catalogue structure and documentation. These Terms grant you a limited,
          revocable, non-transferable right to use the service during your subscription. They do not
          transfer our intellectual property to you.
        </p>
      </LegalSection>

      <LegalSection title="10. Availability and third-party services">
        <p>
          We aim to provide a reliable service but cannot promise uninterrupted or error-free
          operation. Maintenance, security events, internet failures and providers such as Supabase,
          Stripe, Resend, Lovable and mapping services can affect availability. We will take
          reasonable steps to restore material interruptions within our control.
        </p>
      </LegalSection>

      <LegalSection title="11. Consumer guarantees and liability">
        <p>
          Nothing in these Terms excludes, restricts or modifies any consumer guarantee, right or
          remedy that cannot legally be excluded, including under the Australian Consumer Law.
        </p>
        <p>
          To the maximum extent permitted by law, we are not liable for indirect or consequential
          loss, lost opportunity, lost profits, or loss caused by inaccurate User Content,
          contractor conduct, third-party services or decisions made from planning estimates. Where
          the law allows us to limit a remedy for a failure to meet a statutory guarantee, our
          liability is limited, at our option, to supplying the service again or paying the
          reasonable cost of having it supplied again.
        </p>
      </LegalSection>

      <LegalSection title="12. Suspension and ending access">
        <p>
          You may stop using Launch Planner and cancel your subscription at any time. We may suspend
          or end access if you materially breach these Terms, create a security risk, fail to pay,
          or use the service unlawfully. Where practical, we will give notice and a reasonable
          opportunity to fix the issue. We may act immediately where needed to protect users,
          information or the service.
        </p>
        <p>
          Account cancellation does not automatically delete all information. See our{" "}
          <Link
            to="/data-deletion"
            className="font-medium text-foreground underline underline-offset-4"
          >
            Data Deletion Policy
          </Link>
          .
        </p>
      </LegalSection>

      <LegalSection title="13. Changes to these Terms">
        <p>
          We may update these Terms to reflect service, legal or security changes. We will publish
          the new version and give reasonable notice of material changes. If you do not agree, you
          may cancel before the change takes effect. Continued use after the effective date means
          you accept the updated Terms.
        </p>
      </LegalSection>

      <LegalSection title="14. Governing law and contact">
        <p>
          These Terms are governed by the laws of Queensland, Australia. The parties submit to the
          courts of Queensland and courts entitled to hear appeals from them. Before starting formal
          proceedings, please contact us so we can try to resolve the issue promptly.
        </p>
        <LegalContact />
      </LegalSection>
    </LegalPage>
  );
}
