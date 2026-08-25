import type { AppSettings, PipelineStage, User } from '../types';
import { tokens } from '@/lib/tokens';
import { generateId, nowISO } from './collection';

/* First-boot state. This is what a freshly forked, demo-mode-off CRM looks
   like: one admin so the app has a current user, and a pipeline that a client
   is expected to rename in Settings rather than accept as-is. */

export const DEFAULT_STAGE_IDS = {
  lead: 'stage_lead',
  qualified: 'stage_qualified',
  proposal: 'stage_proposal',
  negotiation: 'stage_negotiation',
  won: 'stage_won',
  lost: 'stage_lost',
} as const;

export const defaultStages = (): PipelineStage[] => [
  { id: DEFAULT_STAGE_IDS.lead, name: 'Lead In', order: 0, outcome: 'open' },
  { id: DEFAULT_STAGE_IDS.qualified, name: 'Qualified', order: 1, outcome: 'open' },
  { id: DEFAULT_STAGE_IDS.proposal, name: 'Proposal', order: 2, outcome: 'open' },
  { id: DEFAULT_STAGE_IDS.negotiation, name: 'Negotiation', order: 3, outcome: 'open' },
  { id: DEFAULT_STAGE_IDS.won, name: 'Closed Won', order: 4, outcome: 'won' },
  { id: DEFAULT_STAGE_IDS.lost, name: 'Closed Lost', order: 5, outcome: 'lost' },
];

export const DEFAULT_ADMIN_ID = 'user_admin';

export const defaultUsers = (): User[] => [
  {
    id: DEFAULT_ADMIN_ID,
    name: 'Admin',
    email: 'admin@example.com',
    role: 'admin',
    avatarColor: tokens.ink[700],
    createdAt: nowISO(),
  },
];

export const defaultSettings = (): AppSettings => ({
  company: { name: 'Your Company', logoUrl: null, accentColor: tokens.accent[500] },
  stages: defaultStages(),
  defaultCurrency: 'USD',
  demoMode: false,
  currentUserId: DEFAULT_ADMIN_ID,
});

/** Palette for user chips, cycled so two adjacent users never collide. */
export const AVATAR_COLORS = [
  tokens.ink[700],
  tokens.positive[500],
  tokens.accent[600],
  tokens.warn[500],
  tokens.ink[500],
] as const;

export const nextAvatarColor = (index: number): string =>
  AVATAR_COLORS[index % AVATAR_COLORS.length];

export const newUserId = () => generateId('user');
