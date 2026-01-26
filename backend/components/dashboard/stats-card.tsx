'use client';

import { Card, Metric, Text, Flex, BadgeDelta, DeltaType } from '@tremor/react';

interface StatsCardProps {
  title: string;
  metric: string | number;
  delta?: string;
  deltaType?: DeltaType;
}

export function StatsCard({ title, metric, delta, deltaType }: StatsCardProps) {
  return (
    <Card className="bg-white">
      <Flex justifyContent="between" alignItems="center">
        <Text className="text-gray-600">{title}</Text>
        {delta && <BadgeDelta deltaType={deltaType}>{delta}</BadgeDelta>}
      </Flex>
      <Metric className="mt-2 text-gray-900">{metric}</Metric>
    </Card>
  );
}
