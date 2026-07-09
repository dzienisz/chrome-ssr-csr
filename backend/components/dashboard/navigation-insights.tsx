export interface NavigationByRenderType {
  render_category: string;   // 'SSR' | 'CSR' | 'Hybrid' | 'Other'
  sample_count: string | number;
  spa_count: string | number;
  avg_client_routes: string | number | null;
}

interface NavigationInsightsProps {
  data?: NavigationByRenderType[];
}

const CATEGORY_ORDER = ['SSR', 'CSR', 'Hybrid'];

const CATEGORY_COLORS: Record<string, string> = {
  SSR: 'bg-emerald-500',
  CSR: 'bg-rose-500',
  Hybrid: 'bg-amber-500',
};

function emptyState() {
  return (
    <div className="rounded-lg border bg-white border-gray-100 shadow-sm p-6">
      <h3 className="text-2xl font-semibold leading-none tracking-tight flex items-center gap-2 mb-2">
        🧭 SPA vs MPA Navigation
      </h3>
      <p className="text-sm text-gray-400 italic">Navigation data unavailable</p>
    </div>
  );
}

export function NavigationInsights({ data }: NavigationInsightsProps) {
  if (!data || data.length === 0) {
    return emptyState();
  }

  const rows = data.filter((row) => {
    if (row.render_category === 'Other') return false;
    const n = parseInt(String(row.sample_count ?? 0)) || 0;
    return n > 0;
  });

  const sorted = CATEGORY_ORDER
    .map((category) => rows.find((row) => row.render_category === category))
    .filter((row): row is NavigationByRenderType => Boolean(row));

  if (sorted.length === 0) {
    return emptyState();
  }

  const totalSamples = sorted.reduce(
    (sum, row) => sum + (parseInt(String(row.sample_count ?? 0)) || 0), 0
  );
  const totalSpa = sorted.reduce(
    (sum, row) => sum + (parseInt(String(row.spa_count ?? 0)) || 0), 0
  );
  const overallSpaShare = totalSamples > 0 ? Math.round((totalSpa / totalSamples) * 100) : 0;

  return (
    <div className="rounded-lg border bg-white border-gray-100 shadow-sm">
      <div className="flex flex-col space-y-1.5 p-6">
        <h3 className="text-2xl font-semibold leading-none tracking-tight flex items-center gap-2">
          🧭 SPA vs MPA Navigation
          <span className="ml-auto inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 border-blue-200 bg-blue-50 text-blue-600">
            Phase 3
          </span>
        </h3>
        <p className="text-sm text-gray-500">
          Share of pages navigating as single-page apps (client-side route changes),
          segmented by detected rendering strategy — {overallSpaShare}% SPA overall
          (n = {totalSamples.toLocaleString()})
        </p>
      </div>
      <div className="p-6 pt-0">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {sorted.map((row) => {
            const sampleCount = parseInt(String(row.sample_count ?? 0)) || 0;
            const spaCount = parseInt(String(row.spa_count ?? 0)) || 0;
            const spaShare = sampleCount > 0 ? Math.round((spaCount / sampleCount) * 100) : 0;
            const avgRoutes = parseFloat(String(row.avg_client_routes ?? ''));
            const hasRoutes = !Number.isNaN(avgRoutes);

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

                <div className="flex items-center gap-2 text-xs text-gray-500 mb-1">
                  <span>SPA share</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full bg-indigo-500"
                      style={{ width: `${spaShare}%` }}
                    />
                  </div>
                  <div className="w-12 text-right text-gray-500 text-xs">{spaShare}%</div>
                </div>

                <div className="flex items-center justify-between text-sm mt-3">
                  <span className="text-gray-500">Avg routes / SPA visit</span>
                  <span className="font-semibold text-gray-700">
                    {hasRoutes ? avgRoutes.toFixed(1) : '—'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
