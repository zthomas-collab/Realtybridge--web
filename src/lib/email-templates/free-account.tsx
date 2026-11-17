import * as React from 'react'
import { Body, Button, Container, Head, Heading, Html, Preview, Text } from '@react-email/components'
import type { TemplateEntry } from './registry'
import { EmailBrandLogo } from './brand-logo'

interface Props {
  signInUrl?: string
  note?: string | null
  role?: 'realtor' | 'contractor'
}

const FreeAccountEmail = ({ signInUrl = 'https://realtybridge.app/login', note, role = 'realtor' }: Props) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>You have a free RealtyBridge account</Preview>
    <Body style={main}>
      <Container style={container}>
        <EmailBrandLogo />
        <Heading style={h1}>Your free RealtyBridge {role === 'contractor' ? 'contractor' : 'realtor'} account is ready</Heading>
        <Text style={text}>
          You've been given a free {role === 'contractor' ? 'contractor' : 'realtor'} account on RealtyBridge, the bridge between investors and agents. No payment needed.
        </Text>
        {note ? <Text style={text}>{note}</Text> : null}
        <Text style={text}>
          Sign in with Google or create an account using this email address and your free access turns on automatically.
        </Text>
        <Button style={button} href={signInUrl}>Sign in to RealtyBridge</Button>
        <Text style={footer}>If you weren't expecting this, you can ignore this email.</Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: FreeAccountEmail,
  subject: 'Your free RealtyBridge account',
  displayName: 'Free account granted',
  previewData: { signInUrl: 'https://realtybridge.app/login', note: 'Welcome aboard!' },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: 'Arial, sans-serif' }
const container = { padding: '20px 25px' }
const h1 = { fontSize: '22px', fontWeight: 'bold' as const, color: '#1e3a5f', margin: '0 0 20px' }
const text = { fontSize: '14px', color: '#475569', lineHeight: '1.5', margin: '0 0 20px' }
const button = { backgroundColor: '#1d8aa6', color: '#ffffff', fontSize: '14px', borderRadius: '8px', padding: '12px 20px', textDecoration: 'none' }
const footer = { fontSize: '12px', color: '#999999', margin: '30px 0 0' }
