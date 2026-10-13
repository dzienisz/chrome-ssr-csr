import { describe, it, expect } from "vitest";

import "../report.js";
import { toJSON, toCSV, toMarkdown, toSummary, csvCell } from "../export.js";

const PAGE = { url: "https://example.com/docs", title: "Docs — Example" };

function result(overrides = {}) {
  return {
    renderType: "Client-Side Rendered (CSR)",
    confidence: 88,
    indicators: ["raw HTML much smaller than rendered (0.02x ratio) - CSR", "minimal text content (CSR)"],
    renderOrigin: { id: "browser", label: "Built in the browser", detail: "Assembled on this device." },
    signals: [
      {
        id: "comparison.mismatch",
        label: "The server sent a fraction of what you see",
        impact: "csr",
        weight: 40,
        detail: "40 characters arrived; 8,000 are on screen.",
      },
      { id: "delivery.cdn", label: "Served through Cloudflare", impact: "info", weight: 0, detail: "" },
    ],
    detailedInfo: {
      ssrScore: 10,
      csrScore: 70,
      ssrPercentage: 13,
      hybridScore: 0,
      frameworks: ["react"],
      generators: [],
      contentComparison: {
        rawLength: 40,
        renderedLength: 8000,
        ratio: 0.01,
        wordCoverage: 0.01,
      },
      delivery: {
        available: true,
        modeLabel: "Served from CDN cache",
        modeDetail: "A cache answered this request.",
        cdn: "Cloudflare",
        runtime: null,
        cacheState: "HIT",
        age: 20,
        ttfb: 31,
      },
      domDiff: {
        available: true,
        serverSharePct: 1,
        regions: [
          { key: "#root", label: "#root", rawChars: 0, renderedChars: 8000, addedChars: 8000, origin: "client" },
        ],
      },
    },
    ...overrides,
  };
}

function sampleDecision() {
  return {
    algorithmVersion: 2,
    gate: { passed: true, reason: null, visibleChars: 4210 },
    measurement: {
      source: "fetch",
      measure: "words",
      value: 0.11,
      matched: 22,
      total: 193,
      snapshotReason: null,
      band: "csr",
      bandLimits: { csr: 0.2, partial: 0.4, ssr: 0.7 },
      points: { side: "csr", value: 40 },
    },
    cap: { kind: "decisive", from: 45, to: 10 },
    score: { ssr: 10, csr: 40, ssrPercentage: 20, hybridScore: 0 },
    rule: "csr",
    threshold: 25,
    downgraded: false,
    confidenceCap: null,
  };
}

describe("toJSON", () => {
  it("wraps the analysis with the page it describes", () => {
    const parsed = JSON.parse(toJSON(result(), PAGE));

    expect(parsed.url).toBe(PAGE.url);
    expect(parsed.title).toBe(PAGE.title);
    expect(parsed.analysis.renderType).toBe("Client-Side Rendered (CSR)");
    expect(typeof parsed.exportedAt).toBe("string");
  });

  it("includes algorithmVersion and decision in the wrapped analysis", () => {
    const parsed = JSON.parse(
      toJSON(
        result({
          algorithmVersion: 2,
          decision: sampleDecision(),
          confidenceLevel: "medium",
          confidenceLevelReason: "near-threshold",
        }),
        PAGE,
      ),
    );

    expect(parsed.analysis.algorithmVersion).toBe(2);
    expect(parsed.analysis.decision.rule).toBe("csr");
    expect(parsed.analysis.confidence).toBe(88);
    expect(parsed.analysis.confidenceLevel).toBe("medium");
  });
});

