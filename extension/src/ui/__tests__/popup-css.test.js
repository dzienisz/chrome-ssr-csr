import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const css = readFileSync(join(import.meta.dirname, "../../../popup.css"), "utf8");

describe("popup.css", () => {
  // A browser action popup sizes its window from the page, so a body width
  // that depends on the viewport (vw, %) collapses against the initial,
  // narrow popup viewport.
  it("gives the popup body a fixed pixel width", () => {
    const body = css.match(/(?:^|\n)body\s*\{([^}]*)\}/);
    expect(body).not.toBeNull();
    expect(body[1]).toMatch(/(?:^|;|\s)width:\s*\d+px\s*;/);
    expect(body[1]).not.toMatch(/vw|%/);
  });
});
