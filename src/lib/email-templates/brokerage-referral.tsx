import * as React from 'react';
import { Body, Button, Container, Head, Heading, Html, Preview, Text } from '@react-email/components';
import { EmailBrandLogo } from './brand-logo';
import type { TemplateEntry } from './registry';

interface Props { dealTitle?: string; address?: string; realtorName?: string; brokerage?: string; realtorEmail?: string; realtorPhone?: string; licenseNumber?: string; licenseState?: string; investorName?: string; investorEmail?: string; investorPhone?: string; dealUrl?: string }
const Email = ({ dealTitle = 'Listing opportunity', address, realtorName, brokerage, realtorEmail, realtorPhone, licenseNumber, licenseState, investorName, investorEmail, investorPhone, dealUrl = 'https://realtybridge.app/admin' }: Props) => (
  <Html lang="en" dir="ltr"><Head /><Preview>Prepare a 25% brokerage referral agreement for {dealTitle}</Preview><Body style={main}><Container style={container}>
    <EmailBrandLogo /><Heading style={heading}>Brokerage referral agreement needed</Heading>
    <Text style={text}>An investor has selected a realtor for <b>{dealTitle}</b>.<br />Property: {address || 'See opportunity details'}</Text>
    <Text style={text}>Selected realtor: {realtorName}<br />Brokerage: {brokerage || 'Not provided — confirm with realtor'}<br />License: {licenseNumber || 'Not provided'} {licenseState}<br />Email: {realtorEmail}<br />Phone: {realtorPhone || 'Not provided'}</Text>
    <Text style={text}>Investor: {investorName}<br />Email: {investorEmail}<br />Phone: {investorPhone || 'Not provided'}</Text>
    <Text style={text}>Please prepare and send the separate 25% brokerage referral agreement to the selected realtor’s brokerage for signatures. Track Pending, Sent and Signed in RealtyBridge. The referral fee is based on the commission terms in the executed agreement, not the property’s sale price, subject to applicable licensing and referral laws.</Text>
    <Button href={dealUrl} style={button}>View the opportunity</Button>
  </Container></Body></Html>
);
export const template = { component: Email, to: 'Brock.zevan@gmail.com', subject: (d: Record<string, unknown>) => `Referral agreement needed — ${d.dealTitle || 'listing opportunity'}`, displayName: 'Brock brokerage referral notification', previewData: { dealTitle: 'Wytheville listing opportunity', realtorName: 'Example realtor', brokerage: 'Example brokerage', investorName: 'Example investor' } } satisfies TemplateEntry;
const main = { backgroundColor: '#ffffff', fontFamily: 'Arial, sans-serif' };
const container = { padding: '20px 25px' };
const heading = { color: '#1e3a5f', fontSize: '22px' };
const text = { color: '#475569', fontSize: '14px', lineHeight: '1.6' };
const button = { backgroundColor: '#1d8aa6', color: '#ffffff', padding: '12px 20px', borderRadius: '8px' };