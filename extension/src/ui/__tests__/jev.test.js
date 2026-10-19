import { describe, expect, it, vi, afterEach } from "vitest";

import "../jev.js";

const {
  API_URL,
  EXCERPT_CHARS,
  MODEL,
  askJev,
  buildQuestions,
  buildState,
  excerpt,
  jevVerdict,
  shouldOfferJev,
} = window.SSRJev;

const response = (contentInInitialHtml = 0.92, emptyShell = 0.03) => ({
  ok: true,
  status: 200,
  json: async () => ({
    answers: {
      content_in_initial_html: { type: "noul", noul: contentInInitialHtml },
      empty_shell: { type: "noul", noul: emptyShell },
    },
  }),
});

afterEach(() => {
  vi.useRealTimers();
});

describe("excerpt and buildState", () => {
  it("normalizes whitespace and truncates at the shared limit", () => {
    expect(EXCERPT_CHARS).toBe(12000);
    expect(excerpt("  one \n\n two  ")).toBe("one two");
    expect(excerpt("x".repeat(10), 4)).toBe("xxxx …[truncated]");
  });

  it("preserves 12,000 characters and truncates at 12,001", () => {
    expect(excerpt("x".repeat(12000))).toBe("x".repeat(12000));
    expect(excerpt("x".repeat(12001))).toBe(`${"x".repeat(12000)} …[truncated]`);
  });

  it("builds the audit state using the same excerpt rule", () => {
    const state = buildState({
      url: "https://example.test",
      initialText: ` ${"x".repeat(12001)} `,
      initialBodyMarkup: "<main>HTML</main>",
      renderedText: "Visible text",
    });

    expect(state.url).toBe("https://example.test");
    expect(state.initial_html_text).toBe(`${"x".repeat(12000)} …[truncated]`);
    expect(state.initial_body_markup).toBe("<main>HTML</main>");
    expect(state.rendered_text).toBe("Visible text");
  });

  it("returns only the two Noul questions", () => {
    expect(Object.keys(buildQuestions())).toEqual([
      "content_in_initial_html",
      "empty_shell",
    ]);
    expect(buildQuestions().content_in_initial_html.type).toBe("noul");
    expect(buildQuestions().empty_shell.type).toBe("noul");
  });
});

describe("askJev", () => {
  it("posts the state and Noul questions with the bearer key", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(response());
    const state = { url: "https://example.test" };

    await expect(askJev(state, { apiKey: "test-key", fetchImpl })).resolves.toEqual({
      contentInInitialHtml: 0.92,
      emptyShell: 0.03,
    });

    expect(fetchImpl).toHaveBeenCalledTimes(1);
    const [url, init] = fetchImpl.mock.calls[0];
    expect(url).toBe(API_URL);
    expect(init.method).toBe("POST");
    expect(init.headers).toEqual({
      Authorization: "Bearer test-key",
      "Content-Type": "application/json",
    });
    expect(init.signal).toBeInstanceOf(AbortSignal);
    expect(JSON.parse(init.body)).toEqual({
      model: MODEL,
      state,
      questions: buildQuestions(),
    });
  });

  it.each([401, 403])("marks HTTP %i as an authentication error", async (status) => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: false,
      status,
      text: async () => "not shown",
    });
    await expect(askJev({}, { apiKey: "bad", fetchImpl })).rejects.toMatchObject({
      kind: "auth",
    });
  });

  it("marks HTTP 429 as a rate error", async () => {
    const fetchImpl = vi.fn().mockResolvedValue({ ok: false, status: 429 });
    await expect(askJev({}, { apiKey: "key", fetchImpl })).rejects.toMatchObject({
      kind: "rate",
    });
  });

  it("marks other non-2xx responses as API errors", async () => {
    const fetchImpl = vi.fn().mockResolvedValue({ ok: false, status: 500 });
    await expect(askJev({}, { apiKey: "key", fetchImpl })).rejects.toMatchObject({
      kind: "api",
    });
  });

  it("marks malformed or out-of-range probabilities as API errors", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(response(1.1, 0.2));
    await expect(askJev({}, { apiKey: "key", fetchImpl })).rejects.toMatchObject({
      kind: "api",
    });
  });

  it("marks fetch failures and timeouts as network errors", async () => {
    await expect(
      askJev({}, { apiKey: "key", fetchImpl: vi.fn().mockRejectedValue(new Error("offline")) }),
    ).rejects.toMatchObject({ kind: "network", message: "offline" });

    vi.useFakeTimers();
    const fetchImpl = vi.fn(
      (_url, { signal }) =>
        new Promise((_resolve, reject) => {
          signal.addEventListener("abort", () => {
            const error = new Error("aborted");
            error.name = "AbortError";
            reject(error);
          });
        }),
    );
    const request = askJev({}, { apiKey: "key", fetchImpl });
    const rejection = expect(request).rejects.toMatchObject({
      kind: "network",
      message: "Request timed out",
    });
    await vi.advanceTimersByTimeAsync(15_000);
    await rejection;
  });
});

describe("jevVerdict", () => {
  it("uses the 0.5 boundary for the server/browser choice", () => {
    expect(jevVerdict(0.49)).toBe("browser");
    expect(jevVerdict(0.5)).toBe("server");
  });
});

describe("shouldOfferJev", () => {
  it.each([
    ["SSR at high confidence", { renderType: "Server-Side Rendered (SSR)", confidence: 95 }, true, true, false],
    ["SSR at low confidence level", { renderType: "Server-Side Rendered (SSR)", confidence: 95, confidenceLevel: "low" }, true, true, true],
    ["SSR at high confidence level", { renderType: "Server-Side Rendered (SSR)", confidence: 95, confidenceLevel: "high" }, true, true, false],
    ["low confidence level when disabled", { renderType: "Server-Side Rendered (SSR)", confidence: 95, confidenceLevel: "low" }, false, true, false],
    ["Hybrid", { renderType: "Hybrid/Islands Architecture", confidence: 70 }, true, true, true],
    ["CSR at high confidence", { renderType: "Client-Side Rendered (CSR)", confidence: 80 }, true, true, false],
    ["Likely CSR at low confidence", { renderType: "Likely CSR/SPA", confidence: 60 }, true, true, true],
    ["disabled", { renderType: "Hybrid/Mixed Rendering", confidence: 70 }, false, true, false],
    ["without a key", { renderType: "Likely SSR", confidence: 50 }, true, false, false],
  ])("%s", (_name, result, enabled, hasKey, expected) => {
    expect(shouldOfferJev(result, { jevEnabled: enabled }, hasKey)).toBe(expected);
  });
});
