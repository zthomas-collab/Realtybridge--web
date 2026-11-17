import type { ComponentType } from 'react'
import { applicationTemplate, reviewTemplate } from './deal-action'
import { template as freeAccountTemplate } from './free-account'
import { template as matchMadeTemplate } from './match-made'
import { template as welcomeClassTemplate } from './welcome-class'
import { template as newLeadTemplate } from './new-lead'
import { template as realtorsMatchedTemplate } from './realtors-matched'
import { template as opportunitySelectedTemplate } from './opportunity-selected'
import { template as brokerageReferralTemplate } from './brokerage-referral'
import { template as getActiveTemplate } from './get-active'
import { template as finishCheckoutTemplate } from './finish-checkout'
import { ricaTemplate, brockTemplate } from './investor-property-posted'

export interface TemplateEntry {
  component: ComponentType<any>
  subject: string | ((data: Record<string, any>) => string)
  displayName?: string
  previewData?: Record<string, any>
  /** Fixed recipient — overrides caller-provided recipientEmail when set. */
  to?: string
}

/**
 * Template registry — maps template names to their React Email components.
 * Import and register new templates here after creating them in this directory.
 *
 * Example:
 *   import { template as welcomeTemplate } from './welcome'
 *   // then add to TEMPLATES: 'welcome': welcomeTemplate
 */
export const TEMPLATES: Record<string, TemplateEntry> = {
  'investor-property-posted-rica': ricaTemplate,
  'investor-property-posted-brock': brockTemplate,
  'deal-application': applicationTemplate,
  'deal-review': reviewTemplate,
  'opportunity-selected': opportunitySelectedTemplate,
  'brokerage-referral': brokerageReferralTemplate,
  'free-account': freeAccountTemplate,
  'get-active': getActiveTemplate,
  'finish-checkout': finishCheckoutTemplate,
  'match-made': matchMadeTemplate,
  'welcome-class': welcomeClassTemplate,
  'new-lead': newLeadTemplate,
  'realtors-matched': realtorsMatchedTemplate,
  // Add templates here as they are created, e.g.:
  // 'welcome': welcomeTemplate,
}
