import { describe, it, expect, vi, afterEach } from "vitest";

// Import the detector module
import "../comparison-detector.js";

function mockFetchedHTML(html) {
  global.fetch = vi.fn().mockResolvedValue({
    ok: true,
    text: async () => html,
  });
}

const LONG_TEXT = "Real user-visible article text. ".repeat(20); // ~640 chars
const WORDS = Array.from({ length: 100 }, (_, i) => `articleword${i}`);

function wordText(count) {
  return WORDS.slice(0, count).join(" ");
}

let restoreVisibility;

function stubVisibility({
  hiddenElements = [],
  displayContents = [],
  withCheckVisibility = true,
} = {}) {
  const checkVisibilityDescriptor = Object.getOwnPropertyDescriptor(
    Element.prototype,
    "checkVisibility",
  );
  const getComputedStyleDescriptor = Object.getOwnPropertyDescriptor(
    globalThis,
    "getComputedStyle",
  );
  const hidden = new Set(hiddenElements);
  const contents = new Set(displayContents);
  const checkVisibility = vi.fn(function () {
    return !hidden.has(this);
  });

  if (withCheckVisibility) {
    Object.defineProperty(Element.prototype, "checkVisibility", {
      configurable: true,
      value: checkVisibility,
    });
  } else {
    delete Element.prototype.checkVisibility;
  }
  Object.defineProperty(globalThis, "getComputedStyle", {
    configurable: true,
    writable: true,
    value: vi.fn((el) => ({
      display: contents.has(el) ? "contents" : "block",
    })),
  });

  restoreVisibility = () => {
    if (checkVisibilityDescriptor) {
      Object.defineProperty(
        Element.prototype,
        "checkVisibility",
        checkVisibilityDescriptor,
      );
    } else {
      delete Element.prototype.checkVisibility;
    }
    if (getComputedStyleDescriptor) {
      Object.defineProperty(
        globalThis,
        "getComputedStyle",
        getComputedStyleDescriptor,
      );
    } else {
      delete globalThis.getComputedStyle;
    }
  };
  return checkVisibility;
}

afterEach(() => {
  restoreVisibility?.();
  restoreVisibility = null;
});

