/* ⚠ DEMO ONLY — deleted before client handoff.

   Word pools for the seeder. Invented companies in unglamorous B2B industries,
   because a CRM demo full of "Stark Industries" reads as a toy; the person
   demoing a fork needs it to look like a real book of business. */

export const FIRST_NAMES = [
  'Ada', 'Marcus', 'Priya', 'Tomas', 'Ingrid', 'Kwame', 'Lena', 'Rafael',
  'Yuki', 'Nadia', 'Owen', 'Fatima', 'Dmitri', 'Grace', 'Silas', 'Mei',
  'Anneke', 'Joaquin', 'Tessa', 'Idris', 'Clara', 'Bo', 'Hana', 'Ruben',
  'Nell', 'Amara', 'Viktor', 'Sofia', 'Callum', 'Rina',
];

export const LAST_NAMES = [
  'Hollis', 'Varga', 'Okonkwo', 'Lindqvist', 'Marchetti', 'Bhatt', 'Ferreira',
  'Novak', 'Tanaka', 'Achebe', 'Delacroix', 'Vasquez', 'Kaur', 'Petrov',
  'Ashworth', 'Moreau', 'Silva', 'Whitfield', 'Nakamura', 'Osei', 'Brennan',
  'Kovac', 'Iversen', 'Rahman', 'Castellanos', 'Fenwick', 'Mbeki', 'Halvorsen',
];

const COMPANY_HEADS = [
  'Meridian', 'Northgate', 'Alder', 'Kestrel', 'Bright Harbour', 'Volta',
  'Ironwood', 'Cascade', 'Pallas', 'Fairhaven', 'Quarry', 'Lantern',
  'Grayling', 'Southfield', 'Tessellate', 'Bramble', 'Orrery', 'Kilnwork',
];

const COMPANY_TAILS = [
  'Logistics', 'Foods', 'Instruments', 'Health', 'Utilities', 'Systems',
  'Manufacturing', 'Print', 'Aggregates', 'Fabrication', 'Dairy', 'Optics',
];

export const COMPANY_NAMES = COMPANY_HEADS.flatMap((head) =>
  COMPANY_TAILS.map((tail) => `${head} ${tail}`),
);

export const INDUSTRIES = [
  'Logistics', 'Food & Beverage', 'Manufacturing', 'Healthcare', 'Utilities',
  'Construction', 'Professional Services', 'Retail', 'Agriculture', 'Print & Packaging',
];

export const JOB_TITLES = [
  'Operations Director', 'Head of Procurement', 'Finance Manager', 'Plant Manager',
  'IT Lead', 'Managing Director', 'Facilities Manager', 'Quality Lead',
  'Logistics Coordinator', 'Commercial Director', 'Site Supervisor', 'Buyer',
];

export const CONTACT_TAGS = [
  'decision maker', 'champion', 'technical', 'finance', 'renewal', 'inbound',
  'conference', 'referral', 'gatekeeper',
];

export const COMPANY_TAGS = [
  'key account', 'multi-site', 'framework', 'inbound', 'partner', 'at risk', 'expansion',
];

export const DEAL_SUBJECTS = [
  'fleet renewal', 'annual supply agreement', 'depot fit-out', 'line upgrade',
  'maintenance contract', 'pilot rollout', 'site expansion', 'compliance retrofit',
  'seasonal top-up', 'replacement units', 'service tier upgrade', 'warehouse racking',
];

export const TASK_TITLES = [
  'Send revised quote', 'Chase signed order form', 'Book site visit',
  'Confirm delivery window', 'Follow up on proposal', 'Prepare reference call',
  'Check credit terms', 'Share compliance pack', 'Schedule quarterly review',
  'Update forecast', 'Call about renewal', 'Send installation timeline',
];

export const CITIES = [
  ['Bristol', 'Somerset', 'BS1 4TR'],
  ['Leeds', 'West Yorkshire', 'LS1 2AB'],
  ['Glasgow', 'Lanarkshire', 'G2 8DL'],
  ['Cardiff', 'South Glamorgan', 'CF10 1EP'],
  ['Norwich', 'Norfolk', 'NR1 3QQ'],
  ['Sheffield', 'South Yorkshire', 'S1 2HH'],
  ['Plymouth', 'Devon', 'PL1 1AA'],
  ['Dundee', 'Angus', 'DD1 4QB'],
];

export const STREETS = [
  'Alder Way', 'Quarry Road', 'Kiln Lane', 'Harbour Approach', 'Foundry Street',
  'Northgate Park', 'Bramble Close', 'Meridian Avenue',
];

export const NOTE_BODIES = [
  'Spoke on the phone — budget is confirmed but sign-off sits with the board, which meets at the end of the month.',
  'Site visit went well. They walked us through the loading bay; access is tighter than the drawings suggest.',
  'Wants a like-for-like comparison against their incumbent before committing. Sending the breakdown.',
  'Procurement has frozen new spend until the new financial year. Worth a check-in in six weeks.',
  'Asked specifically about lead times on the larger units. Told them four to six weeks; they need three.',
  'Introduced us to the facilities lead at their second site — same requirement, separate budget.',
  'Happy with the trial. Two small issues raised, both handled by the service team same day.',
  'Pricing is the sticking point. They have a cheaper quote but are uneasy about the support terms.',
  'Renewal conversation started early at their request. No appetite to change supplier.',
  'Left a voicemail and followed up by email. No response yet — trying again next week.',
];

export const DEMO_USERS = [
  { name: 'Rosa Whitfield', email: 'rosa@example.com', role: 'admin' as const },
  { name: 'Idris Okonkwo', email: 'idris@example.com', role: 'sales_rep' as const },
  { name: 'Hana Lindqvist', email: 'hana@example.com', role: 'sales_rep' as const },
  { name: 'Callum Brennan', email: 'callum@example.com', role: 'sales_rep' as const },
];
