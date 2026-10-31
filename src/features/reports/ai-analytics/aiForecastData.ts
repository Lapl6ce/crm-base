/* Dummy forecast data for AI Analytics.
 *
 * There is no model behind this screen yet, so these rows stand in for its
 * output. Close dates are stored as "days from today" rather than fixed dates,
 * so the week / month / quarter windows always have something in them no
 * matter when the app is opened. Replace with a real forecasting source when
 * one exists; the page only depends on the DealRiskPrediction shape. */

export interface DealRiskPrediction {
  id: string;
  dealTitle: string;
  customerName: string;
  value: number;
  predictedWinRate: number;
  /** Expected close, in days from today. */
  closesInDays: number;
  riskFactor: string;
  recommendedAction: string;
  urgency: 'high' | 'medium' | 'low';
}

export type ForecastPeriod = 'week' | 'month' | 'quarter';

export interface PeriodConfig {
  label: string;
  /** "this week", used in sentences. */
  phrase: string;
  windowDays: number;
  /** Width of one bar on the forecast timeline. */
  bucketDays: number;
  bucketLabel: string;
  /** date-fns format for a bucket's start date. */
  bucketFormat: string;
  /** Shorter horizons are easier to call, so the stated margin narrows. */
  forecastMargin: number;
}

export const PERIODS: Record<ForecastPeriod, PeriodConfig> = {
  week: {
    label: 'Week',
    phrase: 'this week',
    windowDays: 7,
    bucketDays: 1,
    bucketLabel: 'Day',
    bucketFormat: 'EEE d',
    forecastMargin: 3.1,
  },
  month: {
    label: 'Month',
    phrase: 'in the next 30 days',
    windowDays: 30,
    bucketDays: 7,
    bucketLabel: 'Week of',
    bucketFormat: 'd MMM',
    forecastMargin: 5.4,
  },
  quarter: {
    label: 'Quarter',
    phrase: 'in the next 90 days',
    windowDays: 90,
    bucketDays: 30,
    bucketLabel: 'Month from',
    bucketFormat: 'd MMM',
    forecastMargin: 8.2,
  },
};

