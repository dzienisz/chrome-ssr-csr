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
    <Card className="max-w-sm mx-auto">
      <Flex justifyContent="between" alignItems="center">
        <Text>{title}</Text>
        {delta && <BadgeDelta deltaType={deltaType}>{delta}</BadgeDelta>}
      </Flex>
      <Metric className="mt-2">{metric}</Metric>
    </Card>
  );
}
