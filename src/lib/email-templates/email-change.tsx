import * as React from 'react'
import { Button, Link, Text } from '@react-email/components'
import {
  Shell,
  button,
  detailRow,
  fallback,
  footNote,
  h1,
  infoCard,
  link,
  p,
} from './_shell'

interface EmailChangeEmailProps {
  siteName: string
  siteUrl?: string
  // oldEmail is the user's current address (HookData.OldEmail). For the
  // NEW-recipient half of a secure email_change fanout, `email` equals the
  // recipient (NEW), so the "from" line must render oldEmail to read
  // "from OLD to NEW" instead of "from NEW to NEW".
  oldEmail: string
  email: string
  newEmail: string
  confirmationUrl: string
}

export const EmailChangeEmail = ({
  siteName,
  siteUrl,
  oldEmail,
  newEmail,
  confirmationUrl,
}: EmailChangeEmailProps) => (
  <Shell
    siteName={siteName}
    siteUrl={siteUrl}
    preview={`Confirm your email change for ${siteName}`}
    status={{ label: 'Email change', tone: 'warning' }}
  >
    <Text style={h1}>Confirm your email change</Text>
    <Text style={p}>
      You requested to change the email address on your{' '}
      <strong>{siteName}</strong> account.
    </Text>
    <div style={infoCard}>
      <Text style={detailRow}>
        <strong>From:</strong>{' '}
        <Link href={`mailto:${oldEmail}`} style={link}>
          {oldEmail}
        </Link>
      </Text>
      <Text style={{ ...detailRow, margin: 0 }}>
        <strong>To:</strong>{' '}
        <Link href={`mailto:${newEmail}`} style={link}>
          {newEmail}
        </Link>
      </Text>
    </div>
    <Button style={button} href={confirmationUrl}>
      Confirm email change
    </Button>
    <Text style={fallback}>
      If the button doesn&apos;t work, copy and paste this link:
      <br />
      {confirmationUrl}
    </Text>
    <Text style={footNote}>
      If you didn&apos;t request this change, please secure your account
      immediately.
    </Text>
  </Shell>
)

export default EmailChangeEmail