export const PREDICTIVE_DEALS: DealRiskPrediction[] = [
  { id: 'prd_1', dealTitle: 'Global Gateway Rollout', customerName: 'Vertex Global Systems', value: 120000, predictedWinRate: 88, closesInDays: 3, riskFactor: 'High momentum, legal redlines pending 3 days', recommendedAction: 'Schedule procurement call to clarify indemnity clause', urgency: 'low' },
  { id: 'prd_2', dealTitle: 'Optics Peripheral Procurement', customerName: 'Ampere Optics Ltd', value: 64000, predictedWinRate: 42, closesInDays: 5, riskFactor: 'No client activity or communication in 18 days', recommendedAction: 'Send executive re-engagement email with revised SLA pricing', urgency: 'high' },
  { id: 'prd_3', dealTitle: 'Warehouse Scanner Refresh', customerName: 'Northwind Logistics', value: 22500, predictedWinRate: 76, closesInDays: 1, riskFactor: 'Final sign-off waiting on CFO, who is travelling', recommendedAction: 'Send DocuSign link with a 48-hour price hold', urgency: 'low' },
  { id: 'prd_4', dealTitle: 'Retail POS Edge Bundle', customerName: 'Marlow & Finch Retail', value: 18400, predictedWinRate: 54, closesInDays: 6, riskFactor: 'Asked for a 15% discount after the proposal', recommendedAction: 'Offer extended support term instead of a price cut', urgency: 'medium' },
  { id: 'prd_5', dealTitle: 'Genomics Telemetry Sensors', customerName: 'Borealis Genomics', value: 85000, predictedWinRate: 74, closesInDays: 11, riskFactor: 'Competitor proposal received by technical team', recommendedAction: 'Highlight 99.99% uptime guarantee and local warehouse stock', urgency: 'medium' },
  { id: 'prd_6', dealTitle: 'Biometric Access Edge Nodes', customerName: 'Vanguard Biometrics', value: 95000, predictedWinRate: 31, closesInDays: 16, riskFactor: 'Champion moved roles; budget signoff delayed', recommendedAction: 'Request briefing with interim VP of Security', urgency: 'high' },
  { id: 'prd_7', dealTitle: 'Clinic Network Upgrade', customerName: 'Apex Health Systems', value: 52000, predictedWinRate: 67, closesInDays: 20, riskFactor: 'Security review questionnaire still open', recommendedAction: 'Assign a solutions engineer to finish the questionnaire', urgency: 'medium' },
  { id: 'prd_8', dealTitle: 'Clean Energy Grid Gateways', customerName: 'Solaris Clean Energy', value: 48000, predictedWinRate: 82, closesInDays: 24, riskFactor: 'Evaluation trial progressing ahead of schedule', recommendedAction: 'Issue commercial quotation before pilot conclusion', urgency: 'low' },
  { id: 'prd_9', dealTitle: 'Campus Wi-Fi Expansion', customerName: 'Halden University', value: 37500, predictedWinRate: 38, closesInDays: 28, riskFactor: 'Public tender rules require two more quotes', recommendedAction: 'Prepare tender-compliant pricing pack this week', urgency: 'high' },
  { id: 'prd_10', dealTitle: 'Fleet Telematics Pilot', customerName: 'Carrow Freight', value: 29000, predictedWinRate: 61, closesInDays: 35, riskFactor: 'Pilot scope grew twice without a change order', recommendedAction: 'Lock pilot scope in writing before extending', urgency: 'medium' },
  { id: 'prd_11', dealTitle: 'Data Centre Storage Tier', customerName: 'Kestrel Cloud Hosting', value: 140000, predictedWinRate: 71, closesInDays: 42, riskFactor: 'Lead time on NVMe nodes may slip the go-live date', recommendedAction: 'Confirm stock with operations and quote firm delivery', urgency: 'medium' },
  { id: 'prd_12', dealTitle: 'Branch Router Replacement', customerName: 'Ostrava Credit Union', value: 58000, predictedWinRate: 84, closesInDays: 49, riskFactor: 'Strong technical fit; procurement cycle is long', recommendedAction: 'Send procurement checklist to shorten approval', urgency: 'low' },
  { id: 'prd_13', dealTitle: 'Smart Factory Sensors', customerName: 'Brennan Precision Tooling', value: 76000, predictedWinRate: 46, closesInDays: 57, riskFactor: 'Budget moved to next fiscal year in latest call', recommendedAction: 'Propose a phased start inside the current budget', urgency: 'high' },
  { id: 'prd_14', dealTitle: 'Endpoint Security Renewal', customerName: 'Lumen Legal LLP', value: 26000, predictedWinRate: 92, closesInDays: 63, riskFactor: 'Renewal with high product usage', recommendedAction: 'Offer a two-year term at the current rate', urgency: 'low' },
  { id: 'prd_15', dealTitle: 'Port Logistics Gateways', customerName: 'Tidewater Port Authority', value: 112000, predictedWinRate: 28, closesInDays: 74, riskFactor: 'Incumbent vendor offered a free year of support', recommendedAction: 'Build a three-year total cost comparison', urgency: 'high' },
  { id: 'prd_16', dealTitle: 'Retail Analytics Licences', customerName: 'Marlow & Finch Retail', value: 34000, predictedWinRate: 63, closesInDays: 86, riskFactor: 'Depends on the POS bundle closing first', recommendedAction: 'Bundle both into one order form', urgency: 'medium' },
];

export const WIN_BUCKETS = [
  { bucket: 'Very High (80-100%)', min: 80, color: '#10b981' },
  { bucket: 'Promising (60-79%)', min: 60, color: '#0284c7' },
  { bucket: 'Uncertain (40-59%)', min: 40, color: '#f59e0b' },
  { bucket: 'At Risk (<40%)', min: 0, color: '#ef4444' },
] as const;
