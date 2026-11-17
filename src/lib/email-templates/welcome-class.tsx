import * as React from 'react'
import { Body, Button, Container, Head, Heading, Html, Link, Preview, Text } from '@react-email/components'
import type { TemplateEntry } from './registry'
import { EmailBrandLogo } from './brand-logo'

interface Props {
  name?: string
  email?: string
}

const MEET = 'https://meet.google.com/xco-cqsy-tst'

const WelcomeClassEmail = ({ name, email }: Props) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Welcome to RealtyBridge — join the Novations Class Nov 2 at 6pm</Preview>
    <Body style={main}>
      <Container style={container}>
        <EmailBrandLogo />
        <Heading style={h1}>Welcome to RealtyBridge{name ? `, ${name}` : ''}!</Heading>
        <Text style={text}>Thanks for joining the bridge between investors and agents.</Text>
        <Text style={text}>
          <b>Please save this email.</b> You'll sign in at{' '}
          <Link href="https://realtybridge.app/login" style={link}>realtybridge.app/login</Link>
          {email ? <> using <b>{email}</b></> : null}.
        </Text>
        <Heading as="h2" style={h2}>RealtyBridge Novations Class</Heading>
        <Text style={text}>
          <b>Monday, November 2, 2026 at 6:00 PM (Eastern) — online</b>
          <br />
          Come together, learn, and get all the Novation paperwork you need for your next deal.
        </Text>
        <Button style={button} href={MEET}>Join the class</Button>
        <Text style={text}>
          Save this meeting link: <Link href={MEET} style={link}>meet.google.com/xco-cqsy-tst</Link>
        </Text>
        <Text style={footer}>You're getting this because you just created a RealtyBridge account.</Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: WelcomeClassEmail,
  subject: 'Welcome to RealtyBridge — Novations Class Nov 2 at 6pm',
  displayName: 'Welcome + Novations Class',
  previewData: { name: 'Jane', email: 'jane@example.com' },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: 'Arial, sans-serif' }
const container = { padding: '20px 25px' }
const h1 = { fontSize: '22px', fontWeight: 'bold' as const, color: '#1e3a5f', margin: '0 0 20px' }
const h2 = { fontSize: '18px', fontWeight: 'bold' as const, color: '#1e3a5f', margin: '10px 0 12px' }
const text = { fontSize: '14px', color: '#475569', lineHeight: '1.5', margin: '0 0 20px' }
const link = { color: '#1d8aa6', textDecoration: 'underline' }
const button = { backgroundColor: '#1d8aa6', color: '#ffffff', fontSize: '14px', borderRadius: '8px', padding: '12px 20px', textDecoration: 'none' }
const footer = { fontSize: '12px', color: '#999999', margin: '30px 0 0' }
