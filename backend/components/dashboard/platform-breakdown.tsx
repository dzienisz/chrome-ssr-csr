'use client';

import { Card, Title, Text, ProgressBar, Color } from '@tremor/react';

interface PlatformStats {
  platform_type: string;
  count: number;
  avg_confidence: number;
}

export function PlatformBreakdown({ data }: { data: any[] }) {
  if (!data || data.length === 0) {
    return (
      <Card className="bg-white">
        <Title>Platform Detection</Title>
        <div className="mt-6 flex items-center justify-center h-40">
          <Text className="text-gray-500">No platform data yet</Text>
        </div>
      </Card>
    );
  }

  // Categorize frameworks into platforms
  const categorizeFramework = (framework: string): string => {
    const fw = framework.toLowerCase();
    
    // CMS Platforms
    if (['wordpress', 'shopify', 'webflow', 'wix', 'squarespace'].includes(fw)) {
      return 'CMS';
    }
    
    // Static Site Generators
    if (['jekyll', 'hugo', 'eleventy', 'hexo', 'pelican', 'docusaurus', 'vuepress', 'mkdocs', 'gitbook'].includes(fw)) {
      return 'Static';
    }
    
    // React Ecosystem
    if (['react', 'next.js', 'gatsby', 'remix'].includes(fw)) {
      return 'React';
    }
    
    // Vue Ecosystem
    if (['vue', 'nuxt'].includes(fw)) {
      return 'Vue';
    }
    
    // Other Modern Frameworks
    if (['angular', 'svelte', 'sveltekit', 'astro', 'qwik', 'solidjs', 'preact', 'lit'].includes(fw)) {
      return 'Modern';
    }
    
    // Lightweight/AJAX
    if (['htmx', 'alpine.js'].includes(fw)) {
      return 'Lightweight';
    }
    
    return 'Other';
  };

  // Aggregate by platform type
  const platformCounts: { [key: string]: number } = {};
  data.forEach((item) => {
    const category = categorizeFramework(item.framework);
    platformCounts[category] = (platformCounts[category] || 0) + parseInt(item.count);
  });

  const platforms = Object.entries(platformCounts)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);

  const total = platforms.reduce((sum, p) => sum + p.count, 0);

  const getPlatformIcon = (name: string) => {
    const icons: { [key: string]: string } = {
      'React': '⚛️',
      'Vue': '💚',
      'Angular': '🅰️',
      'Modern': '🚀',
      'Static': '📄',
      'CMS': '📝',
      'Lightweight': '⚡',
      'Other': '🔧'
    };
    return icons[name] || '🔧';
  };

  const getPlatformColor = (name: string): Color => {
    const colors: { [key: string]: Color } = {
      'React': 'blue',
      'Vue': 'emerald',
      'Angular': 'rose',
      'Modern': 'violet',
      'Static': 'slate',
      'CMS': 'indigo',
      'Lightweight': 'yellow',
      'Other': 'gray'
    };
    return colors[name] || 'gray';
  };

  return (
    <Card className="bg-white">
      <Title>Platform Breakdown</Title>
      <Text className="text-gray-500 mt-1">Framework ecosystem distribution</Text>
      
      <div className="mt-6 space-y-4">
        {platforms.map((platform) => {
          const percentage = Math.round((platform.count / total) * 100);
          
          return (
            <div key={platform.name} className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xl">{getPlatformIcon(platform.name)}</span>
                  <span className="text-sm font-medium text-gray-700">{platform.name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-gray-900">{percentage}%</span>
                  <span className="text-xs text-gray-400">({platform.count})</span>
                </div>
              </div>
              <ProgressBar value={percentage} color={getPlatformColor(platform.name)} className="mt-2" />
            </div>
          );
        })}
      </div>

      <div className="mt-6 pt-4 border-t border-gray-100">
        <div className="flex justify-between text-sm">
          <span className="text-gray-500">Total Detections</span>
          <span className="font-semibold text-gray-900">{total}</span>
        </div>
      </div>
    </Card>
  );
}
