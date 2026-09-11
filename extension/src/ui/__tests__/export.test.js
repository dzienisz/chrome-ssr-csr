import { describe, it, expect } from "vitest";

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
      contentComparison: { rawLength: 40, renderedLength: 8000, ratio: 0.01 },
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

describe("toJSON", () => {
  it("wraps the analysis with the page it describes", () => {
    const parsed = JSON.parse(toJSON(result(), PAGE));

    expect(parsed.url).toBe(PAGE.url);
    expect(parsed.title).toBe(PAGE.title);
    expect(parsed.analysis.renderType).toBe("Client-Side Rendered (CSR)");
    expect(typeof parsed.exportedAt).toBe("string");
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
});

describe("toCSV", () => {
  it("emits a header row and one row per field", () => {
    const rows = toCSV(result(), PAGE).split("\n");

    expect(rows[0]).toBe('"Field","Value"');
    expect(rows.some((row) => row.startsWith('"Render type"'))).toBe(true);
    expect(rows.some((row) => row.includes("Cloudflare"))).toBe(true);
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

  it("renders the region breakdown as a table", () => {
    const markdown = toMarkdown(result(), PAGE, "4.0.0");

    expect(markdown).toContain("| Region | Origin | From server | Added by JS |");
    expect(markdown).toContain("| `#root` | client |");
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

  it("drops the parts it has no data for", () => {
    const bare = result({
      renderOrigin: null,
      detailedInfo: { ssrScore: 0, csrScore: 0, ssrPercentage: 50 },
    });

    expect(toSummary(bare, PAGE)).toBe(
      "https://example.com/docs → Client-Side Rendered (CSR) (88% confidence)",
    );
  });
});
