'use client';

import { useState, useEffect, useCallback } from 'react';
import { FrameworkChart, RenderTypeDistribution, TimelineChart } from './charts';
import { RecentAnalyses } from './recent-analyses';
import { TopDomains } from './top-domains';
import { LastUpdated } from './last-updated';
import { PlatformBreakdown } from './platform-breakdown';
import { HybridInsights } from './hybrid-insights';
import { TechStackTrends } from './tech-stack-trends';
import { SEOInsights } from './seo-insights';
import { StatsCard } from './stats-card';

interface TotalStats {
  total_analyses: string | number;
  ssr_count: string | number;
  csr_count: string | number;
  hybrid_count: string | number;
  avg_confidence: string | number;
}

interface FrameworkData {
  framework: string;
  count: number;
}

interface DomainData {
  domain: string;
  count: number;
  avg_confidence: number;
  most_common_type: string;
}

interface TimelineData {
  date: string;
  count: number;
  ssr_count: number;
  csr_count: number;
  hybrid_count: number;
}

interface RecentAnalysis {
  id: number;
  domain: string;
  render_type: string;
  confidence: number;
  timestamp: string;
  frameworks: string[];
  core_web_vitals?: Record<string, number | null>;
  tech_stack?: Record<string, string | string[] | null>;
  hydration_stats?: { score?: number; errorCount?: number };
  navigation_stats?: { isSPA?: boolean; clientRoutes?: number };
}

interface TechStackStats {
  cssFrameworks: Record<string, number>;
  buildTools: Record<string, number>;
  hosting: Record<string, number>;
}

interface SEOStats {
  metaTags: {
    hasDescription: number;
    hasOGTags: number;
    hasTwitterCard: number;
  };
  accessibility: {
    hasAltText: number;
    hasAriaLabels: number;
    hasLandmarks: number;
  };
  totalAnalyzed: number;
}

export interface DashboardData {
  total: TotalStats;
  frameworks: FrameworkData[];
  domains: DomainData[];
  timeline: TimelineData[];
  recent: RecentAnalysis[];
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
  techStack?: TechStackStats;
  seoStats?: SEOStats;
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
  
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(initialData.recent.length >= 20);

  const fetchData = useCallback(async () => {
    try {
      setIsRefreshing(true);
      setError(null);

      const res = await fetch('/api/stats?type=all', { headers: { 'Cache-Control': 'no-cache' } });

      if (res.ok) {
        const newData = await res.json();
        if (newData && newData.total) {
          setData(prev => ({
            ...newData,
            techStack: newData.techStack || prev.techStack,
            seoStats: newData.seoStats || prev.seoStats,
          }));
          setHasMore(newData.recent.length >= 20);
          setCountdown(REFRESH_INTERVAL);
        } else {
          console.error('Invalid data structure:', newData);
          setError('Invalid data');
        }
      } else {
        setError(`HTTP ${res.status}`);
      }
    } catch (error) {
      console.error('Failed to fetch data:', error);
      setCountdown(REFRESH_INTERVAL);
      setError('Network error');
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  const loadMore = async () => {
    if (isLoadingMore || !hasMore) return;
    
    try {
      setIsLoadingMore(true);
      const res = await fetch(`/api/stats?type=recent&limit=20&offset=${data.recent.length}`);
      if (res.ok) {
        const newRecent = await res.json();
        if (newRecent.length < 20) {
          setHasMore(false);
        }
        setData(prev => ({
          ...prev,
          recent: [...prev.recent, ...newRecent]
        }));
      }
    } catch (err) {
      console.error('Failed to load more:', err);
    } finally {
      setIsLoadingMore(false);
    }
  };

  const handleDeleteAnalysis = async (id: number) => {
    try {
      const res = await fetch(`/api/analyze/${id}`, {
        method: 'DELETE',
        headers: {
          'Cache-Control': 'no-cache',
        },
      });

      if (!res.ok) {
        throw new Error('Failed to delete');
      }

      // Update local state immediately for snappy UI
      setData(prev => ({
        ...prev,
        recent: prev.recent.filter(a => a.id !== id),
        total: {
          ...prev.total,
          total_analyses: parseInt(String(prev.total.total_analyses)) - 1
        }
      }));
    } catch (err) {
      console.error('Delete error:', err);
      throw err;
    }
  };

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

  const totalAnalyses = parseInt(String(data.total?.total_analyses ?? 0)) || 0;
  const ssrCount = parseInt(String(data.total?.ssr_count ?? 0)) || 0;
  const csrCount = parseInt(String(data.total?.csr_count ?? 0)) || 0;
  const hybridCount = parseInt(String(data.total?.hybrid_count ?? 0)) || 0;
  const avgConfidence = parseFloat(String(data.total?.avg_confidence ?? 0)) || 0;

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
          <StatsCard
            title="Total Analyses"
            metric={totalAnalyses.toLocaleString()}
            icon="🔍"
            color="blue"
          />
          <StatsCard
            title="SSR Detected"
            metric={ssrCount.toLocaleString()}
            icon="🖥️"
            color="emerald"
          />
          <StatsCard
            title="CSR Detected"
            metric={csrCount.toLocaleString()}
            icon="⚡"
            color="rose"
          />
          <StatsCard
            title="Hybrid"
            metric={hybridCount.toLocaleString()}
            icon="🔀"
            color="amber"
          />
          <StatsCard
            title="Avg Confidence"
            metric={`${avgConfidence.toFixed(1)}%`}
            icon="🎯"
            color="purple"
          />
        </div>

        {/* Charts Row 1 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <RenderTypeDistribution data={data.total} />
          <FrameworkChart data={data.frameworks || []} />
        </div>

        {/* Timeline Chart */}
        <div className="mb-6">
          <TimelineChart data={data.timeline || []} />
        </div>

        {/* Phase 2: Tech Stack & SEO */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <TechStackTrends data={data.techStack} />
          <SEOInsights data={data.seoStats} />
        </div>

        {/* Insights Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <PlatformBreakdown data={data.frameworks || []} />
          <HybridInsights data={data.total} />
        </div>

        {/* Bottom Row: Top Domains + Recent Analyses */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1">
            <TopDomains data={data.domains || []} />
          </div>
          <div className="lg:col-span-2">
            <RecentAnalyses 
              data={data.recent || []} 
              onDelete={handleDeleteAnalysis}
              onLoadMore={loadMore}
              hasMore={hasMore}
              isLoadingMore={isLoadingMore}
            />
          </div>
        </div>

        {/* Footer */}
        <div className="mt-8 text-center text-sm text-gray-400">
          <p>SSR/CSR Detector Analytics • Data is anonymized • Auto-refreshes every 30s</p>
          <p className="mt-2">
            Dashboard v1.3.0 •
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
