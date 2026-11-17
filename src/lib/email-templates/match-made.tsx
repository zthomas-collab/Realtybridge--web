import * as React from 'react'
import { Body, Button, Container, Head, Heading, Html, Preview, Text } from '@react-email/components'
import type { TemplateEntry } from './registry'
import { EmailBrandLogo } from './brand-logo'

interface Props {
  dealTitle?: string
  otherName?: string
  otherRole?: string
  otherEmail?: string
  otherPhone?: string | null
  dealUrl?: string
  referralRequired?: boolean
}

const MatchMadeEmail = ({ dealTitle = 'your deal', otherName = 'your match', otherRole = 'member', otherEmail, otherPhone, dealUrl = 'https://realtybridge.app/deals', referralRequired = false }: Props) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>You're matched on {dealTitle}</Preview>
    <Body style={main}>
      <Container style={container}>
        <EmailBrandLogo />
        <Heading style={h1}>You have a new match</Heading>
        <Text style={text}>You're now matched with {otherName} ({otherRole}) on <b>{dealTitle}</b>.</Text>
        <Text style={text}>
          {otherEmail ? <>Email: {otherEmail}<br /></> : null}
          Phone: {otherPhone || 'No phone number on file yet'}
        </Text>
        <Heading style={h1}>Next steps</Heading>
        <Text style={text}>Call or email {otherName} using the contact details above to discuss the property and agree on the next steps.</Text>
        {referralRequired && <Text style={text}>Your connection is pending while the paperwork is prepared. Check your inbox and spam folder for the referral agreement and arrange the listing agreement with your Realtor. For help, contact realtybridgeadmin@gmail.com.</Text>}
        <Text style={text}>Track this property on RealtyBridge. When the file ends, report sold or cancelled and leave a review of your connection. Your review does not have to wait for the other party’s confirmation.</Text>
        <Button style={button} href={dealUrl}>View next steps & transaction</Button>
        <Text style={footer}>You're getting this because a match was made on your RealtyBridge account.</Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: MatchMadeEmail,
  subject: (d: Record<string, any>) => `New match on ${d.dealTitle ?? 'your deal'}`,
  displayName: 'Match made',
  previewData: { dealTitle: '3 bd ranch in Wytheville', otherName: 'Jane Smith', otherRole: 'realtor', otherEmail: 'jane@example.com', otherPhone: '(555) 123-4567' },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: 'Arial, sans-serif' }
const container = { padding: '20px 25px' }
const h1 = { fontSize: '22px', fontWeight: 'bold' as const, color: '#1e3a5f', margin: '0 0 20px' }
const text = { fontSize: '14px', color: '#475569', lineHeight: '1.5', margin: '0 0 20px' }
const button = { backgroundColor: '#1d8aa6', color: '#ffffff', fontSize: '14px', borderRadius: '8px', padding: '12px 20px', textDecoration: 'none' }
const footer = { fontSize: '12px', color: '#999999', margin: '30px 0 0' }
