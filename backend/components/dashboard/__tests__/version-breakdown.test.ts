import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { LiveDashboard } from "../live-dashboard";
import { VersionBreakdown } from "../version-breakdown";

vi.stubGlobal("React", React);

const row = {
  version: "4.1.0",
  count: 100,
  ssr_count: 80,
  csr_count: 13,
  hybrid_count: 7,
  avg_confidence: 89.5,
};

const initialData = {
  total: {
    total_analyses: 100,
    ssr_count: 80,
    csr_count: 13,
    hybrid_count: 7,
    avg_confidence: 89.5,
  },
  frameworks: [],
  timeline: [],
  latestTime: null,
};

describe("VersionBreakdown", () => {
  it("renders stacked segment widths and verdict shares", () => {
    const markup = renderToStaticMarkup(
      React.createElement(VersionBreakdown, { data: [row] }),
    );

    expect(markup).toContain('style="width:80%"');
    expect(markup).toContain('style="width:13%"');
    expect(markup).toContain('style="width:7%"');
    expect(markup).toContain("SSR 80% · CSR 13% · Hybrid 7%");
    expect(markup).toContain("89.5% avg conf.");
  });

  it("renders an empty state for missing or empty data", () => {
    const emptyMarkup = renderToStaticMarkup(
      React.createElement(VersionBreakdown, { data: [] }),
    );
    const missingMarkup = renderToStaticMarkup(
      React.createElement(VersionBreakdown, {}),
    );

    expect(emptyMarkup).toContain("Not enough data yet");
    expect(missingMarkup).toContain("Not enough data yet");
  });

  it("shows the version breakdown heading in public dashboard mode", () => {
    const markup = renderToStaticMarkup(
      React.createElement(LiveDashboard, {
        initialData,
        mode: "public",
      }),
    );

    expect(markup).toContain("Verdicts by Extension Version");
  });
});
