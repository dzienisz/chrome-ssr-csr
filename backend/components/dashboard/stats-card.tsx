'use client';

import { Card, Metric, Text, Flex } from '@tremor/react';

interface StatsCardProps {
  title: string;
  metric: string;
  icon: string;
  color: string;
}

export function StatsCard({ title, metric, icon, color }: StatsCardProps) {
  // Map color names to Tailwind background classes for the icon container
  const colorMap: Record<string, string> = {
    blue: 'bg-blue-100 text-blue-600',
    emerald: 'bg-emerald-100 text-emerald-600',
    rose: 'bg-rose-100 text-rose-600',
    amber: 'bg-amber-100 text-amber-600',
    purple: 'bg-purple-100 text-purple-600',
  };

  const textColorMap: Record<string, string> = {
    blue: 'text-gray-900',
    emerald: 'text-emerald-600',
    rose: 'text-rose-600',
    amber: 'text-amber-600',
    purple: 'text-purple-600',
  };

  return (
    <Card className="mx-auto" decoration="top" decorationColor={color}>
      <Flex justifyContent="start" alignItems="center" className="space-x-4">
        <div className={`p-2 rounded-lg ${colorMap[color] || 'bg-gray-100'}`}>
          <span className="text-2xl">{icon}</span>
        </div>
        <div>
          <Text>{title}</Text>
          <Metric className={textColorMap[color] || 'text-gray-900'}>{metric}</Metric>
        </div>
      </Flex>
    </Card>
  );
}
