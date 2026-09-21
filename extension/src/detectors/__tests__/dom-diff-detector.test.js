import { describe, it, expect, beforeEach } from "vitest";

import "../dom-diff-detector.js";

/**
 * Parse a raw-HTML string the way comparison-detector does, so the fixtures
 * here exercise the same document shape the detector sees in the browser.
 */
function rawDocumentFrom(html) {
  return new DOMParser().parseFromString(html, "text/html");
}

const PROSE =
  "Server-side rendering means the HTML that reaches the browser already contains the text a reader came for, which is what search crawlers and slow devices actually need.";

describe("detectDomDiff", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
  });

  it("reports unavailable when there is no pre-JavaScript document", () => {
    const result = window.detectDomDiff(null);

    expect(result.details.domDiff.available).toBe(false);
    expect(result.signals).toEqual([]);
  });

  it("attributes an untouched page entirely to the server", () => {
    const html = `<body><main><p>${PROSE}</p></main><footer><p>Footer text that is long enough to count as a region.</p></footer></body>`;
    document.body.innerHTML = html.replace(/<\/?body>/g, "");

    const { details } = window.detectDomDiff(rawDocumentFrom(html));

    expect(details.domDiff.serverSharePct).toBe(100);
    expect(details.domDiff.clientChars).toBe(0);
    expect(details.domDiff.regions.every((r) => r.origin === "server")).toBe(true);
  });

  it("names the container JavaScript filled in", () => {
    const raw = rawDocumentFrom('<body><div id="root"></div></body>');
    document.body.innerHTML = `<div id="root"><header><p>Site header with enough text to register.</p></header><main><p>${PROSE}</p></main></div>`;

    const { details } = window.detectDomDiff(raw);

    expect(details.domDiff.biggestClientRegion.key).toBe("#root");
    expect(details.domDiff.biggestClientRegion.addedChars).toBeGreaterThan(100);
    expect(details.domDiff.serverSharePct).toBe(0);
  });

  it("splits a server-rendered container into its landmarks", () => {
    const html = `<div id="page"><header><p>The masthead of the site, long enough to be a region.</p></header><main><p>${PROSE}</p></main><footer><p>Small print at the bottom of every page here.</p></footer></div>`;
    document.body.innerHTML = html;

    const { details } = window.detectDomDiff(rawDocumentFrom(`<body>${html}</body>`));

    const labels = details.domDiff.regions.map((region) => region.label);
    expect(labels).toContain("Header");
    expect(labels).toContain("Main content");
    expect(labels).toContain("Footer");
    expect(labels).not.toContain("#page");
  });

  it("does not split prose into one region per paragraph", () => {
    const html = `<main><p>${PROSE}</p><p>${PROSE}</p><p>${PROSE}</p></main>`;
    document.body.innerHTML = html;

    const { details } = window.detectDomDiff(rawDocumentFrom(`<body>${html}</body>`));

    expect(details.domDiff.regions).toHaveLength(1);
    expect(details.domDiff.regions[0].label).toBe("Main content");
  });

  it("keeps a landmark that wraps a single paragraph", () => {
    const html = `<footer><p>${PROSE}</p></footer>`;
    document.body.innerHTML = html;

    const { details } = window.detectDomDiff(rawDocumentFrom(`<body>${html}</body>`));

    expect(details.domDiff.regions.map((r) => r.label)).toEqual(["Footer"]);
  });

  it("marks a partially hydrated region as mixed", () => {
    const raw = rawDocumentFrom(
      '<body><section id="feed"><p>Two items arrived from the server in this feed section here.</p></section></body>',
    );
    document.body.innerHTML = `<section id="feed"><p>Two items arrived from the server in this feed section here.</p><p>${PROSE}</p></section>`;

    const { details } = window.detectDomDiff(raw);

    expect(details.domDiff.regions[0].origin).toBe("mixed");
    expect(details.domDiff.regions[0].addedChars).toBeGreaterThan(0);
  });

  it("reports server and client regions living side by side", () => {
    const raw = rawDocumentFrom(
      `<body><main><p>${PROSE}</p></main><aside id="widget"></aside></body>`,
    );
    document.body.innerHTML = `<main><p>${PROSE}</p></main><aside id="widget"><p>${PROSE}</p></aside>`;

    const { details, signals } = window.detectDomDiff(raw);

    expect(details.domDiff.serverRegionCount).toBeGreaterThan(0);
    expect(details.domDiff.clientRegionCount).toBeGreaterThan(0);
    expect(signals.some((signal) => signal.id === "diff.mixedLayout")).toBe(true);
  });

  it("counts the elements JavaScript added", () => {
    const raw = rawDocumentFrom('<body><div id="root"></div></body>');
    document.body.innerHTML = `<div id="root"><ul><li>${PROSE}</li><li>${PROSE}</li></ul></div>`;

    const { details } = window.detectDomDiff(raw);

    expect(details.domDiff.rawElements).toBe(1);
    expect(details.domDiff.elementsAddedByJs).toBeGreaterThan(2);
  });

  it("ignores scripts and styles when measuring text", () => {
    const html = `<main><style>.a{color:red}</style><script>var x = "${"y".repeat(500)}";</script><p>${PROSE}</p></main>`;
    document.body.innerHTML = html;

    const { details } = window.detectDomDiff(rawDocumentFrom(`<body>${html}</body>`));

    expect(details.domDiff.regions[0].renderedChars).toBeLessThan(PROSE.length + 20);
  });

  it("excludes the extension's own probe element", () => {
    const html = `<main><p>${PROSE}</p></main>`;
    document.body.innerHTML = `${html}<meta id="ssr-detector-probe-data" data-ssr-detector-snapshot='{"navigationCount":3}'>`;

    const { details } = window.detectDomDiff(rawDocumentFrom(`<body>${html}</body>`));

    expect(details.domDiff.regions).toHaveLength(1);
    expect(details.domDiff.renderedElements).toBe(details.domDiff.rawElements);
  });

  it("survives an id that is not a valid selector on its own", () => {
    const html = '<div id="a.b:c"><p>An id chosen by the page, not by us, with CSS syntax in it.</p></div>';
    document.body.innerHTML = html;

    expect(() => window.detectDomDiff(rawDocumentFrom(`<body>${html}</body>`))).not.toThrow();
  });

  it("never moves the score or the indicator list", () => {
    const html = `<main><p>${PROSE}</p></main>`;
    document.body.innerHTML = html;

    const result = window.detectDomDiff(rawDocumentFrom(`<body>${html}</body>`));

    expect(result.ssrScore).toBe(0);
    expect(result.csrScore).toBe(0);
    expect(result.indicators).toEqual([]);
    expect(result.signals.every((signal) => signal.impact === "info")).toBe(true);
  });

  it("returns a JSON-serializable result with no DOM references", () => {
    const html = `<main><p>${PROSE}</p></main>`;
    document.body.innerHTML = html;

    const result = window.detectDomDiff(rawDocumentFrom(`<body>${html}</body>`));

    expect(() => JSON.stringify(result)).not.toThrow();
    expect(JSON.stringify(result)).not.toContain("<main");
  });
});