function oldExtractVisibleText(body) {
  if (!body) return "";
  const clone = body.cloneNode(true);
  clone
    .querySelectorAll(
      "script, style, noscript, template, #ssr-detector-probe-data",
    )
    .forEach((el) => el.remove());
  return (clone.textContent || "").replace(/\s+/g, " ").trim();
}

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

  it("never filters DOMParser text even when visibility checks say false", () => {
    const doc = new DOMParser().parseFromString(
      "<body><p>Visible server text.</p><div>Hidden parser text.</div></body>",
      "text/html",
    );
    stubVisibility({
      hiddenElements: [doc.body, ...doc.body.querySelectorAll("*")],
    });

    expect(window.extractVisibleText(doc.body)).toBe(
      "Visible server text.Hidden parser text.",
    );
    expect(window.extractVisibleWords(doc.body)).toEqual([
      "visible",
      "server",
      "text",
      "hidden",
      "parser",
      "text",
    ]);
  });

  it("keeps display:contents wrapper children visible", () => {
    document.body.innerHTML =
      "<div id='wrapper'><p>Visible wrapper children.</p></div>";
    const wrapper = document.querySelector("#wrapper");
    stubVisibility({ hiddenElements: [wrapper], displayContents: [wrapper] });

    expect(window.extractVisibleText(document.body)).toBe(
      "Visible wrapper children.",
    );
    expect(window.extractVisibleWords(document.body)).toEqual([
      "visible",
      "wrapper",
      "children",
    ]);
  });

  it("does not filter when the live body is hidden", () => {
    document.body.innerHTML =
      "<p>Visible words.</p><aside>Hidden words.</aside>";
    const aside = document.querySelector("aside");
    stubVisibility({ hiddenElements: [document.body, aside] });

    expect(window.extractVisibleText(document.body)).toBe(
      "Visible words.Hidden words.",
    );
    expect(window.extractVisibleWords(document.body)).toEqual([
      "visible",
      "words",
      "hidden",
      "words",
    ]);
  });

  it("does not filter when checkVisibility is unavailable", () => {
    document.body.innerHTML =
      "<p>Visible words.</p><aside>Hidden words.</aside>";
    stubVisibility({ withCheckVisibility: false });

    expect(window.extractVisibleText(document.body)).toBe(
      "Visible words.Hidden words.",
    );
    expect(window.extractVisibleWords(document.body)).toEqual([
      "visible",
      "words",
      "hidden",
      "words",
    ]);
  });

  it("skips hidden text inside open shadow roots", () => {
    const host = document.createElement("article");
    const shadowRoot = host.attachShadow({ mode: "open" });
    shadowRoot.innerHTML =
      "<p id='hidden'>Hidden shadow text.</p><p>Visible shadow text.</p>";
    document.body.replaceChildren(host);
    stubVisibility({
      hiddenElements: [shadowRoot.querySelector("#hidden")],
    });

    expect(window.extractVisibleText(document.body)).toBe(
      "Visible shadow text.",
    );
    expect(window.extractVisibleWords(document.body)).toEqual([
      "visible",
      "shadow",
      "text",
    ]);
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

  it("matches the previous extractor for varied shadow-free HTML", () => {
    const samples = [
      `<p>Text <span>inside <strong>nested inline</strong> elements</span>.</p>
       <!-- ignored comment --><p>  Spaced   text &amp; entities &#33; </p>`,
      `<script>ignored script text</script><style>ignored CSS</style>
       <noscript>ignored fallback</noscript>
       <template><p>ignored template content</p></template>
       <p>Visible &copy; text</p>`,
      `<!-- start --><div>Before<!-- middle --> after</div>
       <p>A&nbsp;B &lt; C</p>`,
    ];

    for (const sample of samples) {
      const doc = new DOMParser().parseFromString(
        `<body>${sample}</body>`,
        "text/html",
      );
      expect(window.extractVisibleText(doc.body)).toBe(
        oldExtractVisibleText(doc.body),
      );
    }
  });

  it("counts text in open shadow roots and excludes shadow scripts and styles", () => {
    const host = document.createElement("article");
    const shadowRoot = host.attachShadow({ mode: "open" });
    shadowRoot.innerHTML =
      "<p>Open shadow text</p><script>ignored shadow script</script>" +
      "<style>ignored shadow style</style>";
    document.body.replaceChildren(host);

    expect(window.extractVisibleText(document.body)).toBe("Open shadow text");
  });

  it("walks deeply nested open shadow roots iteratively", () => {
    const host = document.createElement("x-host");
    let current = host;

    for (let i = 0; i < 119; i++) {
      const shadowRoot = current.attachShadow({ mode: "open" });
      if (i === 118) {
        shadowRoot.appendChild(document.createTextNode("Deep shadow text"));
      } else {
        current = document.createElement("x-host");
        shadowRoot.appendChild(current);
      }
    }

    document.body.replaceChildren(host);
    expect(window.extractVisibleText(document.body)).toBe("Deep shadow text");
  });

  it("counts text inside declarative shadow templates but skips ordinary templates", () => {
    const doc = new DOMParser().parseFromString(
      `<body><article>
        <template shadowrootmode="open"><p>Declarative shadow text</p></template>
        <template><p>Ordinary template text</p></template>
        Light DOM text
      </article></body>`,
      "text/html",
    );

    expect(window.extractVisibleText(doc.body)).toBe(
      "Declarative shadow text Light DOM text",
    );
  });

  it("counts slotted light text once without walking assigned nodes through the slot", () => {
    const host = document.createElement("article");
    const lightText = document.createElement("span");
    lightText.slot = "content";
    lightText.textContent = "Slotted light text";
    host.appendChild(lightText);
    const shadowRoot = host.attachShadow({ mode: "open" });
    shadowRoot.innerHTML = "<p>Shadow root text</p><slot name='content'></slot>";
    document.body.replaceChildren(host);

    const text = window.extractVisibleText(document.body);
    expect(text).toBe("Shadow root textSlotted light text");
    expect(text.match(/Slotted light text/g)).toHaveLength(1);
  });
});

