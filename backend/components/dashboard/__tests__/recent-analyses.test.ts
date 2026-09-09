import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { RecentAnalyses } from '../recent-analyses';
import { LiveDashboard } from '../live-dashboard';

vi.stubGlobal('React', React);

describe('public recent analyses', () => {
  it('describes public minimization rather than anonymity', () => {
    const markup = renderToStaticMarkup(React.createElement(LiveDashboard, { initialData: { total: { total_analyses: 0, ssr_count: 0, csr_count: 0, hybrid_count: 0, avg_confidence: 0 }, frameworks: [], domains: [], timeline: [], recent: [], latestTime: null } }));
    expect(markup).toContain('Public data is minimized');
    expect(markup).toContain('Auto-refreshes every 30s');
    expect(markup).not.toContain('Data is anonymized');
  });
  it('renders read-only records and navigation without deletion controls', () => {
    const markup = renderToStaticMarkup(React.createElement(RecentAnalyses, {
      data: [{ id: 1, timestamp: '2026-01-01T00:00:00.000Z', domain: 'example.test', render_type: 'SSR', confidence: 90, frameworks: ['react'] }],
      hasMore: false
    }));
    expect(markup).toContain('example.test');
    expect(markup).toContain('Click any row to view details');
    expect(markup).toContain('Scroll for more');
    expect(markup).not.toContain('Delete Analysis');
    expect(markup).not.toContain('Hover to delete');
    expect(markup).not.toContain('Actions');
  });
});
