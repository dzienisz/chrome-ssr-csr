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
        <div className="mt-6 flex items-center justify-center h-40">
          <Text className="text-gray-500">No data yet</Text>
        </div>
      </Card>
    );
  }

  const chartData = [
    { name: 'SSR', value: ssrCount },
    { name: 'CSR', value: csrCount },
    { name: 'Hybrid', value: hybridCount },
  ].filter(item => item.value > 0);

  return (
    <Card className="bg-white">
      <Title>Render Type Distribution</Title>
      <DonutChart
        className="mt-6 h-48"
        data={chartData}
        category="value"
        index="name"
        colors={['emerald', 'rose', 'amber']}
        showAnimation={true}
        showLabel={true}
        valueFormatter={(value) => `${value} (${Math.round(value/total*100)}%)`}
      />
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