describe("extractVisibleWords", () => {
  it("separates text at element boundaries", () => {
    document.body.innerHTML = "<span>Home</span><span>About</span>";

    expect(window.extractVisibleWords(document.body)).toEqual(["home", "about"]);
  });

  it("follows the visible-text skips and shadow-tree walk", () => {
    const doc = new DOMParser().parseFromString(
      `<body>
        <span>Home</span>
        <script>script hidden</script>
        <style>style hidden</style>
        <noscript>noscript hidden</noscript>
        <template><p>ordinary hidden</p></template>
        <template shadowrootmode="open"><p>shadow visible</p></template>
      </body>`,
      "text/html",
    );
    const bridge = doc.createElement("div");
    bridge.id = "ssr-detector-probe-data";
    bridge.textContent = "bridge hidden";
    doc.body.appendChild(bridge);

    expect(window.extractVisibleWords(doc.body)).toEqual([
      "home",
      "shadow",
      "visible",
    ]);
  });

  it("walks open shadow roots", () => {
    document.body.innerHTML = "<div id='host'><span>light content</span></div>";
    document.querySelector("#host").attachShadow({ mode: "open" }).innerHTML =
      "<span>shadow content</span>";

    expect(window.extractVisibleWords(document.body)).toEqual([
      "shadow",
      "content",
      "light",
      "content",
    ]);
  });

  it("extracts CJK words", () => {
    const doc = new DOMParser().parseFromString(
      "<body><p>日本語の記事を読んでいます。</p></body>",
      "text/html",
    );

    expect(window.extractVisibleWords(doc.body).length).toBeGreaterThan(0);
  });
});

describe("wordCoverage", () => {
  it("counts duplicate rendered words only as often as they occur in raw text", () => {
    expect(window.wordCoverage(["word"], ["word", "word", "word", "word", "word"])).toEqual({
      matched: 1,
      coverage: 0.2,
    });
  });

  it("returns zero coverage for an empty rendered word list", () => {
    expect(window.wordCoverage(["word"], [])).toEqual({ matched: 0, coverage: 0 });
  });
});

