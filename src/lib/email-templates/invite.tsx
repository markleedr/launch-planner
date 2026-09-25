import * as React from "react";
import { Button, Text } from "@react-email/components";
import { Shell, button, fallback, footNote, h1, p } from "./_shell";

interface InviteEmailProps {
  siteName: string;
  siteUrl: string;
  recipient?: string;
  confirmationUrl: string;
}

export const InviteEmail = ({
  siteName,
  siteUrl,
  recipient,
  confirmationUrl,
}: InviteEmailProps) => (
  <Shell
    siteName={siteName}
    siteUrl={siteUrl}
    preview={`You've been invited to a contractor portal on ${siteName}`}
    status={{ label: "Contractor invitation", tone: "positive" }}
  >
    <Text style={h1}>You&apos;ve been invited to quote on a project</Text>
    <Text style={p}>
      A property developer has invited {recipient ? <strong>{recipient}</strong> : "you"} to their
      private contractor portal on <strong>{siteName}</strong>. Set up your account to see the
      project brief and submit your proposal.
    </Text>
    <Button style={button} href={confirmationUrl}>
      Set up your account
    </Button>
    <Text style={fallback}>
      If the button doesn&apos;t work, copy and paste this link:
      <br />
      {confirmationUrl}
    </Text>
    <Text style={footNote}>
      If you weren&apos;t expecting this invitation, you can safely ignore this email.
    </Text>
  </Shell>
);

export default InviteEmail;
