'use client';

import { Card, Title, Text, Grid, Col, Badge, Flex } from '@tremor/react';

interface CoreWebVitalsData {
  render_category: string;
  sample_count: number;
  avg_lcp: number | null;
  lcp_good: number;
  avg_cls: number | null;
  cls_good: number;
  avg_fid: number | null;
  fid_good: number;
  avg_ttfb: number | null;
  ttfb_good: number;
  pass_rate: number | null;
}

interface Props {
  data: CoreWebVitalsData[];
}

export function CoreWebVitalsComparison({ data }: Props) {
  if (!data || data.length === 0) {
    return (
      <Card>
        <Title>Core Web Vitals by Render Type</Title>
        <div className="flex items-center justify-center h-20">
          <Text color="gray">No Core Web Vitals data available yet.</Text>
        </div>
      </Card>
    );
  }

  const getStatusColor = (metric: string, rawValue: number | null) => {
    if (rawValue === null) return 'text-gray-400';
    const value = Number(rawValue);
    
    switch (metric) {
      case 'lcp':
        return value < 2500 ? 'text-emerald-600' : value < 4000 ? 'text-amber-600' : 'text-rose-600';
      case 'cls':
        return value < 0.1 ? 'text-emerald-600' : value < 0.25 ? 'text-amber-600' : 'text-rose-600';
      case 'fid':
        return value < 100 ? 'text-emerald-600' : value < 300 ? 'text-amber-600' : 'text-rose-600';
      case 'ttfb':
        return value < 800 ? 'text-emerald-600' : value < 1800 ? 'text-amber-600' : 'text-rose-600';
      default:
        return 'text-gray-600';
    }
  };

  const getPassRateColor = (rate: number | null) => {
    if (rate === null) return 'gray';
    if (rate >= 75) return 'emerald';
    if (rate >= 50) return 'yellow';
    return 'rose';
  };

  return (
    <Card>
      <Title>Core Web Vitals by Render Type ⚡</Title>
      <Text className="mb-6">Performance metrics comparison across different rendering strategies</Text>

      <Grid numItems={1} numItemsMd={2} numItemsLg={3} className="gap-6">
        {data.map((item) => (
          <Card key={item.render_category} className="bg-gray-50/50 dark:bg-gray-900/20 shadow-none border border-gray-200 dark:border-gray-800 p-4">
            <Flex justifyContent="between" alignItems="center" className="mb-2">
              <Title className="text-lg">{item.render_category}</Title>
              <Badge color={getPassRateColor(item.pass_rate)}>
                {item.pass_rate ?? 'N/A'}% pass
              </Badge>
            </Flex>

            <Text className="text-xs mb-4">{item.sample_count.toLocaleString()} samples</Text>

            <div className="space-y-3">
              {/* LCP */}
              <div>
                <Flex justifyContent="between" alignItems="center" className="mb-1">
                  <Text className="text-sm">LCP</Text>
                  <span className={`text-sm font-medium ${getStatusColor('lcp', item.avg_lcp)}`}>
                    {item.avg_lcp ? `${item.avg_lcp}ms` : 'N/A'}
                  </span>
                </Flex>
                <Text className="text-xs text-gray-400 dark:text-gray-500">
                  {item.lcp_good}/{item.sample_count} good (&lt;2.5s)
                </Text>
              </div>

              {/* CLS */}
              <div>
                <Flex justifyContent="between" alignItems="center" className="mb-1">
                  <Text className="text-sm">CLS</Text>
                  <span className={`text-sm font-medium ${getStatusColor('cls', item.avg_cls)}`}>
                    {item.avg_cls !== null ? Number(item.avg_cls).toFixed(3) : 'N/A'}
                  </span>
                </Flex>
                <Text className="text-xs text-gray-400 dark:text-gray-500">
                  {item.cls_good}/{item.sample_count} good (&lt;0.1)
                </Text>
              </div>

              {/* TTFB */}
              <div>
                <Flex justifyContent="between" alignItems="center" className="mb-1">
                  <Text className="text-sm">TTFB</Text>
                  <span className={`text-sm font-medium ${getStatusColor('ttfb', item.avg_ttfb)}`}>
                    {item.avg_ttfb ? `${item.avg_ttfb}ms` : 'N/A'}
                  </span>
                </Flex>
                <Text className="text-xs text-gray-400 dark:text-gray-500">
                  {item.ttfb_good}/{item.sample_count} good (&lt;800ms)
                </Text>
              </div>

              {/* FID (if available) */}
              {item.avg_fid !== null && (
                <div>
                  <Flex justifyContent="between" alignItems="center" className="mb-1">
                    <Text className="text-sm">FID</Text>
                    <span className={`text-sm font-medium ${getStatusColor('fid', item.avg_fid)}`}>
                      {item.avg_fid}ms
                    </span>
                  </Flex>
                  <Text className="text-xs text-gray-400 dark:text-gray-500">
                    {item.fid_good}/{item.sample_count} good (&lt;100ms)
                  </Text>
                </div>
              )}
            </div>
          </Card>
        ))}
      </Grid>

      <div className="mt-6 p-4 bg-blue-50/50 dark:bg-blue-900/10 rounded-lg border border-blue-100 dark:border-blue-900/30">
        <Text className="text-sm text-blue-800 dark:text-blue-200">
          <strong>Core Web Vitals:</strong> LCP (Loading), CLS (Stability), FID (Interactivity), TTFB (Server Speed).
        </Text>
      </div>
    </Card>
  );
}
