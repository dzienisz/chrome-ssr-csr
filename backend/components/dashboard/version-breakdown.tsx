export interface VersionRow {
  version: string;
  count: number;
  ssr_count: number;
  csr_count: number;
  hybrid_count: number;
  avg_confidence: number;
}

interface VersionBreakdownProps {
  data?: VersionRow[];
}

const TITLE = "Verdicts by Extension Version";
const SUBTITLE =
  "Share of SSR / CSR / Hybrid verdicts per release (versions with ≥20 analyses)";

export function VersionBreakdown({ data }: VersionBreakdownProps) {
  return (
    <div className="rounded-lg border bg-white border-gray-100 shadow-sm">
      <div className="flex flex-col space-y-1.5 p-6">
        <h3 className="text-2xl font-semibold leading-none tracking-tight flex items-center gap-2">
          📦 {TITLE}
        </h3>
        <p className="text-sm text-gray-500">{SUBTITLE}</p>
      </div>
      <div className="p-6 pt-0">
        {!data?.length ? (
          <p className="text-sm text-gray-400 italic">Not enough data yet</p>
        ) : (
          <div className="space-y-5">
            {data.map((row) => {
              const count = Math.max(0, row.count);
              const width = (value: number) =>
                count ? Number(((value / count) * 100).toFixed(2)) : 0;
              const ssrWidth = width(row.ssr_count);
              const csrWidth = width(row.csr_count);
              const hybridWidth = width(row.hybrid_count);
              const ssrShare = Math.round(ssrWidth);
              const csrShare = Math.round(csrWidth);
              const hybridShare = Math.round(hybridWidth);

              return (
                <div
                  key={row.version}
                  className="grid grid-cols-1 md:grid-cols-[160px_minmax(0,1fr)_140px] gap-4 items-center"
                >
                  <div className="flex items-center gap-3">
                    <span className="font-semibold text-gray-800">
                      v{row.version}
                    </span>
                    <span className="text-xs text-gray-400">
                      n = {count.toLocaleString()}
                    </span>
                  </div>
                  <div>
                    <div
                      className="flex h-2 w-full overflow-hidden rounded-full bg-gray-100"
                      aria-label={`Verdicts for version ${row.version}`}
                    >
                      <div
                        className="h-full bg-emerald-500"
                        style={{ width: `${ssrWidth}%` }}
                      />
                      <div
                        className="h-full bg-rose-500"
                        style={{ width: `${csrWidth}%` }}
                      />
                      <div
                        className="h-full bg-amber-500"
                        style={{ width: `${hybridWidth}%` }}
                      />
                    </div>
                    <p className="mt-1 text-xs text-gray-500">
                      SSR {ssrShare}% · CSR {csrShare}% · Hybrid {hybridShare}%
                    </p>
                  </div>
                  <div className="text-sm text-gray-500 md:text-right">
                    {row.avg_confidence}% avg conf.
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
