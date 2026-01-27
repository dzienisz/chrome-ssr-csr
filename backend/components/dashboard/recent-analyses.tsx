'use client';

import { useState, useEffect, useRef } from 'react';
import { Card, Title, Text } from '@tremor/react';
import { AnalysisDetailModal } from './analysis-detail-modal';

interface Analysis {
  id: number;
  timestamp: string;
  domain: string;
  render_type: string;
  confidence: number;
  frameworks: string[];
  // Include all other potential fields for the modal
  tech_stack?: any;
  core_web_vitals?: any;
  hydration_stats?: any;
  navigation_stats?: any;
  platform?: any;
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

  const handleRowClick = (analysis: Analysis) => {
    setSelectedAnalysis(analysis);
    setIsModalOpen(true);
  };

  const handleDelete = async (e: React.MouseEvent, id: number) => {
    e.stopPropagation(); // Don't open modal
    if (!onDelete) return;
    
    if (confirm('Are you sure you want to remove this analysis?')) {
      try {
        setDeletingId(id);
        await onDelete(id);
      } catch (err) {
        alert('Failed to delete analysis');
      } finally {
        setDeletingId(null);
      }
    }
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
        
        {/* Fixed height container for scrollable table */}
        <div className="overflow-x-auto max-h-[600px] overflow-y-auto relative">
          <table className="w-full">
            <thead className="sticky top-0 bg-white z-10 shadow-sm">
              <tr className="border-b border-gray-200">
                <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider py-3 px-2">Time</th>
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
                  <td className="py-3 px-2 text-right">
                    <button
                      onClick={(e) => handleDelete(e, analysis.id)}
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
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          
          {/* Intersection Target */}
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
            <Text className="text-xs text-gray-400">Click on any row to view full details · Hover to delete · Scroll for more</Text>
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
