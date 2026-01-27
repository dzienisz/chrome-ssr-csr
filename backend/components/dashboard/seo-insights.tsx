import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Check, X, AlertTriangle } from "lucide-react";

interface SEOInsightsProps {
  data?: {
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
}

export function SEOInsights({ data }: SEOInsightsProps) {
  if (!data || data.totalAnalyzed === 0) return null;

  const renderMetric = (label: string, count: number, total: number) => {
    const percentage = Math.round((count / total) * 100);
    let color = "text-red-400";
    let icon = <X className="w-4 h-4" />;
    
    if (percentage >= 80) {
      color = "text-green-400";
      icon = <Check className="w-4 h-4" />;
    } else if (percentage >= 50) {
      color = "text-yellow-400";
      icon = <AlertTriangle className="w-4 h-4" />;
    }

    return (
      <div className="flex items-center justify-between p-2 rounded hover:bg-slate-800/50 transition-colors">
        <span className="text-sm text-slate-300">{label}</span>
        <div className="flex items-center gap-2">
          <span className={`text-sm font-bold ${color}`}>{percentage}%</span>
          <span className={color}>{icon}</span>
        </div>
      </div>
    );
  };

  return (
    <Card className="bg-slate-900/50 border-slate-800">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          🔍 SEO & Accessibility
          <Badge variant="outline" className="ml-auto bg-green-500/10 text-green-400 border-green-500/20">Phase 2</Badge>
        </CardTitle>
        <CardDescription>Adoption of best practices across {data.totalAnalyzed} sites</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div>
            <h4 className="text-sm font-semibold text-slate-400 mb-4 pb-2 border-b border-slate-800">SEO Essentials</h4>
            <div className="space-y-1">
              {renderMetric("Meta Description", data.metaTags.hasDescription, data.totalAnalyzed)}
              {renderMetric("Open Graph Tags", data.metaTags.hasOGTags, data.totalAnalyzed)}
              {renderMetric("Twitter Cards", data.metaTags.hasTwitterCard, data.totalAnalyzed)}
            </div>
          </div>
          
          <div>
            <h4 className="text-sm font-semibold text-slate-400 mb-4 pb-2 border-b border-slate-800">Accessibility (A11y)</h4>
            <div className="space-y-1">
              {renderMetric("Images with Alt Text", data.accessibility.hasAltText, data.totalAnalyzed)}
              {renderMetric("ARIA Labels Used", data.accessibility.hasAriaLabels, data.totalAnalyzed)}
              {renderMetric("Semantic Landmarks", data.accessibility.hasLandmarks, data.totalAnalyzed)}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
