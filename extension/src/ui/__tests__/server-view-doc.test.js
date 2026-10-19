import { describe, it, expect } from "vitest";

import "../server-view-doc.js";

const {
  MAX_HTML_CHARS,
  STORAGE_PREFIX,
  capHtml,
  prepareSrcdoc,
  createServerFrame,
  newId,
  storageArea,
} = window.SSRServerView;

function parse(srcdoc) {
  return new DOMParser().parseFromString(srcdoc, "text/html");
}

describe("capHtml", () => {
  it("keeps HTML under the limit unchanged", () => {
    expect(capHtml("<p>hi</p>")).toEqual({ html: "<p>hi</p>", truncated: false });
  });

  it("slices oversized HTML to the exact limit", () => {
    const result = capHtml("x".repeat(MAX_HTML_CHARS + 1));

    expect(result.html).toHaveLength(MAX_HTML_CHARS);
    expect(result.truncated).toBe(true);
  });

  it("turns null into an empty string", () => {
    expect(capHtml(null)).toEqual({ html: "", truncated: false });
  });
});

describe("prepareSrcdoc", () => {
  it("puts an absolute base first in head and preserves the doctype", () => {
    const { srcdoc, baseHref } = prepareSrcdoc(
      '<!doctype html><html><head><title>Page</title></head><body><p>Page</p></body></html>',
      "https://example.com/a/b",
    );
    const doc = parse(srcdoc);

    expect(doc.head.firstElementChild.tagName).toBe("BASE");
    expect(doc.head.firstElementChild.getAttribute("href")).toBe("https://example.com/a/b");
    expect(baseHref).toBe("https://example.com/a/b");
    expect(doc.doctype?.name).toBe("html");
  });

  it("adds a head and base for HTML without a head", () => {
    const { srcdoc, baseHref } = prepareSrcdoc("<p>hi</p>", "https://example.com/a/b");
    const doc = parse(srcdoc);

    expect(doc.head.firstElementChild.tagName).toBe("BASE");
    expect(doc.head.firstElementChild.getAttribute("href")).toBe("https://example.com/a/b");
    expect(doc.body.textContent).toContain("hi");
    expect(baseHref).toBe("https://example.com/a/b");
  });

  it("replaces existing bases with one absolute base", () => {
    const { srcdoc, baseHref } = prepareSrcdoc(
      '<html><head><base href="/docs/"><base target="_blank"></head><body></body></html>',
      "https://example.com/a/b",
    );
    const doc = parse(srcdoc);

    expect(doc.querySelectorAll("base")).toHaveLength(1);
    expect(doc.querySelector("base").getAttribute("href")).toBe("https://example.com/docs/");
    expect(baseHref).toBe("https://example.com/docs/");
  });

  it("falls back to the page URL for a javascript base", () => {
    const { srcdoc, baseHref } = prepareSrcdoc(
      '<base href="javascript:alert(1)"><p>Page</p>',
      "https://example.com/a/b",
    );

    expect(parse(srcdoc).querySelector("base").getAttribute("href")).toBe("https://example.com/a/b");
    expect(baseHref).toBe("https://example.com/a/b");
  });

  it("does not add a base for a non-http page URL", () => {
    const { srcdoc, baseHref } = prepareSrcdoc("<p>Page</p>", "chrome://x");

    expect(parse(srcdoc).querySelector("base")).toBeNull();
    expect(baseHref).toBeNull();
  });

  it("strips all refresh metas while keeping other metas", () => {
    const { srcdoc } = prepareSrcdoc(
      '<meta charset="utf-8"><meta http-equiv="content-type" content="text/html"><meta http-equiv="refresh" content="0"><meta http-equiv=" Refresh " content="0">',
      "https://example.com/",
    );
    const doc = parse(srcdoc);

    expect(doc.querySelectorAll('meta[http-equiv="refresh"], meta[http-equiv=" Refresh "]')).toHaveLength(0);
    expect(doc.querySelector('meta[charset="utf-8"]')).not.toBeNull();
    expect(doc.querySelector('meta[http-equiv="content-type"]')).not.toBeNull();
  });

  it("passes through the truncation flag", () => {
    expect(prepareSrcdoc("<p>abcdef</p>", "https://example.com/", { maxChars: 5 }).truncated).toBe(
      true,
    );
  });

  it("keeps hostile HTML inert and assigns it only to a sandboxed frame", () => {
    delete window.__pwned;
    delete window.__pwned2;
    const hostile =
      '</iframe><script>window.__pwned = true</script><img src=x onerror="window.__pwned2=true">';
    const { srcdoc } = prepareSrcdoc(hostile, "https://example.com/");
    const container = document.createElement("div");
    const scriptsBefore = document.querySelectorAll("script").length;
    const frame = createServerFrame(document, srcdoc, "t");

    container.appendChild(frame);

    expect(frame.getAttribute("sandbox")).toBe("");
    if (frame.sandbox && typeof frame.sandbox.length === "number") {
      expect(frame.sandbox.length).toBe(0);
    }
    expect(frame.getAttribute("sandbox")).not.toContain("allow-scripts");
    expect(container.children).toHaveLength(1);
    expect(document.querySelectorAll("script")).toHaveLength(scriptsBefore);
    expect(window.__pwned).toBeUndefined();
    expect(window.__pwned2).toBeUndefined();
    expect(frame.srcdoc).toBe(srcdoc);
  });
});

describe("newId", () => {
  it("returns distinct 24-character hexadecimal IDs", () => {
    const first = newId();
    const second = newId();

    expect(first).toMatch(/^[\da-f]{24}$/);
    expect(second).toMatch(/^[\da-f]{24}$/);
    expect(second).not.toBe(first);
  });
});

describe("storageArea", () => {
  it("prefers session storage", () => {
    const session = {};
    const local = {};

    expect(storageArea({ storage: { session, local } })).toEqual({
      area: session,
      deleteAfterRead: false,
    });
  });

  it("uses local storage when session storage is unavailable", () => {
    const local = {};

    expect(storageArea({ storage: { local } })).toEqual({
      area: local,
      deleteAfterRead: true,
    });
    expect(STORAGE_PREFIX).toBe("serverView:");
  });
});