describe("compareInitialVsRendered", () => {
  it("excludes and reports hidden rendered words", async () => {
    const hiddenText = "Donation campaign words are hidden and ignored.";
    document.body.innerHTML =
      `<article>${LONG_TEXT}</article><div id="banner">${hiddenText}</div>`;
    const banner = document.querySelector("#banner");
    const checkVisibility = stubVisibility({ hiddenElements: [banner] });
    mockFetchedHTML(
      `<html><body><article>${LONG_TEXT}</article><div>${hiddenText}</div></body></html>`,
    );

    expect(window.extractVisibleText(document.body)).toBe(LONG_TEXT.trim());
    expect(window.extractVisibleWords(document.body)).not.toContain("donation");

    const result = await window.compareInitialVsRendered();

    expect(result.renderedLength).toBe(LONG_TEXT.trim().length);
    expect(result.renderedWordCount).toBe(
      window.extractVisibleWords(document.body).length,
    );
    expect(result.hiddenWordCount).toBe(7);
    expect(
      window.extractVisibleWords(document.body, { includeHidden: true }).length -
        result.renderedWordCount,
    ).toBe(result.hiddenWordCount);
    expect(checkVisibility.mock.calls.every((args) => args.length === 0)).toBe(
      true,
    );
  });

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
    expect(result).toMatchObject({
      wordCoverage: 0,
      rawWordCount: 0,
      measure: "words",
    });
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
    expect(result).toMatchObject({
      wordCoverage: 1,
      rawWordCount: result.renderedWordCount,
      matchedWordCount: result.renderedWordCount,
      measure: "words",
    });
  });

  it("flags partial word coverage at 0.3 and 0.39 but not at 0.4 or 0.19", async () => {
    const compareWords = async (rawWordCount) => {
      const rawText = wordText(rawWordCount);
      const renderedText = wordText(100);
      mockFetchedHTML(`<html><body><main>${rawText}</main></body></html>`);
      document.body.innerHTML = `<main>${renderedText}</main>`;
      return window.compareInitialVsRendered();
    };

    const partial = await compareWords(30);
    expect(partial.wordCoverage).toBe(0.3);
    expect(partial.isPartialCSR).toBe(true);

    const upperPartial = await compareWords(39);
    expect(upperPartial.wordCoverage).toBe(0.39);
    expect(upperPartial.isPartialCSR).toBe(true);

    const upperBound = await compareWords(40);
    expect(upperBound.wordCoverage).toBe(0.4);
    expect(upperBound.isPartialCSR).toBe(false);

    const likelyCsr = await compareWords(19);
    expect(likelyCsr.wordCoverage).toBe(0.19);
    expect(likelyCsr.isLikelyCSR).toBe(true);
    expect(likelyCsr.isPartialCSR).toBe(false);
    expect(likelyCsr.isDecisiveCSR).toBe(true);

    const decisiveBoundary = await compareWords(20);
    expect(decisiveBoundary.wordCoverage).toBe(0.2);
    expect(decisiveBoundary.isLikelyCSR).toBe(false);
    expect(decisiveBoundary.isPartialCSR).toBe(true);
    expect(decisiveBoundary.isDecisiveCSR).toBe(false);
  });

  it("flags partial content with short raw text when rendered text is long enough", async () => {
    mockFetchedHTML(`<html><body><main>${wordText(23)}</main></body></html>`);
    document.body.innerHTML = `<main>${wordText(100)}</main>`;

    const result = await window.compareInitialVsRendered();

    expect(result.wordCoverage).toBe(0.23);
    expect(result.rawWordCount).toBe(23);
    expect(result.isPartialCSR).toBe(true);
  });

  it("uses word coverage to identify same-length skeleton placeholders as CSR", async () => {
    const nav = "Home About";
    const placeholders = "Loading content please wait. ".repeat(48);
    const renderedArticle = WORDS.join(" ");
    mockFetchedHTML(
      `<html><body><nav>${nav}</nav><main>${placeholders}</main></body></html>`,
    );
    document.body.innerHTML =
      `<nav>${nav}</nav><main>${renderedArticle}</main>`;

    const result = await window.compareInitialVsRendered();

    expect(result.contentRatio).toBeGreaterThan(0.9);
    expect(result.contentRatio).toBeLessThan(1.1);
    expect(result.wordCoverage).toBeLessThan(0.2);
    expect(result.isLikelyCSR).toBe(true);
    expect(result.isDecisiveCSR).toBe(true);
    expect(result.isLikelySSR).toBe(false);
  });

  it("recognizes the same words in a different order as SSR", async () => {
    mockFetchedHTML(
      `<html><body><main>${WORDS.join(" ")}</main></body></html>`,
    );
    document.body.innerHTML =
      `<main>${WORDS.slice().reverse().join(" ")}</main>`;

    const result = await window.compareInitialVsRendered();

    expect(result.wordCoverage).toBe(1);
    expect(result.matchedWordCount).toBe(result.renderedWordCount);
    expect(result.isLikelySSR).toBe(true);
    expect(result.isLikelyCSR).toBe(false);
  });

  it("counts repeated words as a multiset", async () => {
    mockFetchedHTML("<html><body><main>word</main></body></html>");
    document.body.innerHTML = "<main>word word word word word</main>";

    const result = await window.compareInitialVsRendered();

    expect(result.wordCoverage).toBe(0.2);
    expect(result.matchedWordCount).toBe(1);
  });

  it("does not flag partial content when rendered text is too short", async () => {
    mockFetchedHTML(
      `<html><body><main>${"r".repeat(80)}</main></body></html>`,
    );
    document.body.innerHTML = `<main>${"r".repeat(200)}</main>`;

    const result = await window.compareInitialVsRendered();

    expect(result.renderedLength).toBe(window.DETECTOR_CONFIG.contentComparison.minRenderedLength);
    expect(result.isPartialCSR).toBe(false);
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

describe("parser snapshot fallback", () => {
  const originalUrl = window.location.href;
  function fnv1a(value) {
    const normalized = value.replace(/\s+/g, " ").trim();
    if (!normalized) return "";
    let hash = 0x811c9dc5;
    for (let i = 0; i < normalized.length; i++) {
      hash ^= normalized.charCodeAt(i);
      hash = Math.imul(hash, 0x01000193);
    }
    return (hash >>> 0).toString(16).padStart(8, "0");
  }
  function probeBridge(data) {
    document.querySelectorAll("#ssr-detector-probe-data").forEach((n) => n.remove());
    const bridge = document.createElement("meta");
    bridge.id = "ssr-detector-probe-data";
    bridge.setAttribute("data-ssr-detector-snapshot", JSON.stringify(data));
    document.head.appendChild(bridge);
    return bridge;
  }
  afterEach(() => {
    document.querySelectorAll("#ssr-detector-probe-data").forEach((n) => n.remove());
    window.history.replaceState({}, "", originalUrl);
  });

  it("uses the probe's parse-time length when the re-fetch is refused", async () => {
    probeBridge({
      parsedTextLength: 12,
      parsedUrlHash: fnv1a(window.location.href),
    });
    document.body.innerHTML = `<main>${LONG_TEXT}</main>`;
    global.fetch = vi.fn().mockResolvedValue({ ok: false, status: 403 });

    const result = await window.compareInitialVsRendered();

    expect(result.source).toBe("parser-snapshot");
    expect(result.rawLength).toBe(12);
    expect(result.renderedLength).toBe(LONG_TEXT.trim().length);
    expect(result.isDecisiveCSR).toBe(true);
    expect(result.isLikelySSR).toBe(false);
    expect(result.rawDocument).toBeNull();
    expect(result.responseHeaders).toBeNull();
    expect(result.wordCoverage).toBeNull();
    expect(result.rawWordCount).toBeNull();
    expect(result.renderedWordCount).toBeNull();
    expect(result.matchedWordCount).toBeNull();
    expect(result.hiddenWordCount).toBeNull();
    expect(result.measure).toBe("length");
  });

  it("flags partial content from the parser snapshot", async () => {
    probeBridge({ parsedTextLength: 300 });
    document.body.innerHTML = `<main>${"r".repeat(1000)}</main>`;
    global.fetch = vi.fn().mockResolvedValue({ ok: false, status: 403 });

    const result = await window.compareInitialVsRendered();

    expect(result.source).toBe("parser-snapshot");
    expect(result.contentRatio).toBe(0.3);
    expect(result.isPartialCSR).toBe(true);
  });

  it("uses the 0.2 decisive boundary for parser snapshots", async () => {
    document.body.innerHTML = `<main>${"r".repeat(1000)}</main>`;
    global.fetch = vi.fn().mockResolvedValue({ ok: false, status: 403 });

    probeBridge({ parsedTextLength: 190 });
    const decisive = await window.compareInitialVsRendered();
    expect(decisive.contentRatio).toBe(0.19);
    expect(decisive.isDecisiveCSR).toBe(true);

    probeBridge({ parsedTextLength: 200 });
    const boundary = await window.compareInitialVsRendered();
    expect(boundary.contentRatio).toBe(0.2);
    expect(boundary.isDecisiveCSR).toBe(false);
  });

  it("uses it when the fetch throws, and can still read as SSR", async () => {
    probeBridge({ parsedTextLength: LONG_TEXT.trim().length });
    document.body.innerHTML = `<main>${LONG_TEXT}</main>`;
    global.fetch = vi.fn().mockRejectedValue(new Error("network error"));

    const result = await window.compareInitialVsRendered();

    expect(result.source).toBe("parser-snapshot");
    expect(result.isLikelySSR).toBe(true);
    expect(result.isLikelyCSR).toBe(false);
  });

  it("returns null when the probe has no snapshot", async () => {
    probeBridge({ navigationCount: 0 });
    global.fetch = vi.fn().mockResolvedValue({ ok: false, status: 403 });

    expect(await window.compareInitialVsRendered()).toBeNull();
  });

  it("uses the parser snapshot for a long fetched document with zero word overlap", async () => {
    probeBridge({ parsedTextLength: 160 });
    document.body.innerHTML = `<main>${LONG_TEXT}</main>`;
    mockFetchedHTML(
      `<html><body><main>${"unrelated server placeholder ".repeat(20)}</main></body></html>`,
    );

    const result = await window.compareInitialVsRendered();

    expect(result.source).toBe("parser-snapshot");
    expect(result.refetchMismatch).toBe(true);
    expect(result.refetchMismatchReason).toBe("no-shared-words");
    expect(result.rawLength).toBe(160);
    expect(result.measure).toBe("length");
    expect(result.wordCoverage).toBeNull();
  });

  it("returns null for a long fetched document with zero overlap and no snapshot", async () => {
    document.body.innerHTML = `<main>${LONG_TEXT}</main>`;
    mockFetchedHTML(
      `<html><body><main>${"unrelated server placeholder ".repeat(20)}</main></body></html>`,
    );

    expect(await window.compareInitialVsRendered()).toBeNull();
  });

  it("marks a successful fetch as the source", async () => {
    mockFetchedHTML(`<html><body><main>${LONG_TEXT}</main></body></html>`);
    document.body.innerHTML = `<main>${LONG_TEXT}</main>`;

    const result = await window.compareInitialVsRendered();

    expect(result.source).toBe("fetch");
    expect(result.measure).toBe("words");
    expect(result.wordCoverage).toBe(1);
  });

  it("uses the parse-time snapshot when a successful fetch has a different title", async () => {
    probeBridge({
      parsedTextLength: LONG_TEXT.trim().length,
      parsedTitleHash: "c66a4a27",
      parsedUrlHash: fnv1a(window.location.href),
    });
    document.title = "Shop – real page";
    document.body.innerHTML = `<main>${LONG_TEXT}</main>`;
    mockFetchedHTML(
      "<html><head><title>Robot check</title></head><body>Robot check.</body></html>",
    );

    const result = await window.compareInitialVsRendered();

    expect(result.source).toBe("parser-snapshot");
    expect(result.refetchMismatch).toBe(true);
    expect(result.refetchMismatchReason).toBe("title");
    expect(result.rawLength).toBe(LONG_TEXT.trim().length);
    expect(result.rawDocument).toBeNull();
  });

  it("uses the fetched document when the title mismatch is from another URL", async () => {
    probeBridge({
      parsedTextLength: LONG_TEXT.trim().length,
      parsedTitleHash: "c66a4a27",
      parsedUrlHash: fnv1a(window.location.href),
    });
    document.body.innerHTML = `<main>${LONG_TEXT}</main>`;
    window.history.pushState({}, "", "/docs");
    mockFetchedHTML(
      `<html><head><title>Docs</title></head><body><main>${LONG_TEXT}</main></body></html>`,
    );

    const result = await window.compareInitialVsRendered();

    expect(result.source).toBe("fetch");
    expect(result.refetchMismatch).toBeUndefined();
    expect(result.rawDocument.querySelector("main").textContent).toContain(
      "Real user-visible article text.",
    );
  });

  it("uses a refused-fetch snapshot after the URL changes", async () => {
    probeBridge({
      parsedTextLength: LONG_TEXT.trim().length,
      parsedUrlHash: fnv1a(window.location.href),
    });
    window.history.pushState({}, "", "/docs");
    global.fetch = vi.fn().mockResolvedValue({ ok: false, status: 403 });

    const result = await window.compareInitialVsRendered();

    expect(result.source).toBe("parser-snapshot");
    expect(result.rawLength).toBe(LONG_TEXT.trim().length);
  });

  it("keeps the fetch path when the re-fetched title matches the probe hash", async () => {
    probeBridge({
      parsedTextLength: LONG_TEXT.trim().length,
      parsedTitleHash: "c66a4a27",
    });
    document.body.innerHTML = `<main>${LONG_TEXT}</main>`;
    mockFetchedHTML(
      `<html><head><title>Shop – real page</title></head><body><main>${LONG_TEXT}</main></body></html>`,
    );

    const result = await window.compareInitialVsRendered();

    expect(result.source).toBe("fetch");
    expect(result.refetchMismatch).toBeUndefined();
  });

  it("keeps the fetch path when the probe has no title hash", async () => {
    probeBridge({ parsedTextLength: LONG_TEXT.trim().length });
    document.body.innerHTML = `<main>${LONG_TEXT}</main>`;
    mockFetchedHTML(
      `<html><head><title>Shop – real page</title></head><body><main>${LONG_TEXT}</main></body></html>`,
    );

    const result = await window.compareInitialVsRendered();

    expect(result.source).toBe("fetch");
  });

  it("keeps the fetch path when the re-fetched title is empty", async () => {
    probeBridge({
      parsedTextLength: LONG_TEXT.trim().length,
      parsedTitleHash: "c66a4a27",
    });
    document.body.innerHTML = `<main>${LONG_TEXT}</main>`;
    mockFetchedHTML(
      `<html><body><main>${LONG_TEXT}</main></body></html>`,
    );

    const result = await window.compareInitialVsRendered();

    expect(result.source).toBe("fetch");
  });
});

describe("response header capture", () => {
  /**
   * The delivery classification is only as good as the headers it gets, and a
   * Headers object does not survive the executeScript boundary — so the
   * detector flattens it here, lowercased, the way delivery-detector expects.
   */
  function mockFetchWithHeaders(html, headerPairs, status = 200) {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status,
      text: async () => html,
      headers: {
        forEach: (callback) => {
          for (const [key, value] of headerPairs) callback(value, key);
        },
      },
    });
  }

  it("flattens the response headers into a plain object", async () => {
    mockFetchWithHeaders(`<html><body><p>${LONG_TEXT}</p></body></html>`, [
      ["X-Vercel-Cache", "HIT"],
      ["Age", "120"],
    ]);
    document.body.innerHTML = `<p>${LONG_TEXT}</p>`;

    const result = await window.compareInitialVsRendered();

    expect(result.responseHeaders).toEqual({ "x-vercel-cache": "HIT", age: "120" });
    expect(result.responseStatus).toBe(200);
  });

  it("still returns a comparison when the headers cannot be read", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: async () => `<html><body><p>${LONG_TEXT}</p></body></html>`,
      headers: {
        forEach: () => {
          throw new Error("headers unavailable");
        },
      },
    });
    document.body.innerHTML = `<p>${LONG_TEXT}</p>`;

    const result = await window.compareInitialVsRendered();

    expect(result).not.toBeNull();
    expect(result.responseHeaders).toEqual({});
  });

  it("keeps the headers out of any string serialization of the page", async () => {
    mockFetchWithHeaders(`<html><body><p>${LONG_TEXT}</p></body></html>`, [
      ["set-cookie", "session=secret"],
    ]);
    document.body.innerHTML = `<p>${LONG_TEXT}</p>`;

    const result = await window.compareInitialVsRendered();

    // The analyzer copies specific fields out of this object; the raw
    // document and source must never be among them.
    expect(Object.keys(result)).toContain("responseHeaders");
    expect(document.body.innerHTML).not.toContain("session=secret");
  });
});
