import * as React from 'react';
import { Body, Button, Container, Head, Heading, Html, Preview, Text } from '@react-email/components';
import { EmailBrandLogo } from './brand-logo';
import type { TemplateEntry } from './registry';

interface Props {
  dealTitle?: string;
  area?: string;
  price?: string;
  agentNeed?: string;
  dealUrl?: string;
  investorName?: string;
}

const Email = ({ dealTitle = 'New investor property', area = 'See property details', price = 'TBD', agentNeed, dealUrl = 'https://realtybridge.app/admin', investorName = 'Member' }: Props) => (
  <Html lang="en" dir="ltr">
    <Head /><Preview>A new investor property was posted: {dealTitle}</Preview>
    <Body style={main}><Container style={container}>
      <EmailBrandLogo />
      <Heading style={heading}>New investor property posted</Heading>
      <Text style={text}>An investor has posted a new property on RealtyBridge.</Text>
      <Text style={text}><b>{dealTitle}</b><br />Location: {area}<br />Target list price: {price}<br />Posted by: {investorName}<br />
        {agentNeed === 'buyers_agent' ? 'Seeking: a Realtor to bring a buyer' : 'Seeking: a listing Realtor'}
      </Text>
      <Button style={button} href={dealUrl}>View property</Button>
    </Container></Body>
  </Html>
);

const entry = {
  component: Email,
  subject: (data: Record<string, unknown>) => `New investor property: ${data.dealTitle || 'Property posted'}`,
  previewData: { dealTitle: 'Wytheville property', area: 'Wythe County, VA', price: '$185,000', investorName: 'Example investor' },
} satisfies TemplateEntry;

export const ricaTemplate = { ...entry, displayName: 'New investor property — Rica', to: 'Rica@bzthree.com' } satisfies TemplateEntry;
export const brockTemplate = { ...entry, displayName: 'New investor property — Brock', to: 'brock.zevan@gmail.com' } satisfies TemplateEntry;

const main = { backgroundColor: '#ffffff', fontFamily: 'Arial, sans-serif' };
const container = { padding: '20px 25px' };
const heading = { color: '#1e3a5f', fontSize: '22px' };
const text = { color: '#475569', fontSize: '14px', lineHeight: '1.6' };
const button = { backgroundColor: '#1d8aa6', color: '#ffffff', padding: '12px 20px', borderRadius: '8px' };