describe("csvCell", () => {
  it("doubles embedded quotes instead of breaking the row", () => {
    expect(csvCell('He said "hello"')).toBe('"He said ""hello"""');
  });

  it("keeps commas and newlines inside one quoted field", () => {
    expect(csvCell("a,b\nc")).toBe('"a,b\nc"');
  });

  it("renders null and undefined as an empty field", () => {
    expect(csvCell(null)).toBe('""');
    expect(csvCell(undefined)).toBe('""');
  });

  // Cell values come from the analyzed page. Quoting keeps the CSV well
  // formed; it does nothing to stop a spreadsheet from executing the cell.
  describe("spreadsheet formula neutralization", () => {
    it.each([
      ['=HYPERLINK("http://evil","click")'],
      ["+1+1"],
      ["-2+3"],
      ["@SUM(A1)"],
    ])("prefixes %s so it stays text", (payload) => {
      const escaped = payload.replace(/"/g, '""');
      expect(csvCell(payload)).toBe(`"'${escaped}"`);
    });

    it("sees through leading whitespace and control characters", () => {
      expect(csvCell("  \t=cmd()")).toBe(`"'  \t=cmd()"`);
      expect(csvCell("\u0000=cmd()")).toBe(`"'\u0000=cmd()"`);
    });

    // Tab and carriage return are trigger characters in their own right, not
    // just whitespace to skip past: OWASP lists them because DDE payloads
    // start with one. A value beginning with a bare tab must still be quoted
    // even though nothing after it looks like a formula.
    it("treats a leading tab or carriage return as a trigger", () => {
      expect(csvCell("\tcmd|'/c calc'!A0")).toBe(`"'\tcmd|'/c calc'!A0"`);
      expect(csvCell("\rcmd")).toBe(`"'\rcmd"`);
    });

    it("leaves ordinary values untouched", () => {
      expect(csvCell("Acme — Ship faster")).toBe('"Acme — Ship faster"');
      expect(csvCell("Server-Side Rendered (SSR)")).toBe('"Server-Side Rendered (SSR)"');
      expect(csvCell(42)).toBe('"42"');
    });
  });
});

describe("toCSV", () => {
  it("emits a header row and one row per field", () => {
    const rows = toCSV(result(), PAGE).split("\n");

    expect(rows[0]).toBe('"Field","Value"');
    expect(rows.some((row) => row.startsWith('"Render type"'))).toBe(true);
    expect(rows.some((row) => row.includes("Cloudflare"))).toBe(true);
    expect(rows).toContain('"Word coverage","1%"');
  });

  it("emits the algorithm version", () => {
    const rows = toCSV(result({ algorithmVersion: 2 }), PAGE).split("\n");

    expect(rows).toContain('"Algorithm version","2"');
  });

  it("keeps numeric confidence and adds the qualitative confidence level", () => {
    const rows = toCSV(
      result({ confidence: 75, confidenceLevel: "medium" }),
      PAGE,
    ).split("\n");

    expect(rows).toContain('"Confidence","75%"');
    expect(rows).toContain('"Confidence level","Medium"');
  });

  it("quotes an indicator list that contains commas", () => {
    const csv = toCSV(result(), PAGE);
    const line = csv.split("\n").find((row) => row.startsWith('"Indicators"'));

    expect(line).toContain("raw HTML much smaller than rendered");
    expect(line.match(/"/g).length % 2).toBe(0);
  });

  it("survives a result with no delivery or diff data", () => {
    const bare = result({ detailedInfo: { ssrScore: 0, csrScore: 0, ssrPercentage: 50 } });

    expect(() => toCSV(bare, PAGE)).not.toThrow();
  });

  it("neutralizes a page title that a spreadsheet would execute", () => {
    const title = '=HYPERLINK("http://evil","Open")';
    const csv = toCSV(result(), { ...PAGE, title });
    const line = csv.split("\n").find((row) => row.startsWith('"Title"'));

    expect(line).toBe(`"Title","'${title.replace(/"/g, '""')}"`);
  });
});

describe("toMarkdown", () => {
  it("includes the verdict, the origin and the evidence", () => {
    const markdown = toMarkdown(result(), PAGE, "4.0.0");

    expect(markdown).toContain("# Rendering analysis — Docs — Example");
    expect(markdown).toContain("**Render type:** Client-Side Rendered (CSR)");
    expect(markdown).toContain("**Rendered where:** Built in the browser");
    expect(markdown).toContain("_(CSR +40)_");
    expect(markdown).toContain("v4.0.0");
  });

  it("exports the shared decision description", () => {
    const markdown = toMarkdown(
      result({ algorithmVersion: 2, decision: sampleDecision() }),
      PAGE,
      "4.0.0",
    );

    expect(markdown).toContain("## Why this verdict");
    expect(markdown).toContain(
      "- **Page check:** Passed: 4,210 characters of visible text.",
    );
    expect(markdown).toContain(
      "- **Measurement:** 22 of 193 visible words (11%) were in the HTML the server sent.",
    );
    expect(markdown).toContain(
      "- **Verdict:** SSR share 20% ≤ 25% → Client-Side Rendered (CSR).",
    );
    expect(markdown).toContain(
      "- **Algorithm:** Algorithm v2 · every signal is in the Evidence section",
    );
  });

  it("exports the confidence level and reason", () => {
    const markdown = toMarkdown(
      result({
        confidence: 75,
        confidenceLevel: "medium",
        confidenceLevelReason: "near-threshold",
      }),
      PAGE,
      "4.0.0",
    );

    expect(markdown).toContain("- **Confidence:** 75%");
    expect(markdown).toContain(
      "- **Confidence level:** Medium (near-threshold)",
    );
  });

  it("renders the region breakdown as a table", () => {
    const markdown = toMarkdown(result(), PAGE, "4.0.0");

    expect(markdown).toContain("| Region | Origin | From server | Added by JS |");
    expect(markdown).toContain("| `#root` | client |");
  });

  it("exports word-covered characters in the region breakdown", () => {
    const data = result();
    data.detailedInfo.domDiff.regions = [
      {
        key: "#article",
        origin: "client",
        rawChars: 719,
        coveredChars: 0,
        renderedChars: 720,
        addedChars: 720,
      },
    ];
    const markdown = toMarkdown(data, PAGE, "4.0.0");

    expect(markdown).toContain("| `#article` | client | 0 | 720 |");
  });

  it("omits sections it has no data for", () => {
    const bare = result({
      signals: [],
      detailedInfo: { ssrScore: 0, csrScore: 0, ssrPercentage: 50 },
    });
    const markdown = toMarkdown(bare, PAGE, "4.0.0");

    expect(markdown).not.toContain("## Delivery");
    expect(markdown).not.toContain("## Evidence");
    expect(markdown).not.toContain("## Regions");
  });
});

describe("toSummary", () => {
  it("fits the verdict, the origin and the server share on one line", () => {
    const summary = toSummary(result(), PAGE);

    expect(summary).toBe(
      "https://example.com/docs → Client-Side Rendered (CSR) (88% confidence) · Built in the browser · 1% of text from the server",
    );
    expect(summary).not.toContain("\n");
  });

  it("does not add decision details to the copy summary", () => {
    const baseline = toSummary(result(), PAGE);
    const withDecision = toSummary(
      result({ algorithmVersion: 2, decision: sampleDecision() }),
      PAGE,
    );

    expect(withDecision).toBe(baseline);
  });

  it("uses the confidence level in the copy summary when available", () => {
    expect(toSummary(result({ confidenceLevel: "medium" }), PAGE)).toContain(
      "(medium confidence)",
    );
  });

  it("drops the parts it has no data for", () => {
    const bare = result({
      renderOrigin: null,
      detailedInfo: { ssrScore: 0, csrScore: 0, ssrPercentage: 50 },
    });

    expect(toSummary(bare, PAGE)).toBe(
      "https://example.com/docs → Client-Side Rendered (CSR) (88% confidence)",
    );
  });

  it("omits origin and server share for unassessable results", () => {
    const unassessable = result({
      renderType: "Cannot assess",
      confidence: 0,
      assessable: false,
      unassessableReason: "bot-challenge",
    });

    expect(toSummary(unassessable, PAGE)).toBe(
      "https://example.com/docs → Cannot assess — bot-challenge",
    );
  });
});
