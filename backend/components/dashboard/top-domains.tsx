'use client';

import { Card, Title, Text } from '@tremor/react';

interface DomainData {
  domain: string;
  count: number;
  avg_confidence: number;
  most_common_type: string;
}

export function TopDomains({ data }: { data: DomainData[] }) {
  if (!data || data.length === 0) {
    return (
      <Card className="bg-white h-full">
        <Title>Top Analyzed Domains</Title>
        <div className="mt-6 flex items-center justify-center h-40">
          <Text className="text-gray-500">No domains analyzed yet</Text>
        </div>
      </Card>
    );
  }

  const getTypeColor = (type: string) => {
    if (type?.includes('SSR')) return 'bg-emerald-100 text-emerald-700';
    if (type?.includes('CSR')) return 'bg-rose-100 text-rose-700';
    return 'bg-amber-100 text-amber-700';
  };

  const getTypeLabel = (type: string) => {
    if (type?.includes('SSR')) return 'SSR';
    if (type?.includes('CSR')) return 'CSR';
    return 'Hybrid';
  };

  return (
    <Card className="bg-white h-full">
      <Title>Top Analyzed Domains</Title>
      <div className="mt-4 space-y-3">
        {data.slice(0, 8).map((item, index) => (
          <div
            key={item.domain}
            className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <div className="flex items-center gap-3">
              <span className="text-gray-400 font-mono text-sm w-5">{index + 1}</span>
              <div>
                <p className="font-medium text-gray-900 text-sm truncate max-w-[150px]">
                  {item.domain}
                </p>
                <p className="text-xs text-gray-500">{item.count} analyses</p>
              </div>
            </div>
            <span className={`px-2 py-1 rounded text-xs font-medium ${getTypeColor(item.most_common_type)}`}>
              {getTypeLabel(item.most_common_type)}
            </span>
          </div>
        ))}
      </div>
    </Card>
  );
}
