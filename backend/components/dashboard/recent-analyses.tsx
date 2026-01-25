'use client';

import { Card, Title, Table, TableHead, TableRow, TableHeaderCell, TableBody, TableCell, Badge } from '@tremor/react';

interface Analysis {
  id: number;
  timestamp: string;
  domain: string;
  render_type: string;
  confidence: number;
  frameworks: string[];
}

export function RecentAnalyses({ data }: { data: Analysis[] }) {
  const getTypeColor = (type: string) => {
    if (type.includes('SSR')) return 'green';
    if (type.includes('CSR')) return 'red';
    return 'yellow';
  };

  return (
    <Card>
      <Title>Recent Analyses</Title>
      <Table className="mt-6">
        <TableHead>
          <TableRow>
            <TableHeaderCell>Time</TableHeaderCell>
            <TableHeaderCell>Domain</TableHeaderCell>
            <TableHeaderCell>Type</TableHeaderCell>
            <TableHeaderCell>Confidence</TableHeaderCell>
            <TableHeaderCell>Frameworks</TableHeaderCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {data.slice(0, 20).map((analysis) => (
            <TableRow key={analysis.id}>
              <TableCell>
                {new Date(analysis.timestamp).toLocaleString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </TableCell>
              <TableCell className="truncate max-w-xs">{analysis.domain}</TableCell>
              <TableCell>
                <Badge color={getTypeColor(analysis.render_type)}>
                  {analysis.render_type}
                </Badge>
              </TableCell>
              <TableCell>{analysis.confidence}%</TableCell>
              <TableCell className="truncate max-w-xs">
                {Array.isArray(analysis.frameworks)
                  ? analysis.frameworks.join(', ') || 'None'
                  : 'None'}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Card>
  );
}
