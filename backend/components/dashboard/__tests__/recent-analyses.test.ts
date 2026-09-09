import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { RecentAnalyses } from '../recent-analyses';

vi.stubGlobal('React', React);

describe('public recent analyses', () => {
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
