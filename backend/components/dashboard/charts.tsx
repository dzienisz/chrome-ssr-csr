'use client';

import { Card, Title, BarChart, DonutChart, AreaChart } from '@tremor/react';

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
  const chartData = data.map(item => ({
    name: item.framework,
    'Detections': item.count,
  }));

  return (
    <Card>
      <Title>Top Frameworks Detected</Title>
      <BarChart
        className="mt-6"
        data={chartData}
        index="name"
        categories={['Detections']}
        colors={['blue']}
        yAxisWidth={48}
      />
    </Card>
  );
}

export function RenderTypeDistribution({ data }: { data: any }) {
  const chartData = [
    {
      name: 'SSR',
      value: parseInt(data.ssr_count) || 0,
    },
    {
      name: 'CSR',
      value: parseInt(data.csr_count) || 0,
    },
    {
      name: 'Hybrid',
      value: parseInt(data.hybrid_count) || 0,
    },
  ];

  return (
    <Card>
      <Title>Render Type Distribution</Title>
      <DonutChart
        className="mt-6"
        data={chartData}
        category="value"
        index="name"
        colors={['green', 'red', 'yellow']}
      />
    </Card>
  );
}

export function TimelineChart({ data }: { data: TimelineData[] }) {
  const chartData = data.reverse().map(item => ({
    date: new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    'Total': parseInt(item.count.toString()),
    'SSR': parseInt(item.ssr_count.toString()),
    'CSR': parseInt(item.csr_count.toString()),
    'Hybrid': parseInt(item.hybrid_count.toString()),
  }));

  return (
    <Card>
      <Title>Analyses Over Time</Title>
      <AreaChart
        className="mt-6"
        data={chartData}
        index="date"
        categories={['Total', 'SSR', 'CSR', 'Hybrid']}
        colors={['blue', 'green', 'red', 'yellow']}
        yAxisWidth={48}
      />
    </Card>
  );
}