describe("re-running on the same document", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
  });

  // The popup's re-run button and the panel's re-run-on-navigation both
  // analyze a document that is still on screen. The memo is keyed by live
  // elements that stay reachable, so nothing evicts itself.
  it("measures the current DOM, not the DOM of the previous run", () => {
    const raw = rawDocumentFrom('<body><main id="feed"></main></body>');
    const main = document.createElement("main");
    main.id = "feed";
    main.innerHTML = `<p>${PROSE}</p>`;
    document.body.appendChild(main);

    const first = window.detectDomDiff(raw);
    const firstChars = first.details.domDiff.regions[0].renderedChars;

    // The page keeps loading: JavaScript appends a second screen of content.
    main.innerHTML += `<p>${PROSE}</p><p>${PROSE}</p>`;

    const second = window.detectDomDiff(raw);
    const secondChars = second.details.domDiff.regions[0].renderedChars;

    expect(secondChars).toBeGreaterThan(firstChars);
    expect(second.details.domDiff.clientChars).toBeGreaterThan(
      first.details.domDiff.clientChars,
    );
  });

  it("reports content that disappeared between runs", () => {
    const raw = rawDocumentFrom(`<body><main id="feed"><p>${PROSE}</p></main></body>`);
    const main = document.createElement("main");
    main.id = "feed";
    main.innerHTML = `<p>${PROSE}</p>`;
    document.body.appendChild(main);

    const before = window.detectDomDiff(raw).details.domDiff.regions[0].renderedChars;
    main.innerHTML = "<p>Short.</p>";
    const after = window.detectDomDiff(raw).details.domDiff;

    expect(before).toBeGreaterThan(100);
    // The region is now too small to be reported at all — which is only
    // visible if the second run re-measured it.
    expect(after.regions.some((r) => r.renderedChars === before)).toBe(false);
  });
});
