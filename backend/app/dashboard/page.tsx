import { StatsCard } from '@/components/dashboard/stats-card';
import { FrameworkChart, RenderTypeDistribution, TimelineChart } from '@/components/dashboard/charts';
import { RecentAnalyses } from '@/components/dashboard/recent-analyses';
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
      getTopDomains(20),
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
    return await getRecentAnalysesFromDb(50);
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
      <main className="min-h-screen p-8 bg-gray-50 dark:bg-gray-900">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-3xl font-bold mb-8">SSR/CSR Analytics Dashboard</h1>
          <p className="text-red-600">Error loading dashboard data. Make sure the database is set up.</p>
        </div>
      </main>
    );
  }

  const totalAnalyses = parseInt(stats.total?.total_analyses) || 0;
  const avgConfidence = parseFloat(stats.total?.avg_confidence) || 0;

  return (
    <main className="min-h-screen p-8 bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">SSR/CSR Analytics Dashboard</h1>
          <p className="text-gray-600 dark:text-gray-400">
            Real-time analytics from your Chrome extension
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <StatsCard
            title="Total Analyses"
            metric={totalAnalyses.toLocaleString()}
          />
          <StatsCard
            title="SSR Detections"
            metric={parseInt(stats.total?.ssr_count) || 0}
          />
          <StatsCard
            title="CSR Detections"
            metric={parseInt(stats.total?.csr_count) || 0}
          />
          <StatsCard
            title="Avg Confidence"
            metric={`${avgConfidence.toFixed(1)}%`}
          />
        </div>

        {/* Charts Row 1 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <RenderTypeDistribution data={stats.total} />
          <FrameworkChart data={stats.frameworks || []} />
        </div>

        {/* Timeline Chart */}
        <div className="mb-6">
          <TimelineChart data={stats.timeline || []} />
        </div>

        {/* Recent Analyses Table */}
        <RecentAnalyses data={recentAnalyses} />
      </div>
    </main>
  );
}
