import * as React from 'react';
import { Body, Button, Container, Head, Heading, Html, Preview, Text } from '@react-email/components';
import { EmailBrandLogo } from './brand-logo';
import type { TemplateEntry } from './registry';

interface Props { dealTitle?: string; address?: string; details?: string; investorName?: string; investorEmail?: string; investorPhone?: string; dealUrl?: string }
const Email = ({ dealTitle = 'Listing opportunity', address, details, investorName, investorEmail, investorPhone, dealUrl = 'https://realtybridge.app/deals' }: Props) => (
  <Html lang="en" dir="ltr"><Head /><Preview>You were selected for {dealTitle}</Preview><Body style={main}><Container style={container}>
    <EmailBrandLogo /><Heading style={heading}>You’ve been selected</Heading>
    <Text style={text}>The investor selected you for <b>{dealTitle}</b>.<br />Property: {address || 'See opportunity details'}</Text>
    {details && <Text style={text}>{details}</Text>}
    <Text style={text}>Investor: {investorName || 'Member'}<br />Email: {investorEmail}<br />Phone: {investorPhone || 'Not provided'}</Text>
    <Text style={text}>Next steps: contact the investor. A separate 25% brokerage referral agreement will be prepared and sent to your brokerage for signatures. The acknowledgment is not that agreement. The referral is based on commission terms in the executed agreement, not the property’s sale price, subject to applicable licensing and referral laws.</Text>
    <Button href={dealUrl} style={button}>View listing opportunity</Button>
  </Container></Body></Html>
);
export const template = { component: Email, subject: (d: Record<string, unknown>) => `Selected for ${d.dealTitle || 'a listing opportunity'}`, displayName: 'Listing opportunity selection', previewData: { dealTitle: 'Wytheville listing opportunity', address: '123 Example Street, Wytheville, VA', investorName: 'Example investor', investorEmail: 'investor@example.com' } } satisfies TemplateEntry;
const main = { backgroundColor: '#ffffff', fontFamily: 'Arial, sans-serif' };
const container = { padding: '20px 25px' };
const heading = { color: '#1e3a5f', fontSize: '22px' };
const text = { color: '#475569', fontSize: '14px', lineHeight: '1.6' };
const button = { backgroundColor: '#1d8aa6', color: '#ffffff', padding: '12px 20px', borderRadius: '8px' };