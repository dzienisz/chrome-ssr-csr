import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { RecentAnalyses } from '../recent-analyses';
import { LiveDashboard } from '../live-dashboard';

vi.stubGlobal('React', React);

const initialData = {
  total: {
    total_analyses: 0,
    ssr_count: 0,
    csr_count: 0,
    hybrid_count: 0,
    avg_confidence: 0,
  },
  frameworks: [],
  timeline: [],
  latestTime: null,
};

describe('dashboard modes', () => {
  it('describes the public aggregate-only view', () => {
    const markup = renderToStaticMarkup(
      React.createElement(LiveDashboard, {
        initialData,
        mode: 'public',
      }),
    );
    expect(markup).toContain('Public view shows aggregates only.');
    expect(markup).toContain('Auto-refreshes every 30s');
    expect(markup).not.toContain('Data is anonymized');
  });

  it('does not render domain or recent-analysis details publicly', () => {
    const markup = renderToStaticMarkup(
      React.createElement(LiveDashboard, {
        initialData,
        mode: 'public',
      }),
    );

    expect(markup).not.toContain('Top Analyzed Domains');
    expect(markup).not.toContain('Recent Analyses');
    expect(markup).not.toContain('Analysis Details');
  });

  it('renders domain and recent-analysis details in admin mode', () => {
    const markup = renderToStaticMarkup(
      React.createElement(LiveDashboard, {
        initialData: { ...initialData, domains: [], recent: [] },
        mode: 'admin',
      }),
    );

    expect(markup).toContain('Admin');
    expect(markup).toContain('Top Analyzed Domains');
    expect(markup).toContain('Recent Analyses');
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
