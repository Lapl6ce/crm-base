import { Button } from '@/components/Button';
import { Card, CardBody, CardHeader } from '@/components/Card';
import { ChartCard } from '@/components/ChartCard';
import { Table, type Column } from '@/components/Table';
import { Tag } from '@/components/Tag';
import { toast } from '@/components/Toast';
import { PageHeader } from '@/layout/PageHeader';
import { formatCurrency } from '@/lib/format';
import {
    Bar,
    BarChart,
    CartesianGrid,
    Cell,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from 'recharts';

interface DealRiskPrediction {
  id: string;
  dealTitle: string;
  customerName: string;
  value: number;
  predictedWinRate: number;
  riskFactor: string;
  recommendedAction: string;
  urgency: 'high' | 'medium' | 'low';
}

const PREDICTIVE_DEALS: DealRiskPrediction[] = [
  {
    id: 'prd_1',
    dealTitle: 'Global Gateway Rollout',
    customerName: 'Vertex Global Systems',
    value: 120000,
    predictedWinRate: 88,
    riskFactor: 'High momentum, legal redlines pending 3 days',
    recommendedAction: 'Schedule procurement call to clarify indemnity clause',
    urgency: 'low',
  },
  {
    id: 'prd_2',
    dealTitle: 'Optics Peripheral Procurement',
    customerName: 'Ampere Optics Ltd',
    value: 64000,
    predictedWinRate: 42,
    riskFactor: 'No client activity or communication in 18 days',
    recommendedAction: 'Send executive re-engagement email with revised SLA pricing',
    urgency: 'high',
  },
  {
    id: 'prd_3',
    dealTitle: 'Genomics Telemetry Sensors',
    customerName: 'Borealis Genomics',
    value: 85000,
    predictedWinRate: 74,
    riskFactor: 'Competitor proposal received by technical team',
    recommendedAction: 'Highlight 99.99% uptime guarantee and local warehouse stock',
    urgency: 'medium',
  },
  {
    id: 'prd_4',
    dealTitle: 'Biometric Access Edge Nodes',
    customerName: 'Vanguard Biometrics',
    value: 95000,
    predictedWinRate: 31,
    riskFactor: 'Champion moved roles; budget signoff delayed',
    recommendedAction: 'Request briefing with interim VP of Security',
    urgency: 'high',
  },
  {
    id: 'prd_5',
    dealTitle: 'Clean Energy Grid Gateways',
    customerName: 'Solaris Clean Energy',
    value: 48000,
    predictedWinRate: 82,
    riskFactor: 'Evaluation trial progressing ahead of schedule',
    recommendedAction: 'Issue commercial quotation before pilot conclusion',
    urgency: 'low',
  },
];

const WIN_DISTRIBUTION = [
  { bucket: 'Very High (80-100%)', count: 4, value: 248000, color: '#10b981' },
  { bucket: 'Promising (60-79%)', count: 6, value: 312000, color: '#0284c7' },
  { bucket: 'Uncertain (40-59%)', count: 3, value: 145000, color: '#f59e0b' },
  { bucket: 'At Risk (<40%)', count: 2, value: 159000, color: '#ef4444' },
];

export function AIAnalyticsPage() {
  const handleAction = (item: DealRiskPrediction) => {
    toast.success(`Action initiated: "${item.recommendedAction}"`);
  };

  const columns: Column<DealRiskPrediction>[] = [
    {
      id: 'deal',
      header: 'Deal & Customer',
      cell: (d) => (
        <div className="flex flex-col">
          <span className="font-semibold text-ink-900">{d.dealTitle}</span>
          <span className="text-xs text-ink-500">{d.customerName}</span>
        </div>
      ),
    },
    {
      id: 'value',
      header: 'Value',
      align: 'right',
      cell: (d) => (
        <span className="font-mono text-xs font-semibold text-ink-900">
          {formatCurrency(d.value, 'USD')}
        </span>
      ),
    },
    {
      id: 'winRate',
      header: 'AI Win Probability',
      cell: (d) => {
        const isHigh = d.predictedWinRate >= 70;
        const isLow = d.predictedWinRate < 50;
        return (
          <div className="flex w-32 flex-col gap-1">
            <div className="flex justify-between text-xs font-mono font-medium">
              <span className={isLow ? 'text-danger-600' : isHigh ? 'text-emerald-600' : 'text-amber-600'}>
                {d.predictedWinRate}%
              </span>
            </div>
            <div className="h-1.5 w-full rounded-full bg-surface-sunken">
              <div
                className={`h-1.5 rounded-full ${
                  isLow ? 'bg-danger-500' : isHigh ? 'bg-emerald-500' : 'bg-amber-500'
                }`}
                style={{ width: `${d.predictedWinRate}%` }}
              />
            </div>
          </div>
        );
      },
    },
    {
      id: 'riskFactor',
      header: 'Primary Churn Risk Factor',
      cell: (d) => (
        <div className="flex flex-col text-xs max-w-xs">
          <span className="text-ink-700">{d.riskFactor}</span>
        </div>
      ),
    },
    {
      id: 'urgency',
      header: 'Risk Level',
      cell: (d) => (
        <Tag tone={d.urgency === 'high' ? 'danger' : d.urgency === 'medium' ? 'warn' : 'success'}>
          {d.urgency.toUpperCase()}
        </Tag>
      ),
    },
    {
      id: 'action',
      header: 'AI Intervention',
      align: 'right',
      cell: (d) => (
        <Button size="sm" variant="secondary" onClick={() => handleAction(d)}>
          Execute Playbook
        </Button>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="AI Predictive Analytics & Forecasting"
        meta="Machine-learned pipeline win rates, churn risk factors, and automated playbook interventions"
      />

      {/* KPI Tiles */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <Card>
          <CardBody className="py-3">
            <span className="text-xs font-medium text-ink-500">Predicted Q4 Closed Won</span>
            <p className="mt-1 font-mono text-2xl font-bold text-emerald-600">
              $560,000
            </p>
            <span className="text-xs text-ink-400 font-mono">± 8.2% forecast margin</span>
          </CardBody>
        </Card>
        <Card>
          <CardBody className="py-3">
            <span className="text-xs font-medium text-ink-500">Overall Pipeline Health</span>
            <p className="mt-1 font-mono text-2xl font-bold text-accent-600">
              76.4 / 100
            </p>
            <span className="text-xs text-emerald-600 font-medium">+4.2 pts vs last month</span>
          </CardBody>
        </Card>
        <Card>
          <CardBody className="py-3">
            <span className="text-xs font-medium text-ink-500">Identified Deals At Risk</span>
            <p className="mt-1 font-mono text-2xl font-bold text-danger-600">
              $159,000
            </p>
            <span className="text-xs text-ink-400">2 high-value opportunities</span>
          </CardBody>
        </Card>
        <Card>
          <CardBody className="py-3">
            <span className="text-xs font-medium text-ink-500">Model Accuracy Score</span>
            <p className="mt-1 font-mono text-2xl font-bold text-ink-900">
              91.8%
            </p>
            <span className="text-xs text-ink-400">Trained on 48 closed quarters</span>
          </CardBody>
        </Card>
      </div>

      <ChartCard
        title="Pipeline Value Distribution by Predicted Win Probability"
        subtitle="Deals categorized by machine-learned probability of reaching Closed Won"
      >
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={WIN_DISTRIBUTION} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
              <XAxis dataKey="bucket" tickLine={false} axisLine={false} fontSize={12} />
              <YAxis tickLine={false} axisLine={false} fontSize={12} tickFormatter={(v) => `$${v / 1000}k`} />
              <Tooltip formatter={(value: number) => [formatCurrency(value, 'USD'), 'Pipeline Value']} />
              <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                {WIN_DISTRIBUTION.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </ChartCard>

      <Card>
        <CardHeader
          title="Predictive Churn & Stalled Deal Analysis"
          description="High-value active opportunities showing elevated abandonment risk based on velocity decay and engagement drop."
        />
        <Table columns={columns} data={PREDICTIVE_DEALS} keyField="id" />
      </Card>
    </div>
  );
}
