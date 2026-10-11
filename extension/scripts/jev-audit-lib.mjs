/**
 * Pure helpers for audit-jev.mjs: build the Jev request, call the TypeSafe
 * System One API, and compare Jev's answer with the detector's verdict.
 *
 * Jev is weak at counting and numeric comparison (docs.typesafe.ai,
 * "Jev 1.13 jaggedness"), so it only gets text excerpts; every number and
 * every threshold stays in this file.
 */

import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const {
  API_URL,
  MODEL,
  EXCERPT_CHARS,
  excerpt,
  buildState,
  buildQuestions: buildNoulQuestions,
} = require('../src/ui/jev.js');

export { API_URL, MODEL, EXCERPT_CHARS, excerpt, buildState };

export const REVIEW_CONFIDENCE = 0.6;

/** Mirrors backend/lib/db.ts and validate-detection.mjs. */
export function bucket(renderType) {
  if (/hybrid|mixed/i.test(renderType)) return 'HYBRID';
  if (/ssr/i.test(renderType)) return 'SSR';
  if (/csr/i.test(renderType)) return 'CSR';
  return 'ERROR';
}

const RENDERING_OPTIONS = {
  SSR:
    'The server HTML already contains the main content a visitor sees in `rendered_text`; JavaScript, if any, only adds interactivity or small widgets.',
  CSR:
    'The server HTML is an application shell (mount point, scripts, loading placeholder, or only boilerplate such as a noscript notice or cookie banner); the main content in `rendered_text` is produced by JavaScript in the browser.',
  HYBRID:
    'The server HTML contains part of the main content, but whole sections of `rendered_text` (not just small widgets) are missing from it and are filled in by JavaScript.',
};

/**
 * The verdict comes from the `content_in_initial_html` Noul, thresholded in
 * code (docs: "atomic questions, composed in code"). The rendering Choice is
 * kept for the report only: on the 22 ground-truth sites it called most
 * Next.js/Nuxt/Remix pages CSR at low confidence and flipped with option
 * order, while the Noul separated SSR from CSR cleanly.
 */
export function buildQuestions() {
  return {
    rendering: {
      type: 'choice',
      instructions:
        'How was the main content of this page rendered? Compare `initial_html_text` and `initial_body_markup` with `rendered_text`.',
      criteria: RENDERING_OPTIONS,
    },
    ...buildNoulQuestions(),
  };
}

export async function askJev(state, { apiKey, fetchImpl = fetch, model = MODEL, retries = 3, sleep } = {}) {
  if (!apiKey) throw new Error('TYPESAFE_API_KEY is not set');
  const wait = sleep ?? ((ms) => new Promise((r) => setTimeout(r, ms)));
  const body = JSON.stringify({ model, state, questions: buildQuestions() });

  for (let attempt = 0; ; attempt++) {
    const res = await fetchImpl(API_URL, {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body,
    });
    if (res.ok) return res.json();
    const retryable = res.status === 429 || res.status >= 500;
    if (!retryable || attempt >= retries) {
      const detail = await res.text().catch(() => '');
      throw new Error(`TypeSafe API ${res.status}: ${detail.slice(0, 200)}`);
    }
    const retryAfter = Number(res.headers?.get?.('retry-after'));
    await wait(Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter * 1000 : 500 * 2 ** attempt);
  }
}

/** Reduce a Jev response to the fields the report needs. */
export function readJev(response) {
  const a = response.answers;
  const content = a.content_in_initial_html.noul;
  return {
    model: response.model,
    bucket: content >= 0.5 ? 'SSR' : 'CSR',
    confidence: Math.abs(content - 0.5) * 2,
    choice: a.rendering.choice,
    choiceConfidence: a.rendering.confidence,
    contentInInitialHtml: content,
    emptyShell: a.empty_shell.noul,
    inputTokens: response.usage?.input_tokens ?? 0,
  };
}

/**
 * agree    — detector and Jev pick the same bucket
 * review   — they disagree and Jev is confident: look at this site
 * unsure   — they disagree but Jev is not confident
 *
 * Jev's verdict is binary, so a detector HYBRID counts as agreeing with SSR:
 * both mean the server sent the main content.
 */
export function compare(ours, jev) {
  if (ours === jev.bucket || (ours === 'HYBRID' && jev.bucket === 'SSR')) return 'agree';
  return jev.confidence >= REVIEW_CONFIDENCE ? 'review' : 'unsure';
}

export function grade(bucketName, expected) {
  if (!expected?.length) return null;
  return expected.includes(bucketName);
}

/** Parse a URL list: one `url [SSR|CSR|HYBRID[,...]]` per line, `#` comments. */
export function parseUrlList(text) {
  return text
    .split('\n')
    .map((line) => line.replace(/#.*/, '').trim())
    .filter(Boolean)
    .map((line) => {
      const [url, expected] = line.split(/\s+/);
      return {
        url,
        expected: expected ? expected.toUpperCase().split(/[,|]/).filter(Boolean) : [],
      };
    });
}
