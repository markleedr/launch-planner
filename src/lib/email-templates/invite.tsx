import * as React from 'react'
import { Button, Text } from '@react-email/components'
import { Shell, button, fallback, footNote, h1, p } from './_shell'

interface InviteEmailProps {
  siteName: string
  siteUrl: string
  confirmationUrl: string
}

export const InviteEmail = ({
  siteName,
  siteUrl,
  confirmationUrl,
}: InviteEmailProps) => (
  <Shell
    siteName={siteName}
    siteUrl={siteUrl}
    preview={`You've been invited to join ${siteName}`}
    status={{ label: 'Invitation', tone: 'positive' }}
  >
    <Text style={h1}>You&apos;ve been invited 🎉</Text>
    <Text style={p}>
      You&apos;ve been invited to join <strong>{siteName}</strong>. Click the
      button below to accept the invitation and create your account.
    </Text>
    <Button style={button} href={confirmationUrl}>
      Accept invitation
    </Button>
    <Text style={fallback}>
      If the button doesn&apos;t work, copy and paste this link:
      <br />
      {confirmationUrl}
    </Text>
    <Text style={footNote}>
      If you weren&apos;t expecting this invitation, you can safely ignore this
      email.
    </Text>
  </Shell>
)

export default InviteEmail
