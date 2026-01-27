'use client';

interface CoreWebVitalsData {
  render_category: string;
  sample_count: number;
  avg_lcp: number;
  lcp_good: number;
  avg_cls: number;
  cls_good: number;
  avg_fid: number | null;
  fid_good: number;
  avg_ttfb: number;
  ttfb_good: number;
  pass_rate: number;
}

interface Props {
  data: CoreWebVitalsData[];
}

export function CoreWebVitalsComparison({ data }: Props) {
  if (!data || data.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">
          Core Web Vitals by Render Type
        </h2>
        <p className="text-gray-500 dark:text-gray-400 text-center py-8">
          No Core Web Vitals data available yet. Data will appear once extension v3.3.0 users submit analyses.
        </p>
      </div>
    );
  }

  const getStatusColor = (metric: string, value: number | null) => {
    if (value === null) return 'text-gray-400';
    
    switch (metric) {
      case 'lcp':
        return value < 2500 ? 'text-green-600' : value < 4000 ? 'text-yellow-600' : 'text-red-600';
      case 'cls':
        return value < 0.1 ? 'text-green-600' : value < 0.25 ? 'text-yellow-600' : 'text-red-600';
      case 'fid':
        return value < 100 ? 'text-green-600' : value < 300 ? 'text-yellow-600' : 'text-red-600';
      case 'ttfb':
        return value < 800 ? 'text-green-600' : value < 1800 ? 'text-yellow-600' : 'text-red-600';
      default:
        return 'text-gray-600';
    }
  };

  const getPassRateColor = (rate: number) => {
    if (rate >= 75) return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
    if (rate >= 50) return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
    return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
      <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">
        Core Web Vitals by Render Type
      </h2>
      <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
        Performance metrics comparison across different rendering strategies
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {data.map((item) => (
          <div
            key={item.render_category}
            className="border border-gray-200 dark:border-gray-700 rounded-lg p-4"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                {item.render_category}
              </h3>
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${getPassRateColor(item.pass_rate)}`}>
                {item.pass_rate}% pass
              </span>
            </div>

            <div className="text-xs text-gray-500 dark:text-gray-400 mb-4">
              {item.sample_count.toLocaleString()} samples
            </div>

            <div className="space-y-3">
              {/* LCP */}
              <div>
                <div className="flex justify-between items-center mb-1">
                  <span className="text-sm text-gray-600 dark:text-gray-400">LCP</span>
                  <span className={`text-sm font-medium ${getStatusColor('lcp', item.avg_lcp)}`}>
                    {item.avg_lcp ? `${item.avg_lcp}ms` : 'N/A'}
                  </span>
                </div>
                <div className="text-xs text-gray-500">
                  {item.lcp_good}/{item.sample_count} good (\u003c2.5s)
                </div>
              </div>

              {/* CLS */}
              <div>
                <div className="flex justify-between items-center mb-1">
                  <span className="text-sm text-gray-600 dark:text-gray-400">CLS</span>
                  <span className={`text-sm font-medium ${getStatusColor('cls', item.avg_cls)}`}>
                    {item.avg_cls !== null ? item.avg_cls.toFixed(3) : 'N/A'}
                  </span>
                </div>
                <div className="text-xs text-gray-500">
                  {item.cls_good}/{item.sample_count} good (\u003c0.1)
                </div>
              </div>

              {/* TTFB */}
              <div>
                <div className="flex justify-between items-center mb-1">
                  <span className="text-sm text-gray-600 dark:text-gray-400">TTFB</span>
                  <span className={`text-sm font-medium ${getStatusColor('ttfb', item.avg_ttfb)}`}>
                    {item.avg_ttfb ? `${item.avg_ttfb}ms` : 'N/A'}
                  </span>
                </div>
                <div className="text-xs text-gray-500">
                  {item.ttfb_good}/{item.sample_count} good (\u003c800ms)
                </div>
              </div>

              {/* FID (if available) */}
              {item.avg_fid !== null && (
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-sm text-gray-600 dark:text-gray-400">FID</span>
                    <span className={`text-sm font-medium ${getStatusColor('fid', item.avg_fid)}`}>
                      {item.avg_fid}ms
                    </span>
                  </div>
                  <div className="text-xs text-gray-500">
                    {item.fid_good}/{item.sample_count} good (\u003c100ms)
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
        <p className="text-sm text-blue-800 dark:text-blue-200">
          <strong>Core Web Vitals:</strong> LCP (Largest Contentful Paint), CLS (Cumulative Layout Shift), 
          FID (First Input Delay), TTFB (Time to First Byte). Green = Good, Yellow = Needs Improvement, Red = Poor.
        </p>
      </div>
    </div>
  );
}
