import { LiveDashboard, DashboardData } from '@/components/dashboard/live-dashboard';
import { getPublicAggregates } from '@/lib/public-stats';

// Mark as dynamic - dashboard needs fresh data
export const dynamic = 'force-dynamic';
export const revalidate = 0;

async function getDashboardData() {
  try {
    return await getPublicAggregates();
  } catch (error) {
    console.error('Error fetching dashboard data:', error);
    return null;
  }
}

export default async function Dashboard() {
  const data = await getDashboardData();

  if (!data) {
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

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <LiveDashboard
        initialData={data as unknown as DashboardData}
        mode="public"
      />
    </main>
  );
}
