(function (root) {
  const API_URL = "https://api.typesafe.ai/v1/systemone";
  const MODEL = "jev-latest";
  const EXCERPT_CHARS = 3000;

  function excerpt(text, max = EXCERPT_CHARS) {
    const clean = String(text ?? "").replace(/\s+/g, " ").trim();
    return clean.length > max ? `${clean.slice(0, max)} …[truncated]` : clean;
  }

  function buildState({ url, initialText, initialBodyMarkup, renderedText }) {
    return {
      url,
      initial_html_text: excerpt(initialText),
      initial_body_markup: excerpt(initialBodyMarkup),
      rendered_text: excerpt(renderedText),
      note:
        "`initial_html_text` and `initial_body_markup` come from the HTML the server sent, before any JavaScript ran. " +
        "`rendered_text` is what a visitor sees after JavaScript ran. Long values are truncated.",
    };
  }

  function buildQuestions() {
    return {
      content_in_initial_html: {
        type: "noul",
        instructions:
          "Does `initial_html_text` already contain the main content that a visitor reads in `rendered_text`?",
        criteria: {
          true: "The main text of the page (articles, listings, headings and body copy) is present in the server HTML.",
          false: "The main text is missing from the server HTML and only appears after JavaScript runs.",
        },
      },
      empty_shell: {
        type: "noul",
        instructions:
          "Is `initial_body_markup` an empty application shell whose visible content is produced later by JavaScript?",
      },
    };
  }

  function typedError(kind, message) {
    const error = new Error(message);
    error.kind = kind;
    return error;
  }

  function shortMessage(error) {
    if (error && error.name === "AbortError") return "Request timed out";
    const message = String((error && error.message) || "Network error")
      .replace(/\s+/g, " ")
      .trim();
    return message.slice(0, 100) || "Network error";
  }

  async function askJev(state, { apiKey, fetchImpl = fetch } = {}) {
    if (!apiKey) throw typedError("auth", "API key is missing");

    const controller = new AbortController();
    let timedOut = false;
    const timeout = setTimeout(() => {
      timedOut = true;
      controller.abort();
    }, 15_000);

    try {
      const response = await fetchImpl(API_URL, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ model: MODEL, state, questions: buildQuestions() }),
        signal: controller.signal,
      });

      if (!response.ok) {
        const kind =
          response.status === 401 || response.status === 403
            ? "auth"
            : response.status === 429
              ? "rate"
              : "api";
        throw typedError(kind, `HTTP ${response.status}`);
      }

      let payload;
      try {
        payload = await response.json();
      } catch {
        throw typedError("api", "Malformed response");
      }

      const contentInInitialHtml = payload?.answers?.content_in_initial_html?.noul;
      const emptyShell = payload?.answers?.empty_shell?.noul;
      if (
        typeof contentInInitialHtml !== "number" ||
        !Number.isFinite(contentInInitialHtml) ||
        contentInInitialHtml < 0 ||
        contentInInitialHtml > 1 ||
        typeof emptyShell !== "number" ||
        !Number.isFinite(emptyShell) ||
        emptyShell < 0 ||
        emptyShell > 1
      ) {
        throw typedError("api", "Malformed response");
      }

      return { contentInInitialHtml, emptyShell };
    } catch (error) {
      if (error && error.kind) throw error;
      throw typedError("network", timedOut ? "Request timed out" : shortMessage(error));
    } finally {
      clearTimeout(timeout);
    }
  }

  function jevVerdict(probability) {
    return probability >= 0.5 ? "server" : "browser";
  }

  function shouldOfferJev(result, settings, hasKey) {
    if (!settings?.jevEnabled || !hasKey) return false;
    const renderType = String(result?.renderType || "");
    return (
      result?.confidenceLevel === "low" ||
      /hybrid|mixed|likely/i.test(renderType) ||
      (typeof result?.confidence === "number" && result.confidence < 65)
    );
  }

  const api = {
    API_URL,
    MODEL,
    EXCERPT_CHARS,
    excerpt,
    buildState,
    buildQuestions,
    askJev,
    jevVerdict,
    shouldOfferJev,
  };

  if (root) root.SSRJev = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis);
