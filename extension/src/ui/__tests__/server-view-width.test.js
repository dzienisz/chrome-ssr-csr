import { describe, expect, it } from "vitest";

import "../server-view-width.js";

const {
  PRESETS,
  validViewport,
  buildOptions,
  defaultOptionId,
  computeFit,
  showsWidthNote,
  liveShotLabelNeeded,
} = window.SSRServerViewWidth;

describe("PRESETS", () => {
  it("contains the frozen device presets", () => {
    expect(PRESETS).toEqual([
      { id: "desktop", width: 1440, height: 900 },
      { id: "tablet", width: 768, height: 1024 },
      { id: "mobile", width: 390, height: 844 },
    ]);
    expect(Object.isFrozen(PRESETS)).toBe(true);
    expect(PRESETS.every(Object.isFrozen)).toBe(true);
  });
});

describe("validViewport and buildOptions", () => {
  it("uses the captured desktop dimensions and then the other presets", () => {
    expect(buildOptions({ width: 1440, height: 900 })).toEqual([
      { id: "desktop", width: 1440, height: 900 },
      { id: "tablet", width: 768, height: 1024 },
      { id: "mobile", width: 390, height: 844 },
    ]);
    expect(buildOptions({ width: 1280, height: 800 })[0]).toEqual({
      id: "desktop",
      width: 1280,
      height: 800,
    });
  });

  it("adds the captured window option for a narrow viewport", () => {
    expect(buildOptions({ width: 800, height: 600 })).toEqual([
      { id: "window", width: 800, height: 600 },
      { id: "desktop", width: 1440, height: 900 },
      { id: "tablet", width: 768, height: 1024 },
      { id: "mobile", width: 390, height: 844 },
    ]);
  });

  it.each([
    ["missing", undefined],
    ["below minimum", { width: 199, height: 800 }],
    ["invalid height", { width: 1280, height: 199 }],
    ["non-numeric", { width: "wide", height: 800 }],
  ])("uses the default viewport for an %s viewport", (_label, viewport) => {
    expect(validViewport(viewport)).toEqual({ width: 1280, height: 800 });
    expect(buildOptions(viewport)[0]).toEqual({ id: "desktop", width: 1280, height: 800 });
  });

  it("rounds valid fractional viewport dimensions", () => {
    expect(validViewport({ width: 1280.4, height: 800.6 })).toEqual({ width: 1280, height: 801 });
  });
});

describe("defaultOptionId", () => {
  it("selects desktop at 1024px and window below it", () => {
    expect(defaultOptionId({ width: 1024, height: 768 })).toBe("desktop");
    expect(defaultOptionId({ width: 800, height: 600 })).toBe("window");
    expect(defaultOptionId(undefined)).toBe("desktop");
  });
});

describe("computeFit", () => {
  it.each([
    [700, 1440, 900, 700 / 1440, 438, 0],
    [700, 768, 1024, 700 / 768, 933, 0],
    [700, 390, 844, 1, 844, 155],
  ])(
    "fits a %sx%s frame in a %spx pane",
    (paneWidth, frameWidth, frameHeight, scale, boxHeight, offsetX) => {
      expect(computeFit(paneWidth, frameWidth, frameHeight)).toEqual({
        scale,
        boxHeight,
        offsetX,
      });
    },
  );

  it("returns safe unscaled dimensions for a zero-width pane", () => {
    expect(computeFit(0, 1440, 900)).toEqual({ scale: 1, boxHeight: 900, offsetX: 0 });
    expect(computeFit(0, 0, 0)).toEqual({ scale: 1, boxHeight: 0, offsetX: 0 });
  });
});

describe("showsWidthNote", () => {
  it.each([
    ["desktop", false],
    ["tablet", true],
    ["mobile", true],
    ["window", false],
  ])("returns %s note visibility for %s", (id, expected) => {
    expect(showsWidthNote(id)).toBe(expected);
  });
});

describe("liveShotLabelNeeded", () => {
  it("shows the captured-window label only when widths differ", () => {
    const viewport = { width: 1280, height: 800 };
    expect(liveShotLabelNeeded({ width: 1440 }, viewport)).toBe(true);
    expect(liveShotLabelNeeded({ width: 1280 }, viewport)).toBe(false);
    expect(liveShotLabelNeeded({ width: 390 }, { width: 800, height: 600 })).toBe(true);
  });
});
