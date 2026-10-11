import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { CWVInsights } from "../cwv-insights";

vi.stubGlobal("React", React);

describe("CWVInsights", () => {
  it("renders p75 values and explains the percentile convention", () => {
    const markup = renderToStaticMarkup(
      React.createElement(CWVInsights, {
        data: [
          {
            render_category: "SSR",
            sample_count: "20",
            p75_lcp: "2920",
            lcp_good: "10",
            p75_cls: "0.055",
            cls_good: "18",
            p75_inp: "180",
            inp_good: "15",
            avg_fid: null,
            fid_good: "0",
            p75_ttfb: "696",
            ttfb_good: "16",
            pass_rate: "80",
          },
        ],
      }),
    );

    expect(markup).toContain("2920 ms");
    expect(markup).toContain("0.055");
    expect(markup).toContain("696 ms");
    expect(markup).toContain(
      "Real-world p75 (75th percentile, as in Google&#x27;s CrUX) measured by extension users, segmented by rendering strategy",
    );
  });
});
