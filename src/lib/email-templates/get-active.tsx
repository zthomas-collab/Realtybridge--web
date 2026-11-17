import * as React from 'react'
import { Body, Button, Container, Head, Heading, Html, Preview, Text } from '@react-email/components'
import type { TemplateEntry } from './registry'
import { EmailBrandLogo } from './brand-logo'

const URL = 'https://realtybridge.app'

const GetActiveEmail = () => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Real estate takes a village. The platform only works when you use it.</Preview>
    <Body style={main}>
      <Container style={container}>
        <EmailBrandLogo />
        <Heading style={h1}>Real estate takes a village.</Heading>
        <Text style={text}>RealtyBridge was built to connect the right people to get deals done.</Text>
        <Text style={text}>But here's the thing — the platform only works when you use it.</Text>
        <Text style={text}>Whether you're an investor looking for an agent who understands your deals or a Realtor looking to build relationships with serious investors, RealtyBridge gives you a place to make those connections.</Text>

        <Heading as="h2" style={h2}>INVESTORS — PUT YOUR DEALS TO WORK!</Heading>
        <Text style={text}>Need comps or a CMA on a property?</Text>
        <Text style={text}>Looking for an investor-friendly Realtor who understands novations, creative financing, or distressed properties?</Text>
        <Text style={text}>Have a deal in another market and need a local agent?</Text>
        <Text style={text}>Post what you need on RealtyBridge. You control who receives your information, so you're not blasting your deals all over social media.</Text>

        <Heading as="h2" style={h2}>REALTORS — DON'T JUST SIGN UP. GET INVOLVED!</Heading>
        <Text style={text}>Connect with investors actively looking for Realtor partners.</Text>
        <Text style={text}>Build relationships that can lead to repeat business.</Text>
        <Text style={text}>Show investors you understand their needs.</Text>
        <Text style={text}>Build your reputation through completed transactions and reviews.</Text>

        <Heading as="h2" style={h2}>Here's what I want everyone to do today:</Heading>
        <Text style={text}>
          1. Log into your RealtyBridge account.<br />
          2. Complete your profile.<br />
          3. Investors — post a request or deal.<br />
          4. Realtors — get active and look for opportunities.<br />
          5. Invite one investor or Realtor who should be part of this network.
        </Text>

        <Text style={text}>We built RealtyBridge because too many good deals fall apart when the right people aren't connected.</Text>
        <Text style={text}><b>Let's change that.</b></Text>
        <Text style={text}>Stop waiting for opportunities to show up in a Facebook group. Start building the relationships that can help you close more deals.</Text>
        <Text style={text}>Log in and get active today:</Text>
        <Button style={button} href={URL}>👉 realtybridge.app</Button>
        <Text style={{ ...text, marginTop: '24px' }}>Invite others. Post deals. Build relationships. Get to work.</Text>
        <Text style={text}>Real estate takes a village. Let's build a better one.</Text>
        <Text style={text}>The RealtyBridge Team</Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: GetActiveEmail,
  subject: 'Real estate takes a village — get active on RealtyBridge',
  displayName: '1-week follow-up (not started)',
  previewData: {},
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: 'Arial, sans-serif' }
const container = { padding: '20px 25px' }
const h1 = { fontSize: '22px', fontWeight: 'bold' as const, color: '#1e3a5f', margin: '0 0 20px' }
const h2 = { fontSize: '16px', fontWeight: 'bold' as const, color: '#1e3a5f', margin: '24px 0 12px' }
const text = { fontSize: '14px', color: '#475569', lineHeight: '1.5', margin: '0 0 12px' }
const button = { backgroundColor: '#1d8aa6', color: '#ffffff', fontSize: '14px', borderRadius: '8px', padding: '12px 20px', textDecoration: 'none' }
