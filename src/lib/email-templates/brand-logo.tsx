import * as React from 'react'
import { Img } from '@react-email/components'

/** Absolute public URL so the logo also loads outside the app in email clients. */
export function EmailBrandLogo() {
  return (
    <Img
      src="https://realtybridge.app/brand/realtybridge-logo.png"
      alt="RealtyBridge"
      width={220}
      height={135}
      style={{ display: 'block', width: '220px', maxWidth: '100%', height: 'auto', margin: '0 0 24px' }}
    />
  )
}