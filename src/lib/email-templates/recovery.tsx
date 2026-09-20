import * as React from 'react'
import { Button, Text } from '@react-email/components'
import { Shell, button, fallback, footNote, h1, p } from './_shell'

interface RecoveryEmailProps {
  siteName: string
  siteUrl?: string
  confirmationUrl: string
}

export const RecoveryEmail = ({
  siteName,
  siteUrl,
  confirmationUrl,
}: RecoveryEmailProps) => (
  <Shell
    siteName={siteName}
    siteUrl={siteUrl}
    preview={`Reset your password for ${siteName}`}
    status={{ label: 'Password reset', tone: 'warning' }}
  >
    <Text style={h1}>Reset your password</Text>
    <Text style={p}>
      We received a request to reset your password for <strong>{siteName}</strong>.
      Click the button below to choose a new one.
    </Text>
    <Button style={button} href={confirmationUrl}>
      Reset password
    </Button>
    <Text style={fallback}>
      If the button doesn&apos;t work, copy and paste this link:
      <br />
      {confirmationUrl}
    </Text>
    <Text style={footNote}>
      If you didn&apos;t request a password reset, you can safely ignore this
      email - your password won&apos;t be changed.
    </Text>
  </Shell>
)

export default RecoveryEmail
