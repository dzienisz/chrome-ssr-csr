import { describe, expect, it } from "vitest";

import "../rate-prompt.js";

const { RATE_PROMPT_MIN_AGE_MS, shouldShowRatePrompt, reviewUrlFor } =
  window.SSRRatePrompt;
const now = Date.UTC(2026, 0, 15);
const eligibleState = {
  installedAt: now - RATE_PROMPT_MIN_AGE_MS,
  popupOpens: 3,
  ratePromptDone: false,
  ratePromptShown: 0,
};

describe("shouldShowRatePrompt", () => {
  it("requires a finite installation time", () => {
    expect(shouldShowRatePrompt({ ...eligibleState, installedAt: NaN }, now)).toBe(
      false,
    );
  });

  it("stays hidden just before three days and appears exactly at the threshold", () => {
    expect(
      shouldShowRatePrompt(
        { ...eligibleState, installedAt: now - RATE_PROMPT_MIN_AGE_MS + 1 },
        now,
      ),
    ).toBe(false);
    expect(shouldShowRatePrompt(eligibleState, now)).toBe(true);
  });

  it("requires three popup opens", () => {
    expect(shouldShowRatePrompt({ ...eligibleState, popupOpens: 2 }, now)).toBe(
      false,
    );
    expect(shouldShowRatePrompt(eligibleState, now)).toBe(true);
  });

  it("stays hidden after dismissal or three displays", () => {
    expect(
      shouldShowRatePrompt({ ...eligibleState, ratePromptDone: true }, now),
    ).toBe(false);
    expect(
      shouldShowRatePrompt({ ...eligibleState, ratePromptShown: 3 }, now),
    ).toBe(false);
  });
});

describe("reviewUrlFor", () => {
  it("uses the Firefox review page when the manifest identifies Gecko", () => {
    expect(reviewUrlFor({ isFirefox: true })).toBe(
      "https://addons.mozilla.org/firefox/addon/csr-vs-ssr-detector/reviews/",
    );
  });

  it("uses the Edge listing for Edge user agents", () => {
    expect(reviewUrlFor({ userAgent: "Mozilla/5.0 Edg/123.0" })).toBe(
      "https://microsoftedge.microsoft.com/addons/detail/ffnkjnckfaboknffjlfenkbjfhmoahih",
    );
  });

  it("uses the Chrome Web Store review page by default", () => {
    expect(reviewUrlFor({ userAgent: "Mozilla/5.0 Chrome/123.0" })).toBe(
      "https://chromewebstore.google.com/detail/csr-vs-ssr-detector/fhiopdjeekafnhmfbcfoolhejdgjpkgg/reviews",
    );
  });
});
