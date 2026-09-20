import * as React from 'react'
import { Button, Text } from '@react-email/components'
import { Shell, button, fallback, footNote, h1, p } from './_shell'

interface MagicLinkEmailProps {
  siteName: string
  siteUrl?: string
  confirmationUrl: string
}

export const MagicLinkEmail = ({
  siteName,
  siteUrl,
  confirmationUrl,
}: MagicLinkEmailProps) => (
  <Shell
    siteName={siteName}
    siteUrl={siteUrl}
    preview={`Your login link for ${siteName}`}
    status={{ label: 'Sign in link', tone: 'neutral' }}
  >
    <Text style={h1}>Your login link</Text>
    <Text style={p}>
      Click the button below to sign in to <strong>{siteName}</strong>. This
      link will expire shortly.
    </Text>
    <Button style={button} href={confirmationUrl}>
      Log in
    </Button>
    <Text style={fallback}>
      If the button doesn&apos;t work, copy and paste this link:
      <br />
      {confirmationUrl}
    </Text>
    <Text style={footNote}>
      If you didn&apos;t request this link, you can safely ignore this email.
    </Text>
  </Shell>
)

export default MagicLinkEmail
