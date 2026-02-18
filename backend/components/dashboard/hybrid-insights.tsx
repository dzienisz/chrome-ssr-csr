'use client';

import { Card, Title, Text } from '@tremor/react';

export function HybridInsights({ data }: { data: any }) {
  const hybridCount = parseInt(data?.hybrid_count) || 0;
  const totalAnalyses = parseInt(data?.total_analyses) || 0;

  if (hybridCount === 0 || totalAnalyses === 0) {
    return (
      <Card className="bg-white">
        <Title>Hybrid/Islands Detection</Title>
        <div className="mt-6 flex items-center justify-center h-40">
          <Text className="text-gray-500">No hybrid architectures detected yet</Text>
        </div>
      </Card>
    );
  }

  const hybridPercentage = Math.round((hybridCount / totalAnalyses) * 100);

  return (
    <Card className="bg-white">
      <div className="flex items-center gap-2 mb-4">
        <span className="text-2xl">🔀</span>
        <div>
          <Title>Hybrid/Islands Detection</Title>
          <Text className="text-gray-500">Modern architecture patterns</Text>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 mt-6">
        <div className="text-center p-4 bg-gradient-to-br from-amber-50 to-orange-50 rounded-lg border border-amber-100">
          <p className="text-sm text-gray-600 mb-1">Hybrid Detected</p>
          <p className="text-3xl font-bold text-amber-600">{hybridCount}</p>
          <p className="text-xs text-gray-500 mt-1">{hybridPercentage}% of all analyses</p>
        </div>

        <div className="text-center p-4 bg-gradient-to-br from-purple-50 to-pink-50 rounded-lg border border-purple-100">
          <p className="text-sm text-gray-600 mb-1">Adoption Rate</p>
          <p className="text-3xl font-bold text-purple-600">{hybridPercentage}%</p>
          <p className="text-xs text-gray-500 mt-1">of total sites</p>
        </div>
      </div>

      <div className="mt-6 p-4 bg-gray-50 rounded-lg border border-gray-100">
        <p className="text-xs text-gray-500">
          Sites are classified as hybrid when both server-rendered content and client-side hydration markers are detected — for example, partial hydration patterns, islands architecture, or React Server Components alongside client components.
        </p>
      </div>
    </Card>
  );
}
