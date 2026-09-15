import { Button } from '@/components/Button';
import { Card, CardBody, CardHeader } from '@/components/Card';
import { Tag } from '@/components/Tag';
import { IconSpark } from '@/components/icons';
import { initialAIInsights } from '@/data/datasets';
import { PageHeader } from '@/layout/PageHeader';
import { formatDate } from '@/lib/format';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export function AIInsightsPage() {
  const navigate = useNavigate();
  const [insights] = useState(initialAIInsights);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [isRefreshing, setIsRefreshing] = useState(false);

  const filteredInsights =
    selectedCategory === 'all'
      ? insights
      : insights.filter((item) => item.category === selectedCategory);

  const handleSimulateAnalysis = () => {
    setIsRefreshing(true);
    setTimeout(() => {
      setIsRefreshing(false);
    }, 600);
  };

  const getActionRoute = (category: string) => {
    switch (category) {
      case 'revenue':
        return '/crm/pipeline-deals';
      case 'operations':
        return '/commerce/products';
      case 'risk':
        return '/finance/receivables';
      case 'efficiency':
        return '/reports/sales-reports';
      default:
        return '/dashboard/action-center';
    }
  };

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="AI Business Insights"
        description="Machine learning-synthesized observations, churn probability alerts, margin expansion vectors, and predictive recommendations."
        actions={
          <Button variant="primary" disabled={isRefreshing} onClick={handleSimulateAnalysis}>
            <IconSpark size={16} />
            {isRefreshing ? 'Analyzing Telemetry…' : 'Run Diagnostics'}
          </Button>
        }
      />

      {/* Categories Filter */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex rounded bg-surface-sunken p-0.5">
          {[
            { id: 'all', label: 'All Observations' },
            { id: 'revenue', label: 'Revenue Growth' },
            { id: 'operations', label: 'Supply & Operations' },
            { id: 'risk', label: 'Risk & Compliance' },
            { id: 'efficiency', label: 'Velocity & Efficiency' },
          ].map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => setSelectedCategory(cat.id)}
              className={`rounded px-3 py-1.5 text-xs font-semibold uppercase tracking-wider transition-colors ${
                selectedCategory === cat.id
                  ? 'bg-surface-card text-ink-900 shadow-sm'
                  : 'text-ink-500 hover:text-ink-900'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Insights Grid */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {filteredInsights.map((insight) => (
          <Card key={insight.id} className="flex flex-col justify-between border-l-4 border-l-accent-500">
            <div>
              <CardHeader
                title={
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-ink-900">{insight.title}</span>
                  </div>
                }
                action={
                  <div className="flex items-center gap-2">
                    {insight.impact === 'high' && <Tag tone="danger">High Impact</Tag>}
                    {insight.impact === 'medium' && <Tag tone="warn">Medium Impact</Tag>}
                    {insight.impact === 'low' && <Tag tone="neutral">Low Impact</Tag>}
                  </div>
                }
              />
              <CardBody className="pt-2">
                <p className="text-sm leading-relaxed text-ink-700">{insight.summary}</p>

                {insight.metricHighlight && (
                  <div className="mt-3 inline-block rounded bg-accent-100 px-2.5 py-1 text-xs font-semibold text-accent-600">
                    {insight.metricHighlight}
                  </div>
                )}

                <div className="mt-4 rounded border border-ink-100 bg-surface-sunken/40 p-3">
                  <p className="text-2xs font-semibold uppercase tracking-wider text-ink-500">
                    Recommended Action
                  </p>
                  <p className="mt-1 text-xs text-ink-700">{insight.recommendation}</p>
                </div>
              </CardBody>
            </div>

            <div className="flex items-center justify-between border-t border-ink-100 bg-surface-sunken/20 px-4 py-3">
              <span className="text-2xs text-ink-300">
                Generated {formatDate(insight.createdAt)}
              </span>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => navigate(getActionRoute(insight.category))}
              >
                Execute Recommendation →
              </Button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
