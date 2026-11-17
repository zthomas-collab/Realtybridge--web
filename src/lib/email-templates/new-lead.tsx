import * as React from 'react'
import { Body, Button, Container, Head, Heading, Html, Preview, Text } from '@react-email/components'
import type { TemplateEntry } from './registry'
import { EmailBrandLogo } from './brand-logo'

interface Props {
  name?: string | null
  dealTitle?: string
  area?: string
  price?: string
  agentNeed?: string
  dealUrl?: string
  referralRequired?: boolean
}

const NewLeadEmail = ({ name, dealTitle = 'A new deal', area = 'your area', price = 'TBD', agentNeed, dealUrl = 'https://realtybridge.app/browse', referralRequired = false }: Props) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>New investor lead in {area}</Preview>
    <Body style={main}>
      <Container style={container}>
        <EmailBrandLogo />
        <Heading style={h1}>New lead in your area</Heading>
        <Text style={text}>{name ? `Hi ${name},` : 'Hi there,'} an investor just posted a deal that matches the area you serve.</Text>
        <Text style={text}>
          <b>{dealTitle}</b><br />
          Location: {area}<br />
          Price: {price}<br />
          {agentNeed === 'buyers_agent' ? 'Looking for: an agent who can bring a buyer' : 'Looking for: a listing agent'}
        </Text>
        {referralRequired && <Text style={text}>Apply for this listing opportunity on RealtyBridge. Applying does not connect you with the investor until they select you. Before submitting, acknowledge the 25% brokerage referral under a separate agreement, based on commission terms, not sale price.</Text>}
        <Text style={text}>Choose a deal you want to work on and submit your application or interest. The investor selects their Realtor; once selected, call or email the investor to introduce yourself and discuss next steps.</Text>
        <Button style={button} href={dealUrl}>{referralRequired ? 'View listing opportunity' : 'View the lead'}</Button>
        <Text style={footer}>You're getting this because this deal is in an area you serve on RealtyBridge.</Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: NewLeadEmail,
  subject: (d: Record<string, any>) => `New lead in ${d.area ?? 'your area'}`,
  displayName: 'New lead for realtor',
  previewData: { name: 'Jane', dealTitle: '3 bd ranch in Wytheville', area: 'Wythe County, VA', price: '$185,000', agentNeed: 'listing_agent' },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: 'Arial, sans-serif' }
const container = { padding: '20px 25px' }
const h1 = { fontSize: '22px', fontWeight: 'bold' as const, color: '#1e3a5f', margin: '0 0 20px' }
const text = { fontSize: '14px', color: '#475569', lineHeight: '1.5', margin: '0 0 20px' }
const button = { backgroundColor: '#1d8aa6', color: '#ffffff', fontSize: '14px', borderRadius: '8px', padding: '12px 20px', textDecoration: 'none' }
const footer = { fontSize: '12px', color: '#999999', margin: '30px 0 0' }
