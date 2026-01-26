import { FrameworkChart, RenderTypeDistribution, TimelineChart } from '@/components/dashboard/charts';
import { RecentAnalyses } from '@/components/dashboard/recent-analyses';
import { TopDomains } from '@/components/dashboard/top-domains';
import {
  getTotalStats,
  getTopFrameworks,
  getTopDomains,
  getAnalysesByDate,
  getRecentAnalyses as getRecentAnalysesFromDb,
} from '@/lib/db';

// Mark as dynamic - dashboard needs fresh data
export const dynamic = 'force-dynamic';
export const revalidate = 0;

async function getStats() {
  try {
    const [total, topFrameworks, topDomains, timelineData] = await Promise.all([
      getTotalStats(),
      getTopFrameworks(10),
      getTopDomains(10),
      getAnalysesByDate(30),
    ]);

    return {
      total,
      frameworks: topFrameworks,
      domains: topDomains,
      timeline: timelineData,
    };
  } catch (error) {
    console.error('Error fetching stats:', error);
    return null;
  }
}

async function getRecentAnalyses() {
  try {
    return await getRecentAnalysesFromDb(20);
  } catch (error) {
    console.error('Error fetching recent analyses:', error);
    return [];
  }
}

export default async function Dashboard() {
  const stats = await getStats();
  const recentAnalyses = await getRecentAnalyses();

  if (!stats) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <h1 className="text-3xl font-bold mb-8 text-gray-900">SSR/CSR Analytics</h1>
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-700">Error loading dashboard data. Make sure the database is set up.</p>
          </div>
        </div>
      </main>
    );
  }

  const totalAnalyses = parseInt(stats.total?.total_analyses) || 0;
  const ssrCount = parseInt(stats.total?.ssr_count) || 0;
  const csrCount = parseInt(stats.total?.csr_count) || 0;
  const hybridCount = parseInt(stats.total?.hybrid_count) || 0;
  const avgConfidence = parseFloat(stats.total?.avg_confidence) || 0;

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
                <span className="text-3xl">📊</span>
                SSR/CSR Analytics
              </h1>
              <p className="text-gray-500 mt-1">
                Chrome Extension Usage Dashboard
              </p>
            </div>
            <div className="text-right">
              <div className="text-sm text-gray-500">Last updated</div>
              <div className="text-sm font-medium text-gray-700">
                {new Date().toLocaleString()}
              </div>
            </div>
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

        {/* Charts Row 1 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <RenderTypeDistribution data={stats.total} />
          <FrameworkChart data={stats.frameworks as any || []} />
        </div>

        {/* Timeline Chart */}
        <div className="mb-6">
          <TimelineChart data={stats.timeline as any || []} />
        </div>

        {/* Bottom Row: Top Domains + Recent Analyses */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1">
            <TopDomains data={stats.domains as any || []} />
          </div>
          <div className="lg:col-span-2">
            <RecentAnalyses data={recentAnalyses as any} />
          </div>
        </div>

        {/* Footer */}
        <div className="mt-8 text-center text-sm text-gray-400">
          <p>SSR/CSR Detector Analytics • Data is anonymized and aggregated</p>
        </div>
      </div>
    </main>
  );
}
