import * as React from 'react'

import {
  Body,
  Container,
  Head,
  Hr,
  Html,
  Link,
  Preview,
  Section,
  Text,
} from '@react-email/components'

interface ShellProps {
  siteName: string
  siteUrl?: string
  preview: string
  status?: { label: string; tone?: 'positive' | 'neutral' | 'warning' }
  children: React.ReactNode
}

export const Shell = ({
  siteName,
  siteUrl,
  preview,
  status,
  children,
}: ShellProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>{preview}</Preview>
    <Body style={body}>
      <Container style={outer}>
        <Section style={card}>
          {/* Header */}
          <Section style={header}>
            <table
              width="100%"
              cellPadding={0}
              cellSpacing={0}
              role="presentation"
              style={{ borderCollapse: 'collapse' }}
            >
              <tr>
                <td style={headerLeft}>
                  <table
                    cellPadding={0}
                    cellSpacing={0}
                    role="presentation"
                    style={{ borderCollapse: 'collapse' }}
                  >
                    <tr>
                      <td style={{ verticalAlign: 'middle', paddingRight: 12 }}>
                        <div style={logo}>LP</div>
                      </td>
                      <td style={{ verticalAlign: 'middle' }}>
                        <Text style={brandName}>{siteName}</Text>
                        <Text style={brandTag}>Property marketing, planned.</Text>
                      </td>
                    </tr>
                  </table>
                </td>
                {siteUrl ? (
                  <td style={headerRight}>
                    <Link href={siteUrl} style={openApp}>
                      Open app →
                    </Link>
                  </td>
                ) : null}
              </tr>
            </table>
          </Section>

          <Hr style={divider} />

          <Section style={content}>
            {status ? (
              <div style={pill(status.tone ?? 'positive')}>
                <span style={{ marginRight: 6 }}>✓</span>
                {status.label}
              </div>
            ) : null}
            {children}
          </Section>
        </Section>

        <Section style={footerBar}>
          <Text style={footerText}>
            Sent by {siteName}.{' '}
            <Link href={`${siteUrl ?? '#'}`} style={footerLink}>
              Support
            </Link>
          </Text>
          <Text style={footerFine}>
            © {new Date().getFullYear()} {siteName}. All rights reserved.
          </Text>
        </Section>
      </Container>
    </Body>
  </Html>
)

/* Tokens */
const BRAND = '#F5C518'
const INK = '#0F172A'
const MUTED = '#55606E'
const LINE = '#E6E8EC'
const SURFACE = '#FFFFFF'
const PAGE = '#F4F5F7'

const body = {
  backgroundColor: SURFACE,
  fontFamily:
    '-apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif',
  margin: 0,
  padding: '32px 0',
}
const outer = { maxWidth: '560px', margin: '0 auto', padding: '0 16px' }
const card = {
  backgroundColor: SURFACE,
  border: `1px solid ${LINE}`,
  borderRadius: '16px',
  overflow: 'hidden' as const,
}
const header = { padding: '20px 24px' }
const headerLeft = { verticalAlign: 'middle' as const }
const headerRight = { verticalAlign: 'middle' as const, textAlign: 'right' as const }
const logo = {
  width: 40,
  height: 40,
  borderRadius: 999,
  backgroundColor: BRAND,
  color: INK,
  fontWeight: 700,
  fontSize: 14,
  letterSpacing: 0.5,
  lineHeight: '40px',
  textAlign: 'center' as const,
}
const brandName = {
  color: INK,
  fontSize: 16,
  fontWeight: 700,
  margin: 0,
  lineHeight: '20px',
}
const brandTag = {
  color: MUTED,
  fontSize: 12,
  margin: '2px 0 0',
  lineHeight: '16px',
}
const openApp = { color: INK, fontSize: 13, fontWeight: 600, textDecoration: 'none' }
const divider = { borderColor: LINE, margin: 0 }
const content = { padding: '28px 24px 8px' }
const footerBar = { padding: '20px 24px', textAlign: 'center' as const }
const footerText = { color: MUTED, fontSize: 12, margin: 0 }
const footerLink = { color: INK, textDecoration: 'underline' }
const footerFine = { color: '#8A8F98', fontSize: 11, margin: '6px 0 0' }

function pill(tone: 'positive' | 'neutral' | 'warning'): React.CSSProperties {
  const palette =
    tone === 'warning'
      ? { bg: '#FEF3C7', fg: '#92400E' }
      : tone === 'neutral'
      ? { bg: '#EEF2F7', fg: INK }
      : { bg: '#DCFCE7', fg: '#166534' }
  return {
    display: 'inline-block',
    backgroundColor: palette.bg,
    color: palette.fg,
    borderRadius: 999,
    padding: '4px 12px',
    fontSize: 12,
    fontWeight: 600,
    marginBottom: 16,
  }
}

/* Shared inline styles reusable inside `children` */
export const h1: React.CSSProperties = {
  fontSize: 24,
  fontWeight: 700,
  color: INK,
  margin: '4px 0 16px',
  lineHeight: '30px',
}
export const p: React.CSSProperties = {
  fontSize: 14,
  color: MUTED,
  lineHeight: '22px',
  margin: '0 0 16px',
}
export const link: React.CSSProperties = { color: INK, textDecoration: 'underline' }
export const button: React.CSSProperties = {
  display: 'inline-block',
  backgroundColor: BRAND,
  color: INK,
  fontSize: 14,
  fontWeight: 700,
  borderRadius: 999,
  padding: '12px 22px',
  textDecoration: 'none',
  margin: '4px 0 20px',
}
export const codeBlock: React.CSSProperties = {
  fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
  fontSize: 22,
  fontWeight: 700,
  color: INK,
  letterSpacing: 4,
  backgroundColor: '#F4F5F7',
  border: `1px solid ${LINE}`,
  borderRadius: 12,
  padding: '14px 18px',
  textAlign: 'center' as const,
  margin: '0 0 20px',
}
export const fallback: React.CSSProperties = {
  fontSize: 12,
  color: '#8A8F98',
  margin: '4px 0 20px',
  wordBreak: 'break-all' as const,
}
export const detailRow: React.CSSProperties = {
  fontSize: 13,
  color: MUTED,
  lineHeight: '20px',
  margin: '0 0 6px',
}
export const infoCard: React.CSSProperties = {
  backgroundColor: PAGE,
  border: `1px solid ${LINE}`,
  borderRadius: 12,
  padding: '16px 18px',
  margin: '0 0 20px',
}
export const footNote: React.CSSProperties = {
  fontSize: 12,
  color: '#8A8F98',
  lineHeight: '18px',
  margin: '8px 0 0',
}
