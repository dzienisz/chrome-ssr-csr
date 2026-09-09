import { describe, it, expect, vi } from "vitest";

// Import the detector module
import "../comparison-detector.js";

function mockFetchedHTML(html) {
  global.fetch = vi.fn().mockResolvedValue({
    ok: true,
    text: async () => html,
  });
}

const LONG_TEXT = "Real user-visible article text. ".repeat(20); // ~640 chars

describe("getDetectionBodyHTML", () => {
  it("returns unmodified page HTML without a bridge", () => {
    document.body.innerHTML =
      "<div hidden>Application text</div><script>void 0;</script>";
    expect(window.getDetectionBodyHTML()).toBe(document.body.innerHTML);
  });
  it("handles a missing body", () => {
    const body = vi.spyOn(document, "body", "get").mockReturnValue(null);
    try {
      expect(window.getDetectionBodyHTML()).toBe("");
    } finally {
      body.mockRestore();
    }
  });
});

describe("extractVisibleText", () => {
  it("excludes only the reserved bridge without mutating it", () => {
    document.body.innerHTML =
      "<article>Article text</article><div hidden>Application hidden text</div>";
    const bridge = document.createElement("div");
    bridge.id = "ssr-detector-probe-data";
    bridge.style.display = "none";
    bridge.textContent = JSON.stringify({
      message: "synthetic probe text ".repeat(1000),
    });
    document.body.appendChild(bridge);
    const snapshot = bridge.outerHTML;
    expect(window.extractVisibleText(document.body)).toBe(
      "Article textApplication hidden text",
    );
    expect(bridge.isConnected).toBe(true);
    expect(bridge.outerHTML).toBe(snapshot);
  });

  it("excludes the bridge identically from fetched and rendered documents", async () => {
    document.body.innerHTML = `<article>${LONG_TEXT}</article>`;
    const bridge = document.createElement("div");
    bridge.id = "ssr-detector-probe-data";
    bridge.style.display = "none";
    bridge.textContent = JSON.stringify({ sample: "x".repeat(12000) });
    document.body.appendChild(bridge);
    mockFetchedHTML(document.documentElement.outerHTML);
    const result = await window.compareInitialVsRendered();
    expect(result.rawLength).toBe(LONG_TEXT.trim().length);
    expect(result.renderedLength).toBe(LONG_TEXT.trim().length);
    expect(result.contentRatio).toBe(1);
    expect(bridge.isConnected).toBe(true);
  });
  it("should strip inline script text", () => {
    const doc = new DOMParser().parseFromString(
      '<body><script>window.__BUNDLE__ = "lots of js code here";</script><p>Hello world</p></body>',
      "text/html",
    );

    expect(window.extractVisibleText(doc.body)).toBe("Hello world");
  });

  it("should strip style, noscript and template text", () => {
    const doc = new DOMParser().parseFromString(
      `<body>
        <style>.a { color: red; }</style>
        <noscript>You need to enable JavaScript to run this app.</noscript>
        <template><p>hidden template text</p></template>
        <p>Visible</p>
      </body>`,
      "text/html",
    );

    expect(window.extractVisibleText(doc.body)).toBe("Visible");
  });

  it("should normalize whitespace", () => {
    const doc = new DOMParser().parseFromString(
      "<body><p>Hello</p>\n\n   <p>world</p></body>",
      "text/html",
    );

    expect(window.extractVisibleText(doc.body)).toBe("Hello world");
  });

  it("should return empty string for a missing body", () => {
    expect(window.extractVisibleText(null)).toBe("");
  });

  it("should not mutate the live body", () => {
    document.body.innerHTML = "<script>var x = 1;</script><p>Content</p>";

    window.extractVisibleText(document.body);

    expect(document.body.querySelector("script")).not.toBeNull();
  });
});

describe("compareInitialVsRendered", () => {
  it("should flag decisive CSR when raw HTML is script-only", async () => {
    // A CSR app shell: big inline bundle, no real text (the old code counted
    // the script text as content and called this SSR)
    mockFetchedHTML(
      `<html><body><div id="root"></div><script>${"x".repeat(5000)}</script></body></html>`,
    );
    document.body.innerHTML = `<div id="root"><p>${LONG_TEXT}</p></div>`;

    const result = await window.compareInitialVsRendered();

    expect(result.rawLength).toBe(0);
    expect(result.isLikelyCSR).toBe(true);
    expect(result.isDecisiveCSR).toBe(true);
    expect(result.isLikelySSR).toBe(false);
  });

  it("should flag SSR when raw text matches rendered text", async () => {
    mockFetchedHTML(
      `<html><body><article>${LONG_TEXT}</article></body></html>`,
    );
    document.body.innerHTML = `<article>${LONG_TEXT}</article>`;

    const result = await window.compareInitialVsRendered();

    expect(result.isLikelySSR).toBe(true);
    expect(result.isLikelyCSR).toBe(false);
    expect(result.isDecisiveCSR).toBe(false);
  });

  it("should not flag SSR when both sides have almost no real text", async () => {
    // Low-text app UI (e.g. canvas apps): a high ratio on a few dozen chars
    // used to qualify as an "SSR match" because the SSR branch had no minimum
    mockFetchedHTML(
      "<html><body><div>Open a file to begin drawing</div></body></html>",
    );
    document.body.innerHTML = "<div>Open a file to begin drawing now</div>";

    const result = await window.compareInitialVsRendered();

    expect(result.contentRatio).toBeGreaterThan(0.7);
    expect(result.isLikelySSR).toBe(false);
    expect(result.isLikelyCSR).toBe(false);
  });

  it("should expose the parsed raw document for other detectors", async () => {
    mockFetchedHTML("<html><body><div data-reactroot>x</div></body></html>");
    document.body.innerHTML = `<p>${LONG_TEXT}</p>`;

    const result = await window.compareInitialVsRendered();

    expect(result.rawDocument.querySelector("[data-reactroot]")).not.toBeNull();
  });

  it("should return null when the fetch fails", async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error("network error"));

    expect(await window.compareInitialVsRendered()).toBeNull();
  });

  it("should return null on a non-OK response", async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: false, status: 403 });

    expect(await window.compareInitialVsRendered()).toBeNull();
  });
});
