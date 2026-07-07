import { classifyMetric } from '@/lib/cwv-thresholds';

export interface CWVByRenderType {
  render_category: string;   // 'SSR' | 'CSR' | 'Hybrid' | 'Other'
  sample_count: string | number;
  avg_lcp: string | number | null;
  lcp_good: string | number;
  avg_cls: string | number | null;
  cls_good: string | number;
  avg_fid: string | number | null;   // received but NOT displayed — FID is deprecated
  fid_good: string | number;
  avg_ttfb: string | number | null;
  ttfb_good: string | number;
  pass_rate: string | number | null;
}

interface CWVInsightsProps {
  data?: CWVByRenderType[];
}

const CATEGORY_ORDER = ['SSR', 'CSR', 'Hybrid'];

const CATEGORY_COLORS: Record<string, string> = {
  SSR: 'bg-emerald-500',
  CSR: 'bg-rose-500',
  Hybrid: 'bg-amber-500',
};

const RATING_CLASSES: Record<string, string> = {
  good: 'text-emerald-600',
  'needs-improvement': 'text-amber-600',
  poor: 'text-rose-600',
};

function renderMetricRow(
  label: string,
  metric: 'lcp' | 'cls' | 'ttfb',
  avgValue: string | number | null,
  formatFn: (n: number) => string
) {
  const parsed =
    metric === 'cls'
      ? parseFloat(String(avgValue ?? ''))
      : parseInt(String(avgValue ?? ''));
  const hasValue = avgValue !== null && avgValue !== undefined && !Number.isNaN(parsed);
  const ratingClass = hasValue ? RATING_CLASSES[classifyMetric(metric, parsed)] : 'text-gray-400';

  return (
    <div key={label} className="flex items-center justify-between text-sm mb-1.5">
      <span className="text-gray-500">{label}</span>
      <span className={`font-semibold ${ratingClass}`}>
        {hasValue ? formatFn(parsed) : '—'}
      </span>
    </div>
  );
}

export function CWVInsights({ data }: CWVInsightsProps) {
  if (!data || data.length === 0) {
    return (
      <div className="rounded-lg border bg-white border-gray-100 shadow-sm p-6">
        <h3 className="text-2xl font-semibold leading-none tracking-tight flex items-center gap-2 mb-2">
          ⚡ Core Web Vitals by Render Type
        </h3>
        <p className="text-sm text-gray-400 italic">Core Web Vitals data unavailable</p>
      </div>
    );
  }

  const rows = data.filter((row) => {
    if (row.render_category === 'Other') return false;
    const n = parseInt(String(row.sample_count ?? 0)) || 0;
    return n > 0;
  });

  const sorted = CATEGORY_ORDER
    .map((category) => rows.find((row) => row.render_category === category))
    .filter((row): row is CWVByRenderType => Boolean(row));

  if (sorted.length === 0) {
    return (
      <div className="rounded-lg border bg-white border-gray-100 shadow-sm p-6">
        <h3 className="text-2xl font-semibold leading-none tracking-tight flex items-center gap-2 mb-2">
          ⚡ Core Web Vitals by Render Type
        </h3>
        <p className="text-sm text-gray-400 italic">Core Web Vitals data unavailable</p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border bg-white border-gray-100 shadow-sm">
      <div className="flex flex-col space-y-1.5 p-6">
        <h3 className="text-2xl font-semibold leading-none tracking-tight flex items-center gap-2">
          ⚡ Core Web Vitals by Render Type
          <span className="ml-auto inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 border-blue-200 bg-blue-50 text-blue-600">
            Phase 1
          </span>
        </h3>
        <p className="text-sm text-gray-500">
          Real-world performance measured by extension users, segmented by rendering strategy
        </p>
      </div>
      <div className="p-6 pt-0">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {sorted.map((row) => {
            const sampleCount = parseInt(String(row.sample_count ?? 0)) || 0;
            const passRate = row.pass_rate === null || row.pass_rate === undefined
              ? null
              : parseInt(String(row.pass_rate)) || 0;
            const fillColor = passRate !== null && passRate >= 50 ? 'bg-emerald-500' : 'bg-amber-500';

            return (
              <div key={row.render_category}>
                <div className="flex items-center gap-2 mb-3">
                  <span
                    className={`inline-block w-2.5 h-2.5 rounded-full ${CATEGORY_COLORS[row.render_category] ?? 'bg-gray-400'}`}
                  />
                  <span className="font-semibold text-gray-800">{row.render_category}</span>
                  <span className="text-xs text-gray-400">n = {sampleCount.toLocaleString()}</span>
                  {sampleCount < 50 && (
                    <span className="text-xs text-gray-400">low sample</span>
                  )}
                </div>

                {renderMetricRow('LCP', 'lcp', row.avg_lcp, (n) => `${Math.round(n)} ms`)}
                {renderMetricRow('CLS', 'cls', row.avg_cls, (n) => n.toFixed(3))}
                {renderMetricRow('TTFB', 'ttfb', row.avg_ttfb, (n) => `${Math.round(n)} ms`)}

                <div className="mt-3">
                  <div className="flex items-center gap-2 text-xs text-gray-500 mb-1">
                    <span>CWV pass rate</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${fillColor}`}
                        style={{ width: `${passRate ?? 0}%` }}
                      />
                    </div>
                    <div className="w-12 text-right text-gray-500 text-xs">
                      {passRate !== null ? `${passRate}%` : '—'}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
