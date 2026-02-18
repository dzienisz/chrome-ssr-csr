
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
  if (!data || data.totalAnalyzed === 0) {
    return (
      <div className="rounded-lg border bg-white border-gray-100 shadow-sm p-6">
        <h3 className="text-2xl font-semibold leading-none tracking-tight flex items-center gap-2 mb-2">
          🔍 SEO & Accessibility
        </h3>
        <p className="text-sm text-gray-400 italic">No SEO data collected yet</p>
      </div>
    );
  }

  const renderMetric = (label: string, count: number, total: number) => {
    const percentage = Math.round((count / total) * 100);
    let color = "text-red-500";
    let icon = (
      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
        <path d="M18 6 6 18"/><path d="m6 6 12 12"/>
      </svg>
    ); // X
    
    if (percentage >= 80) {
      color = "text-emerald-600";
      icon = (
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
          <polyline points="20 6 9 17 4 12"/>
        </svg>
      ); // Check
    } else if (percentage >= 50) {
      color = "text-amber-500";
      icon = (
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
          <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4"/><path d="M12 17h.01"/>
        </svg>
      ); // AlertTriangle
    }

    return (
      <div className="flex items-center justify-between p-2 rounded hover:bg-gray-50 transition-colors">
        <span className="text-sm text-gray-700">{label}</span>
        <div className="flex items-center gap-2">
          <span className={`text-sm font-bold ${color}`}>{percentage}%</span>
          <span className={color}>{icon}</span>
        </div>
      </div>
    );
  };

  return (
    <div className="rounded-lg border bg-white border-gray-100 shadow-sm">
      <div className="flex flex-col space-y-1.5 p-6">
        <h3 className="text-2xl font-semibold leading-none tracking-tight flex items-center gap-2">
          🔍 SEO & Accessibility
          <span className="ml-auto inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 border-emerald-200 bg-emerald-50 text-emerald-700">
            Phase 2
          </span>
        </h3>
        <p className="text-sm text-gray-500">Adoption of best practices across {data.totalAnalyzed} sites</p>
      </div>
      <div className="p-6 pt-0">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div>
            <h4 className="text-sm font-semibold text-gray-500 mb-4 pb-2 border-b border-gray-100">SEO Essentials</h4>
            <div className="space-y-1">
              {renderMetric("Meta Description", data.metaTags.hasDescription, data.totalAnalyzed)}
              {renderMetric("Open Graph Tags", data.metaTags.hasOGTags, data.totalAnalyzed)}
              {renderMetric("Twitter Cards", data.metaTags.hasTwitterCard, data.totalAnalyzed)}
            </div>
          </div>
          
          <div>
            <h4 className="text-sm font-semibold text-gray-500 mb-4 pb-2 border-b border-gray-100">Accessibility (A11y)</h4>
            <div className="space-y-1">
              {renderMetric("Images with Alt Text", data.accessibility.hasAltText, data.totalAnalyzed)}
              {renderMetric("ARIA Labels Used", data.accessibility.hasAriaLabels, data.totalAnalyzed)}
              {renderMetric("Semantic Landmarks", data.accessibility.hasLandmarks, data.totalAnalyzed)}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
