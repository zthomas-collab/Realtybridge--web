import * as React from 'react'
import { Body, Button, Container, Head, Heading, Html, Preview, Text } from '@react-email/components'
import type { TemplateEntry } from './registry'
import { EmailBrandLogo } from './brand-logo'

const URL = 'https://realtybridge.app'

const FinishCheckoutEmail = () => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>You're almost there — finish your RealtyBridge subscription.</Preview>
    <Body style={main}>
      <Container style={container}>
        <EmailBrandLogo />
        <Heading style={h1}>You're almost there.</Heading>
        <Text style={text}>You took the first step and signed up for RealtyBridge, but you haven't finished setting up your subscription.</Text>
        <Text style={text}>That means your account isn't fully activated, and you're missing out on opportunities to connect with investors, Realtors, and potential deals.</Text>
        <Heading as="h2" style={h2}>Here's what you need to know:</Heading>
        <Text style={text}>Until you complete checkout and activate your subscription:</Text>
        <Text style={text}>
          • You won't receive deal opportunities through RealtyBridge.<br />
          • You won't have full access to the platform's features.<br />
          • Investors and Realtors won't be able to connect with you through the platform as an active subscriber.<br />
          • You could be missing opportunities to build valuable business relationships.
        </Text>
        <Text style={text}><b>The good news? You're almost there.</b></Text>
        <Text style={text}>All you need to do is finish your checkout and complete your subscription.</Text>
        <Heading as="h2" style={h2}>COMPLETE YOUR SUBSCRIPTION TODAY</Heading>
        <Button style={button} href={URL}>👉 realtybridge.app</Button>
        <Text style={{ ...text, marginTop: '24px' }}>RealtyBridge was built to help investors and Realtors find the right people, build relationships, and get more deals to the closing table.</Text>
        <Text style={text}>But we can't connect you with opportunities if your account isn't active.</Text>
        <Text style={text}>Don't let an unfinished checkout be the reason you miss your next deal.</Text>
        <Text style={text}>Log back in, finish your subscription, and start putting RealtyBridge to work.</Text>
        <Text style={text}>Real estate takes a village. Make sure you're part of it.</Text>
        <Text style={text}>The RealtyBridge Team</Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: FinishCheckoutEmail,
  subject: "Finish your RealtyBridge subscription — you're almost there",
  displayName: 'Finish checkout reminder',
  previewData: {},
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: 'Arial, sans-serif' }
const container = { padding: '20px 25px' }
const h1 = { fontSize: '22px', fontWeight: 'bold' as const, color: '#1e3a5f', margin: '0 0 20px' }
const h2 = { fontSize: '16px', fontWeight: 'bold' as const, color: '#1e3a5f', margin: '24px 0 12px' }
const text = { fontSize: '14px', color: '#475569', lineHeight: '1.5', margin: '0 0 12px' }
const button = { backgroundColor: '#1d8aa6', color: '#ffffff', fontSize: '14px', borderRadius: '8px', padding: '12px 20px', textDecoration: 'none' }
