import * as React from 'react'
import { Body, Button, Container, Head, Heading, Html, Preview, Text } from '@react-email/components'
import type { TemplateEntry } from './registry'
import { EmailBrandLogo } from './brand-logo'

interface Props {
  name?: string | null
  dealTitle?: string
  area?: string
  dealUrl?: string
  realtors?: { name: string; brokerage?: string | null }[]
  referralRequired?: boolean
}

const RealtorsMatchedEmail = ({ name, dealTitle = 'your deal', area = 'your area', dealUrl = 'https://realtybridge.app/deals', realtors = [], referralRequired = false }: Props) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>{realtors.length ? `${realtors.length} realtors ${referralRequired ? 'notified of your opportunity' : 'matched your deal'}` : 'Your deal is live'}</Preview>
    <Body style={main}>
      <Container style={container}>
        <EmailBrandLogo />
        <Heading style={h1}>{realtors.length ? referralRequired ? 'Realtors notified of your opportunity' : 'Realtors matched to your deal' : 'Your deal is live'}</Heading>
        <Text style={text}>{name ? `Hi ${name},` : 'Hi there,'} <b>{dealTitle}</b> is live in {area}.</Text>
        {realtors.length ? (
          <>
            <Text style={text}>These verified realtors serve that area and were sent your lead:</Text>
            <Text style={text}>
              {realtors.map((r, i) => (
                <React.Fragment key={i}>• {r.name}{r.brokerage ? ` — ${r.brokerage}` : ''}<br /></React.Fragment>
              ))}
            </Text>
            <Text style={text}>{referralRequired ? 'These are potential applicants, not active connections. Realtors apply and acknowledge the 25% brokerage referral. Review their profiles, ratings and reviews, then select your realtor from the opportunity page.' : 'When one sends interest, you can accept them from the deal page.'}</Text>
          </>
        ) : (
          <Text style={text}>No verified realtors serve that area yet. We'll let you know on RealtyBridge when one is interested.</Text>
        )}
        <Text style={text}>Next step: check your deal for Realtor applications. Choose the Realtor you want to work with, then call or email them using the contact details shared after selection. Both of you should reach out and agree on next steps.</Text>
        <Button style={button} href={dealUrl}>Choose your Realtor</Button>
        <Text style={footer}>You're getting this because you posted a deal on RealtyBridge.</Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: RealtorsMatchedEmail,
  subject: (d: Record<string, any>) =>
    d.realtors?.length ? `${d.realtors.length} realtor${d.realtors.length === 1 ? '' : 's'} ${d.referralRequired ? 'notified about' : 'matched'} ${d.dealTitle ?? 'your deal'}` : `Your deal is live`,
  displayName: 'Realtors matched for investor',
  previewData: { name: 'Mike', dealTitle: '3 bd ranch in Wytheville', area: 'Wythe County, VA', realtors: [{ name: 'Jane Smith', brokerage: 'Blue Ridge Realty' }, { name: 'Tom Lee', brokerage: null }] },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: 'Arial, sans-serif' }
const container = { padding: '20px 25px' }
const h1 = { fontSize: '22px', fontWeight: 'bold' as const, color: '#1e3a5f', margin: '0 0 20px' }
const text = { fontSize: '14px', color: '#475569', lineHeight: '1.5', margin: '0 0 20px' }
const button = { backgroundColor: '#1d8aa6', color: '#ffffff', fontSize: '14px', borderRadius: '8px', padding: '12px 20px', textDecoration: 'none' }
const footer = { fontSize: '12px', color: '#999999', margin: '30px 0 0' }
