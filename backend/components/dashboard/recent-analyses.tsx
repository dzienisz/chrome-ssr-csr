'use client';

import { Card, Title, Text } from '@tremor/react';

interface Analysis {
  id: number;
  timestamp: string;
  domain: string;
  render_type: string;
  confidence: number;
  frameworks: string[];
}

export function RecentAnalyses({ data }: { data: Analysis[] }) {
  const getTypeStyle = (type: string) => {
    if (type?.includes('SSR')) return 'bg-emerald-100 text-emerald-700 border-emerald-200';
    if (type?.includes('CSR')) return 'bg-rose-100 text-rose-700 border-rose-200';
    return 'bg-amber-100 text-amber-700 border-amber-200';
  };

  const getTypeLabel = (type: string) => {
    if (type?.includes('Server-Side')) return 'SSR';
    if (type?.includes('Client-Side')) return 'CSR';
    if (type?.includes('Hybrid')) return 'Hybrid';
    if (type?.includes('Likely SSR')) return 'SSR+';
    if (type?.includes('Likely CSR')) return 'CSR+';
    return type?.substring(0, 6) || 'Unknown';
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 80) return 'text-emerald-600';
    if (confidence >= 60) return 'text-amber-600';
    return 'text-rose-600';
  };

  if (!data || data.length === 0) {
    return (
      <Card className="bg-white">
        <Title>Recent Analyses</Title>
        <div className="mt-6 flex items-center justify-center h-40">
          <Text className="text-gray-500">No analyses yet. Start using the extension!</Text>
        </div>
      </Card>
    );
  }

  return (
    <Card className="bg-white">
      <div className="flex items-center justify-between mb-4">
        <Title>Recent Analyses</Title>
        <span className="text-sm text-gray-500">{data.length} entries</span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-200">
              <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider py-3 px-2">Time</th>
              <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider py-3 px-2">Domain</th>
              <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider py-3 px-2">Type</th>
              <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider py-3 px-2">Conf.</th>
              <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider py-3 px-2">Frameworks</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {data.slice(0, 15).map((analysis) => (
              <tr key={analysis.id} className="hover:bg-gray-50 transition-colors">
                <td className="py-3 px-2 text-sm text-gray-500 whitespace-nowrap">
                  {new Date(analysis.timestamp).toLocaleString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </td>
                <td className="py-3 px-2">
                  <span className="text-sm font-medium text-gray-900 truncate block max-w-[180px]">
                    {analysis.domain}
                  </span>
                </td>
                <td className="py-3 px-2">
                  <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-md border ${getTypeStyle(analysis.render_type)}`}>
                    {getTypeLabel(analysis.render_type)}
                  </span>
                </td>
                <td className="py-3 px-2">
                  <span className={`text-sm font-semibold ${getConfidenceColor(analysis.confidence)}`}>
                    {analysis.confidence}%
                  </span>
                </td>
                <td className="py-3 px-2">
                  <span className="text-sm text-gray-600 truncate block max-w-[120px]">
                    {Array.isArray(analysis.frameworks) && analysis.frameworks.length > 0
                      ? analysis.frameworks.join(', ')
                      : '—'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
