import Link from 'next/link';

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <div className="z-10 max-w-5xl w-full items-center justify-between font-mono text-sm">
        <h1 className="text-4xl font-bold mb-8 text-center">
          SSR/CSR Analytics API
        </h1>
        <p className="text-center mb-8 text-gray-600 dark:text-gray-400">
          Backend service for Chrome SSR/CSR Detector extension
        </p>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8 mb-8">
          <h2 className="text-2xl font-semibold mb-4">API Endpoints</h2>
          <ul className="space-y-2">
            <li>
              <code className="bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">
                POST /api/analyze
              </code>
              {' '}- Submit analysis data
            </li>
            <li>
              <code className="bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">
                GET /api/stats
              </code>
              {' '}- Get aggregated statistics
            </li>
          </ul>
        </div>

        <div className="text-center">
          <Link
            href="/dashboard"
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-lg transition"
          >
            View Dashboard
          </Link>
        </div>
      </div>
    </main>
  );
}
