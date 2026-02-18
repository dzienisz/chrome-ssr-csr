'use client';

import { useState, useEffect, useRef } from 'react';
import { Card, Title, Text } from '@tremor/react';
import { AnalysisDetailModal } from './analysis-detail-modal';

interface Analysis {
  id: number;
  timestamp: string;
  url?: string;
  domain: string;
  render_type: string;
  confidence: number;
  frameworks: string[];
  tech_stack?: Record<string, string | string[] | null>;
  core_web_vitals?: {
    lcp?: number | null;
    cls?: number | null;
    fid?: number | null;
    ttfb?: number | null;
  };
  hydration_stats?: {
    score?: number;
    errorCount?: number;
  };
  navigation_stats?: {
    isSPA?: boolean;
    clientRoutes?: number;
  };
  seo_accessibility?: {
    title?: string | null;
  };
  device_info?: {
    country?: string | null;
  };
}

export function RecentAnalyses({
  data,
  onDelete,
  onLoadMore,
  hasMore,
  isLoadingMore
}: {
  data: Analysis[];
  onDelete?: (id: number) => Promise<void>;
  onLoadMore?: () => void;
  hasMore?: boolean;
  isLoadingMore?: boolean;
}) {
  const [selectedAnalysis, setSelectedAnalysis] = useState<Analysis | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [confirmingId, setConfirmingId] = useState<number | null>(null);
  const [deleteErrorId, setDeleteErrorId] = useState<number | null>(null);

  const observerTarget = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      entries => {
        if (entries[0].isIntersecting && hasMore && !isLoadingMore && onLoadMore) {
          onLoadMore();
        }
      },
      { threshold: 1.0 }
    );

    if (observerTarget.current) {
      observer.observe(observerTarget.current);
    }

    return () => {
      if (observerTarget.current) {
        observer.unobserve(observerTarget.current);
      }
    };
  }, [hasMore, isLoadingMore, onLoadMore]);

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

  const getFlag = (code?: string | null): string => {
    if (!code || code.length !== 2) return '';
    return String.fromCodePoint(
      0x1F1E6 + code.charCodeAt(0) - 65,
      0x1F1E6 + code.charCodeAt(1) - 65,
    );
  };

  const handleRowClick = (analysis: Analysis) => {
    setSelectedAnalysis(analysis);
    setIsModalOpen(true);
  };

  const handleDeleteClick = (e: React.MouseEvent, id: number) => {
    e.stopPropagation();
    setConfirmingId(id);
    setDeleteErrorId(null);
  };

  const handleDeleteConfirm = async (e: React.MouseEvent, id: number) => {
    e.stopPropagation();
    if (!onDelete) return;
    try {
      setDeletingId(id);
      setConfirmingId(null);
      await onDelete(id);
      if (selectedAnalysis?.id === id) {
        setIsModalOpen(false);
      }
    } catch {
      setDeleteErrorId(id);
    } finally {
      setDeletingId(null);
    }
  };

  const handleDeleteCancel = (e: React.MouseEvent) => {
    e.stopPropagation();
    setConfirmingId(null);
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
    <>
      <Card className="bg-white">
        <div className="flex items-center justify-between mb-4">
          <Title>Recent Analyses</Title>
          <span className="text-sm text-gray-500">{data.length} loaded</span>
        </div>

        <div className="overflow-x-auto max-h-[600px] overflow-y-auto relative">
          <table className="w-full">
            <thead className="sticky top-0 bg-white z-10 shadow-sm">
              <tr className="border-b border-gray-200">
                <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider py-3 px-2">Time</th>
                <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider py-3 px-2 w-8"></th>
                <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider py-3 px-2">Domain</th>
                <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider py-3 px-2">Type</th>
                <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider py-3 px-2">Conf.</th>
                <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider py-3 px-2">Frameworks</th>
                <th className="text-right text-xs font-medium text-gray-500 uppercase tracking-wider py-3 px-2">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {data.map((analysis) => (
                <tr
                  key={analysis.id}
                  className="hover:bg-gray-50 transition-colors cursor-pointer group"
                  onClick={() => handleRowClick(analysis)}
                >
                  <td className="py-3 px-2 text-sm text-gray-500 whitespace-nowrap">
                    {new Date(analysis.timestamp).toLocaleString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </td>
                  <td className="py-3 px-2 text-center" title={analysis.device_info?.country || undefined}>
                    <span className="text-base leading-none" aria-label={analysis.device_info?.country || undefined}>
                      {getFlag(analysis.device_info?.country) || <span className="text-xs text-gray-300">—</span>}
                    </span>
                  </td>
                  <td className="py-3 px-2">
                    <span className="text-sm font-medium text-gray-900 truncate block max-w-[180px]">
                      {analysis.domain}
                    </span>
                    {analysis.seo_accessibility?.title && (
                      <span className="text-xs text-gray-400 truncate block max-w-[180px]">
                        {analysis.seo_accessibility.title}
                      </span>
                    )}
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
                  <td className="py-3 px-2 text-right">
                    {deleteErrorId === analysis.id ? (
                      <div className="flex items-center justify-end gap-1" onClick={e => e.stopPropagation()}>
                        <span className="text-xs text-red-500">Failed</span>
                        <button
                          onClick={e => { e.stopPropagation(); setDeleteErrorId(null); }}
                          className="text-xs text-gray-400 hover:text-gray-600 px-1"
                        >
                          ✕
                        </button>
                      </div>
                    ) : confirmingId === analysis.id ? (
                      <div className="flex items-center justify-end gap-1" onClick={e => e.stopPropagation()}>
                        <span className="text-xs text-gray-500">Delete?</span>
                        <button
                          onClick={e => handleDeleteConfirm(e, analysis.id)}
                          className="text-xs px-2 py-0.5 bg-red-100 text-red-700 rounded hover:bg-red-200 transition-colors"
                        >
                          Yes
                        </button>
                        <button
                          onClick={handleDeleteCancel}
                          className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded hover:bg-gray-200 transition-colors"
                        >
                          No
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={(e) => handleDeleteClick(e, analysis.id)}
                        disabled={deletingId === analysis.id}
                        className="text-gray-400 hover:text-red-600 transition-colors opacity-0 group-hover:opacity-100 p-1"
                        title="Delete Analysis"
                      >
                        {deletingId === analysis.id ? (
                          <span className="animate-spin inline-block">⏳</span>
                        ) : (
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        )}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div ref={observerTarget} className="h-10 flex items-center justify-center w-full">
            {isLoadingMore && (
              <div className="flex items-center gap-2 text-gray-400">
                <span className="animate-spin text-xl">⏳</span>
                <Text className="text-xs">Loading more...</Text>
              </div>
            )}
            {!hasMore && data.length > 0 && (
              <Text className="text-xs text-gray-400">No more analyses to load</Text>
            )}
          </div>
        </div>

        <div className="mt-4 text-center">
          <Text className="text-xs text-gray-400">Click any row to view details · Hover to delete · Scroll for more</Text>
        </div>
      </Card>

      <AnalysisDetailModal
        analysis={selectedAnalysis}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </>
  );
}
