'use client';

import { useState, useEffect, useCallback } from 'react';
import { FrameworkChart, RenderTypeDistribution, TimelineChart } from './charts';
import { RecentAnalyses } from './recent-analyses';
import { TopDomains } from './top-domains';
import { LastUpdated } from './last-updated';

interface DashboardData {
  total: any;
  frameworks: any[];
  domains: any[];
  timeline: any[];
  recent: any[];
  latestTime: string | null;
  contentComparison?: {
    avg_content_ratio: number | null;
    avg_hybrid_score: number | null;
    low_ratio_count: number;
    high_ratio_count: number;
    mid_ratio_count: number;
    hybrid_detected_count: number;
    total_with_metrics: number;
  };
}

interface LiveDashboardProps {
  initialData: DashboardData;
}

const REFRESH_INTERVAL = 30;

export function LiveDashboard({ initialData }: LiveDashboardProps) {
  const [data, setData] = useState<DashboardData>(initialData);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(REFRESH_INTERVAL);

  const fetchData = useCallback(async () => {
    try {
      setIsRefreshing(true);
      setError(null);
      const response = await fetch('/api/stats?type=all', {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache',
        },
      });
      if (response.ok) {
        const newData = await response.json();
        if (newData && newData.total) {
          setData(newData);
          setCountdown(REFRESH_INTERVAL); // Reset countdown after successful fetch
        } else {
          console.error('Invalid data structure:', newData);
          setError('Invalid data');
        }
      } else {
        setError(`HTTP ${response.status}`);
      }
    } catch (error) {
      console.error('Failed to fetch data:', error);
      setError('Network error');
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  // Countdown timer - ticks every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          fetchData();
          return REFRESH_INTERVAL;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [fetchData]);

  const totalAnalyses = parseInt(data.total?.total_analyses) || 0;
  const ssrCount = parseInt(data.total?.ssr_count) || 0;
  const csrCount = parseInt(data.total?.csr_count) || 0;
  const hybridCount = parseInt(data.total?.hybrid_count) || 0;
  const avgConfidence = parseFloat(data.total?.avg_confidence) || 0;

  return (
    <>
      {/* Header */}
      <div className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
                <span className="text-3xl">📊</span>
                SSR/CSR Analytics
                {isRefreshing && (
                  <span className="ml-2 text-sm font-normal text-gray-400">updating...</span>
                )}
              </h1>
              <p className="text-gray-500 mt-1">
                Chrome Extension Usage Dashboard
                {error ? (
                  <span className="ml-2 text-xs text-red-500">● Error: {error}</span>
                ) : isRefreshing ? (
                  <span className="ml-2 text-xs text-blue-500">● Refreshing...</span>
                ) : (
                  <span className="ml-2 text-xs text-emerald-600">● Live · {countdown}s</span>
                )}
              </p>
            </div>
            <LastUpdated timestamp={data.latestTime} />
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <span className="text-2xl">🔍</span>
              </div>
              <div>
                <p className="text-sm text-gray-500">Total Analyses</p>
                <p className="text-2xl font-bold text-gray-900">{totalAnalyses.toLocaleString()}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-emerald-100 rounded-lg">
                <span className="text-2xl">🖥️</span>
              </div>
              <div>
                <p className="text-sm text-gray-500">SSR Detected</p>
                <p className="text-2xl font-bold text-emerald-600">{ssrCount.toLocaleString()}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-rose-100 rounded-lg">
                <span className="text-2xl">⚡</span>
              </div>
              <div>
                <p className="text-sm text-gray-500">CSR Detected</p>
                <p className="text-2xl font-bold text-rose-600">{csrCount.toLocaleString()}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-100 rounded-lg">
                <span className="text-2xl">🔀</span>
              </div>
              <div>
                <p className="text-sm text-gray-500">Hybrid</p>
                <p className="text-2xl font-bold text-amber-600">{hybridCount.toLocaleString()}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <span className="text-2xl">🎯</span>
              </div>
              <div>
                <p className="text-sm text-gray-500">Avg Confidence</p>
                <p className="text-2xl font-bold text-purple-600">{avgConfidence.toFixed(1)}%</p>
              </div>
            </div>
          </div>
        </div>

        {/* Content Comparison Stats (v3.2.0+ metrics) */}
        {data.contentComparison && data.contentComparison.total_with_metrics > 0 && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <span>📄</span> Content Comparison Analysis
                <span className="text-xs font-normal text-gray-400">(v3.2.0+ data)</span>
              </h3>
              <div className="text-sm text-gray-500">
                <span className="font-medium text-gray-900">{data.contentComparison.total_with_metrics}</span> samples
              </div>
            </div>

            {/* Key Metrics Row */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
              <div className="text-center p-4 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg border border-blue-100">
                <p className="text-sm text-gray-600 mb-1">Avg Content Ratio</p>
                <p className="text-2xl font-bold text-blue-700">
                  {data.contentComparison.avg_content_ratio
                    ? `${(data.contentComparison.avg_content_ratio * 100).toFixed(1)}%`
                    : 'N/A'}
                </p>
                <p className="text-xs text-gray-500 mt-1">Raw / Rendered</p>
              </div>
              <div className="text-center p-4 bg-gradient-to-br from-purple-50 to-pink-50 rounded-lg border border-purple-100">
                <p className="text-sm text-gray-600 mb-1">Avg Hybrid Score</p>
                <p className="text-2xl font-bold text-purple-700">
                  {data.contentComparison.avg_hybrid_score
                    ? `${(data.contentComparison.avg_hybrid_score * 100).toFixed(1)}%`
                    : '0%'}
                </p>
                <p className="text-xs text-gray-500 mt-1">Islands detection</p>
              </div>
              <div className="text-center p-4 bg-emerald-50 rounded-lg border border-emerald-100">
                <p className="text-sm text-gray-600 mb-1">High Ratio (SSR)</p>
                <p className="text-2xl font-bold text-emerald-600">
                  {data.contentComparison.high_ratio_count}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  {data.contentComparison.total_with_metrics > 0
                    ? `${Math.round((data.contentComparison.high_ratio_count / data.contentComparison.total_with_metrics) * 100)}%`
                    : '0%'} of samples
                </p>
              </div>
              <div className="text-center p-4 bg-rose-50 rounded-lg border border-rose-100">
                <p className="text-sm text-gray-600 mb-1">Low Ratio (CSR)</p>
                <p className="text-2xl font-bold text-rose-600">
                  {data.contentComparison.low_ratio_count}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  {data.contentComparison.total_with_metrics > 0
                    ? `${Math.round((data.contentComparison.low_ratio_count / data.contentComparison.total_with_metrics) * 100)}%`
                    : '0%'} of samples
                </p>
              </div>
              <div className="text-center p-4 bg-amber-50 rounded-lg border border-amber-100">
                <p className="text-sm text-gray-600 mb-1">Hybrid Detected</p>
                <p className="text-2xl font-bold text-amber-600">
                  {data.contentComparison.hybrid_detected_count}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  {data.contentComparison.total_with_metrics > 0
                    ? `${Math.round((data.contentComparison.hybrid_detected_count / data.contentComparison.total_with_metrics) * 100)}%`
                    : '0%'} of samples
                </p>
              </div>
            </div>

            {/* Distribution Visualization */}
            <div className="space-y-3">
              <p className="text-sm font-medium text-gray-700">Content Ratio Distribution</p>
              <div className="flex items-center gap-2">
                <div className="flex-1 flex h-8 rounded-lg overflow-hidden border border-gray-200">
                  {data.contentComparison.high_ratio_count > 0 && (
                    <div
                      className="bg-emerald-500 flex items-center justify-center text-xs font-medium text-white transition-all duration-500"
                      style={{
                        width: `${(data.contentComparison.high_ratio_count / data.contentComparison.total_with_metrics) * 100}%`
                      }}
                      title={`SSR: ${data.contentComparison.high_ratio_count} (${Math.round((data.contentComparison.high_ratio_count / data.contentComparison.total_with_metrics) * 100)}%)`}
                    >
                      {data.contentComparison.high_ratio_count > 0 && (
                        <span className="px-2">SSR</span>
                      )}
                    </div>
                  )}
                  {data.contentComparison.mid_ratio_count > 0 && (
                    <div
                      className="bg-blue-500 flex items-center justify-center text-xs font-medium text-white transition-all duration-500"
                      style={{
                        width: `${(data.contentComparison.mid_ratio_count / data.contentComparison.total_with_metrics) * 100}%`
                      }}
                      title={`Mixed: ${data.contentComparison.mid_ratio_count} (${Math.round((data.contentComparison.mid_ratio_count / data.contentComparison.total_with_metrics) * 100)}%)`}
                    >
                      {data.contentComparison.mid_ratio_count > 0 && (
                        <span className="px-2">Mixed</span>
                      )}
                    </div>
                  )}
                  {data.contentComparison.low_ratio_count > 0 && (
                    <div
                      className="bg-rose-500 flex items-center justify-center text-xs font-medium text-white transition-all duration-500"
                      style={{
                        width: `${(data.contentComparison.low_ratio_count / data.contentComparison.total_with_metrics) * 100}%`
                      }}
                      title={`CSR: ${data.contentComparison.low_ratio_count} (${Math.round((data.contentComparison.low_ratio_count / data.contentComparison.total_with_metrics) * 100)}%)`}
                    >
                      {data.contentComparison.low_ratio_count > 0 && (
                        <span className="px-2">CSR</span>
                      )}
                    </div>
                  )}
                </div>
              </div>
              <div className="flex items-center justify-between text-xs text-gray-500">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded bg-emerald-500"></div>
                  <span>High (&gt;70%)</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded bg-blue-500"></div>
                  <span>Medium (20-70%)</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded bg-rose-500"></div>
                  <span>Low (&lt;20%)</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Charts Row 1 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <RenderTypeDistribution data={data.total} />
          <FrameworkChart data={data.frameworks || []} />
        </div>

        {/* Timeline Chart */}
        <div className="mb-6">
          <TimelineChart data={data.timeline || []} />
        </div>

        {/* Bottom Row: Top Domains + Recent Analyses */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1">
            <TopDomains data={data.domains || []} />
          </div>
          <div className="lg:col-span-2">
            <RecentAnalyses data={data.recent || []} />
          </div>
        </div>

        {/* Footer */}
        <div className="mt-8 text-center text-sm text-gray-400">
          <p>SSR/CSR Detector Analytics • Data is anonymized • Auto-refreshes every 30s</p>
          <p className="mt-2">
            Dashboard v1.1.0 •
            <a href="https://github.com/dzienisz/chrome-ssr-csr/blob/main/backend/CHANGELOG.md"
               target="_blank"
               rel="noopener noreferrer"
               className="text-indigo-500 hover:text-indigo-600 ml-1">
              Changelog
            </a>
          </p>
        </div>
      </div>
    </>
  );
}
