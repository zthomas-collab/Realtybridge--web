import * as React from 'react';
import { Body, Button, Container, Head, Heading, Html, Preview, Text } from '@react-email/components';
import { EmailBrandLogo } from './brand-logo';
import type { TemplateEntry } from './registry';

interface Props { dealTitle?: string; otherName?: string; dealUrl?: string; needsOutcome?: boolean }
const main = { backgroundColor: '#ffffff', fontFamily: 'Arial, sans-serif' };
const container = { padding: '24px' };
const text = { color: '#475569', fontSize: '15px', lineHeight: '1.6' };
const button = { backgroundColor: '#1d8aa6', color: '#ffffff', padding: '12px 20px', borderRadius: '8px', textDecoration: 'none' };

function ApplicationEmail({ dealTitle = 'your deal', otherName = 'A Realtor', dealUrl = 'https://realtybridge.app/deals' }: Props) {
  return <Html lang="en"><Head /><Preview>A Realtor is ready for you to review their application.</Preview><Body style={main}><Container style={container}>
    <EmailBrandLogo /><Heading>Choose your Realtor</Heading>
    <Text style={text}>{otherName} expressed interest in {dealTitle}. Review their profile, experience and reviews, then select the Realtor you want to work with.</Text>
    <Text style={text}>An application is not a connection. Once you select a Realtor, you both receive contact details. Call or email each other to agree on your next steps.</Text>
    <Button href={dealUrl} style={button}>Review Realtor application</Button>
    <Text style={text}>This update is about your posted deal on RealtyBridge.</Text>
  </Container></Body></Html>;
}

function ReviewEmail({ dealTitle = 'your deal', otherName = 'your connection', dealUrl = 'https://realtybridge.app/reviews', needsOutcome = false }: Props) {
  return <Html lang="en"><Head /><Preview>Close out your deal and review your connection.</Preview><Body style={main}><Container style={container}>
    <EmailBrandLogo /><Heading>{needsOutcome ? 'Confirm the outcome of your deal' : 'How did your connection go?'}</Heading>
    <Text style={text}>An outcome has been reported for {dealTitle}.</Text>
    <Text style={text}>{needsOutcome ? `Open the deal, report your own sold or cancelled outcome, then leave an honest review of ${otherName}. You do not have to wait for both reports to agree before reviewing.` : `Please leave an honest review of ${otherName}. You can review now without waiting for the other party to confirm.`}</Text>
    <Button href={dealUrl} style={button}>{needsOutcome ? 'Report outcome and review' : 'Leave your review'}</Button>
    <Text style={text}>Your feedback helps members choose the right people for their next deal.</Text>
  </Container></Body></Html>;
}

export const applicationTemplate = { component: ApplicationEmail, subject: 'A Realtor is interested — choose your connection', displayName: 'Investor application action', previewData: { dealTitle: 'Wytheville property', otherName: 'Jane Smith' } } satisfies TemplateEntry;
export const reviewTemplate = { component: ReviewEmail, subject: 'Your RealtyBridge deal: close out and review your connection', displayName: 'Deal outcome and review', previewData: { dealTitle: 'Wytheville property', otherName: 'Jane Smith' } } satisfies TemplateEntry;