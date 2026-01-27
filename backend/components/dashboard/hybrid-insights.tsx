'use client';

import { Card, Title, Text } from '@tremor/react';

interface HybridInsights {
  total_hybrid: number;
  avg_hybrid_score: number;
  with_islands: number;
  frameworks_with_hybrid: { framework: string; count: number }[];
}

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
        {/* Hybrid Count */}
        <div className="text-center p-4 bg-gradient-to-br from-amber-50 to-orange-50 rounded-lg border border-amber-100">
          <p className="text-sm text-gray-600 mb-1">Hybrid Detected</p>
          <p className="text-3xl font-bold text-amber-600">{hybridCount}</p>
          <p className="text-xs text-gray-500 mt-1">{hybridPercentage}% of all analyses</p>
        </div>

        {/* Percentage Visual */}
        <div className="text-center p-4 bg-gradient-to-br from-purple-50 to-pink-50 rounded-lg border border-purple-100">
          <p className="text-sm text-gray-600 mb-1">Adoption Rate</p>
          <p className="text-3xl font-bold text-purple-600">{hybridPercentage}%</p>
          <p className="text-xs text-gray-500 mt-1">of total sites</p>
        </div>
      </div>

      {/* Hybrid Patterns Info */}
      <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-100">
        <p className="text-sm font-medium text-blue-900 mb-2">🏝️ Detected Patterns:</p>
        <ul className="text-xs text-blue-700 space-y-1">
          <li>• Astro Islands Architecture</li>
          <li>• React Server Components (RSC)</li>
          <li>• Partial Hydration (Qwik, etc.)</li>
          <li>• Streaming SSR with Suspense</li>
        </ul>
      </div>

      {/* Trend Indicator */}
      <div className="mt-4 flex items-center justify-between text-sm">
        <span className="text-gray-500">Trend</span>
        <div className="flex items-center gap-1">
          <span className="text-green-600">↗</span>
          <span className="text-gray-700 font-medium">Growing adoption</span>
        </div>
      </div>
    </Card>
  );
}
