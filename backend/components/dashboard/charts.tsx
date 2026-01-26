'use client';

import { Card, Title, BarChart, DonutChart, AreaChart, Text } from '@tremor/react';

interface Framework {
  framework: string;
  count: number;
}

interface TimelineData {
  date: string;
  count: number;
  ssr_count: number;
  csr_count: number;
  hybrid_count: number;
}

export function FrameworkChart({ data }: { data: Framework[] }) {
  if (!data || data.length === 0) {
    return (
      <Card className="bg-white">
        <Title>Top Frameworks Detected</Title>
        <div className="mt-6 flex items-center justify-center h-40">
          <Text className="text-gray-500">No frameworks detected yet</Text>
        </div>
      </Card>
    );
  }

  const chartData = data.map(item => ({
    name: item.framework || 'Unknown',
    'Detections': parseInt(item.count?.toString()) || 0,
  }));

  return (
    <Card className="bg-white">
      <Title>Top Frameworks Detected</Title>
      <BarChart
        className="mt-6 h-48"
        data={chartData}
        index="name"
        categories={['Detections']}
        colors={['indigo']}
        yAxisWidth={40}
        showAnimation={true}
      />
    </Card>
  );
}

export function RenderTypeDistribution({ data }: { data: any }) {
  const ssrCount = parseInt(data?.ssr_count) || 0;
  const csrCount = parseInt(data?.csr_count) || 0;
  const hybridCount = parseInt(data?.hybrid_count) || 0;
  const total = ssrCount + csrCount + hybridCount;

  if (total === 0) {
    return (
      <Card className="bg-white">
        <Title>Render Type Distribution</Title>
        <div className="mt-6 flex items-center justify-center h-48">
          <Text className="text-gray-500">No data yet</Text>
        </div>
      </Card>
    );
  }

  const ssrPercent = Math.round((ssrCount / total) * 100);
  const csrPercent = Math.round((csrCount / total) * 100);
  const hybridPercent = Math.round((hybridCount / total) * 100);

  return (
    <Card className="bg-white">
      <Title>Render Type Distribution</Title>
      <div className="mt-6 space-y-4">
        {/* SSR */}
        {ssrCount > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#10b981' }}></div>
                <span className="text-sm font-medium text-gray-700">SSR</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold" style={{ color: '#059669' }}>{ssrPercent}%</span>
                <span className="text-xs text-gray-400">({ssrCount})</span>
              </div>
            </div>
            <div className="w-full rounded-full h-3" style={{ backgroundColor: '#e5e7eb' }}>
              <div
                className="h-3 rounded-full transition-all duration-500"
                style={{ width: `${ssrPercent}%`, backgroundColor: '#10b981' }}
              ></div>
            </div>
          </div>
        )}

        {/* CSR */}
        {csrCount > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#f43f5e' }}></div>
                <span className="text-sm font-medium text-gray-700">CSR</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold" style={{ color: '#e11d48' }}>{csrPercent}%</span>
                <span className="text-xs text-gray-400">({csrCount})</span>
              </div>
            </div>
            <div className="w-full rounded-full h-3" style={{ backgroundColor: '#e5e7eb' }}>
              <div
                className="h-3 rounded-full transition-all duration-500"
                style={{ width: `${csrPercent}%`, backgroundColor: '#f43f5e' }}
              ></div>
            </div>
          </div>
        )}

        {/* Hybrid */}
        {hybridCount > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#f59e0b' }}></div>
                <span className="text-sm font-medium text-gray-700">Hybrid</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold" style={{ color: '#d97706' }}>{hybridPercent}%</span>
                <span className="text-xs text-gray-400">({hybridCount})</span>
              </div>
            </div>
            <div className="w-full rounded-full h-3" style={{ backgroundColor: '#e5e7eb' }}>
              <div
                className="h-3 rounded-full transition-all duration-500"
                style={{ width: `${hybridPercent}%`, backgroundColor: '#f59e0b' }}
              ></div>
            </div>
          </div>
        )}
      </div>

      {/* Summary */}
      <div className="mt-6 pt-4 border-t border-gray-100">
        <div className="flex justify-between text-sm">
          <span className="text-gray-500">Total Analyses</span>
          <span className="font-semibold text-gray-900">{total}</span>
        </div>
      </div>
    </Card>
  );
}

export function TimelineChart({ data }: { data: TimelineData[] }) {
  if (!data || data.length === 0) {
    return (
      <Card className="bg-white">
        <Title>Analyses Over Time</Title>
        <div className="mt-6 flex items-center justify-center h-40">
          <Text className="text-gray-500">No timeline data yet. Analyze more pages!</Text>
        </div>
      </Card>
    );
  }

  // Sort by date ascending and format
  const sortedData = [...data].sort((a, b) =>
    new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  const chartData = sortedData.map(item => ({
    date: new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    'Total': parseInt(item.count?.toString()) || 0,
    'SSR': parseInt(item.ssr_count?.toString()) || 0,
    'CSR': parseInt(item.csr_count?.toString()) || 0,
    'Hybrid': parseInt(item.hybrid_count?.toString()) || 0,
  }));

  return (
    <Card className="bg-white">
      <Title>Analyses Over Time</Title>
      <AreaChart
        className="mt-6 h-48"
        data={chartData}
        index="date"
        categories={['Total', 'SSR', 'CSR', 'Hybrid']}
        colors={['blue', 'emerald', 'rose', 'amber']}
        yAxisWidth={40}
        showAnimation={true}
        curveType="monotone"
      />
    </Card>
  );
}
