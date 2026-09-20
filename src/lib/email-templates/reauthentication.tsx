import * as React from 'react'
import { Text } from '@react-email/components'
import { Shell, codeBlock, footNote, h1, p } from './_shell'

interface ReauthenticationEmailProps {
  siteName?: string
  siteUrl?: string
  token: string
}

export const ReauthenticationEmail = ({
  siteName = 'Launch Planner',
  siteUrl,
  token,
}: ReauthenticationEmailProps) => (
  <Shell
    siteName={siteName}
    siteUrl={siteUrl}
    preview="Your verification code"
    status={{ label: 'Verification code', tone: 'neutral' }}
  >
    <Text style={h1}>Confirm it&apos;s you</Text>
    <Text style={p}>Use the code below to confirm your identity:</Text>
    <div style={codeBlock}>{token}</div>
    <Text style={footNote}>
      This code will expire shortly. If you didn&apos;t request it, you can
      safely ignore this email.
    </Text>
  </Shell>
)

export default ReauthenticationEmail
