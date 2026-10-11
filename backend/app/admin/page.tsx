import { LiveDashboard, DashboardData } from "@/components/dashboard/live-dashboard";
import { getTopDomains, getRecentAnalyses } from "@/lib/db";
import { getPublicAggregates } from "@/lib/public-stats";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const metadata = {
  robots: {
    index: false,
    follow: false,
  },
};

async function getDashboardData() {
  try {
    const [aggregates, domains, recent] = await Promise.all([
      getPublicAggregates(),
      getTopDomains(10),
      getRecentAnalyses(20),
    ]);

    return {
      ...aggregates,
      domains,
      recent,
    };
  } catch (error) {
    console.error("Error fetching admin dashboard data:", error);
    return null;
  }
}

export default async function AdminPage() {
  const data = await getDashboardData();

  if (!data) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <h1 className="text-3xl font-bold mb-8 text-gray-900">
            SSR/CSR Analytics
          </h1>
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-700">
              Error loading dashboard data. Make sure the database is set up.
            </p>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <LiveDashboard
        initialData={data as unknown as DashboardData}
        mode="admin"
      />
    </main>
  );
}
