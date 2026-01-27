import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

interface TechStackTrendsProps {
  data?: {
    cssFrameworks: Record<string, number>;
    buildTools: Record<string, number>;
    hosting: Record<string, number>;
  }
}

export function TechStackTrends({ data }: TechStackTrendsProps) {
  if (!data) return null;

  const renderBarChart = (items: Record<string, number>, colorClass: string) => {
    const total = Object.values(items).reduce((a, b) => a + b, 0);
    const sorted = Object.entries(items).sort((a, b) => b[1] - a[1]);
    
    return sorted.map(([name, count]) => {
      const percentage = Math.round((count / total) * 100);
      return (
        <div key={name} className="flex items-center gap-2 text-sm mb-2">
          <div className="w-24 font-medium text-slate-300 truncate" title={name}>{name}</div>
          <div className="flex-1 h-2 bg-slate-800 rounded-full overflow-hidden">
            <div 
              className={`h-full rounded-full ${colorClass}`} 
              style={{ width: `${percentage}%` }}
            />
          </div>
          <div className="w-12 text-right text-slate-400 text-xs">{percentage}%</div>
        </div>
      );
    });
  };

  return (
    <Card className="bg-slate-900/50 border-slate-800">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          🛠️ Tech Stack Trends
          <Badge variant="outline" className="ml-auto bg-blue-500/10 text-blue-400 border-blue-500/20">Phase 2</Badge>
        </CardTitle>
        <CardDescription>Most popular technologies detected across analyzed sites</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* CSS Frameworks */}
          <div>
            <h4 className="text-sm font-semibold text-slate-400 mb-3 uppercase tracking-wider">CSS Frameworks</h4>
            {Object.keys(data.cssFrameworks).length > 0 ? (
              renderBarChart(data.cssFrameworks, 'bg-cyan-500')
            ) : (
               <div className="text-slate-500 text-sm italic">No data yet</div>
            )}
          </div>

          {/* Build Tools */}
          <div>
            <h4 className="text-sm font-semibold text-slate-400 mb-3 uppercase tracking-wider">Build Tools</h4>
            {Object.keys(data.buildTools).length > 0 ? (
              renderBarChart(data.buildTools, 'bg-purple-500')
            ) : (
               <div className="text-slate-500 text-sm italic">No data yet</div>
            )}
          </div>

          {/* Hosting */}
          <div>
            <h4 className="text-sm font-semibold text-slate-400 mb-3 uppercase tracking-wider">Hosting</h4>
            {Object.keys(data.hosting).length > 0 ? (
              renderBarChart(data.hosting, 'bg-emerald-500')
            ) : (
               <div className="text-slate-500 text-sm italic">No data yet</div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
