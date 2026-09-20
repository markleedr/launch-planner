import * as React from 'react'
import { Button, Link, Text } from '@react-email/components'
import { Shell, button, fallback, footNote, h1, link, p } from './_shell'

interface SignupEmailProps {
  siteName: string
  siteUrl: string
  recipient: string
  confirmationUrl: string
}

export const SignupEmail = ({
  siteName,
  siteUrl,
  recipient,
  confirmationUrl,
}: SignupEmailProps) => (
  <Shell
    siteName={siteName}
    siteUrl={siteUrl}
    preview={`Confirm your email for ${siteName}`}
    status={{ label: 'Verify email', tone: 'neutral' }}
  >
    <Text style={h1}>Confirm your email 🎉</Text>
    <Text style={p}>
      Thanks for signing up for <strong>{siteName}</strong>. Please confirm the
      address{' '}
      <Link href={`mailto:${recipient}`} style={link}>
        {recipient}
      </Link>{' '}
      to activate your account.
    </Text>
    <Button style={button} href={confirmationUrl}>
      Verify email
    </Button>
    <Text style={fallback}>
      If the button doesn&apos;t work, copy and paste this link:
      <br />
      {confirmationUrl}
    </Text>
    <Text style={footNote}>
      If you didn&apos;t create an account, you can safely ignore this email.
    </Text>
  </Shell>
)

export default SignupEmail
