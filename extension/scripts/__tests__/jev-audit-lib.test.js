import { describe, it, expect, vi } from 'vitest';
import {
  API_URL,
  MODEL,
  askJev,
  buildQuestions,
  buildState,
  bucket,
  compare,
  excerpt,
  grade,
  parseUrlList,
  readJev,
} from '../jev-audit-lib.mjs';

const response = (content, choice = 'CSR') => ({
  model: 'jev-1.13.0',
  answers: {
    rendering: { type: 'choice', choice, confidence: 0.4, probabilities: { [choice]: 0.6 } },
    content_in_initial_html: { type: 'noul', noul: content },
    empty_shell: { type: 'noul', noul: 0.95 },
  },
  usage: { input_tokens: 1200, output_tokens: 60 },
});

describe('bucket', () => {
  it('maps detector verdicts the same way the backend does', () => {
    expect(bucket('Server-Side Rendered (SSR)')).toBe('SSR');
    expect(bucket('Likely CSR/SPA')).toBe('CSR');
    expect(bucket('Hybrid/Mixed Rendering')).toBe('HYBRID');
    expect(bucket('???')).toBe('ERROR');
  });
});

describe('buildState / excerpt', () => {
  it('collapses whitespace and truncates long text', () => {
    expect(excerpt('  a \n\n b  ')).toBe('a b');
    expect(excerpt('x'.repeat(20), 5)).toBe('xxxxx …[truncated]');
  });

  it('names every field the questions refer to', () => {
    const state = buildState({ url: 'https://a.test', initialText: 'hi', initialBodyMarkup: '<div id="root"></div>', renderedText: 'Hello' });
    const questions = JSON.stringify(buildQuestions());
    for (const field of ['initial_html_text', 'initial_body_markup', 'rendered_text']) {
      expect(state).toHaveProperty(field);
      expect(questions).toContain(`\`${field}\``);
    }
  });

  it('keeps the audit request byte-identical to the origin/main snapshot', () => {
    const state = buildState({
      url: 'https://snapshot.example/page?q=1',
      initialText: '  A   server response\ncontains content. ',
      initialBodyMarkup: '<main><p>A server response contains content.</p></main>',
      renderedText: 'A server response contains content.',
    });

    const request = JSON.stringify({ model: MODEL, state, questions: buildQuestions() });
    expect(request).toBe(
      '{"model":"jev-latest","state":{"url":"https://snapshot.example/page?q=1","initial_html_text":"A server response contains content.","initial_body_markup":"<main><p>A server response contains content.</p></main>","rendered_text":"A server response contains content.","note":"`initial_html_text` and `initial_body_markup` come from the HTML the server sent, before any JavaScript ran. `rendered_text` is what a visitor sees after JavaScript ran. Long values are truncated."},"questions":{"rendering":{"type":"choice","instructions":"How was the main content of this page rendered? Compare `initial_html_text` and `initial_body_markup` with `rendered_text`.","criteria":{"SSR":"The server HTML already contains the main content a visitor sees in `rendered_text`; JavaScript, if any, only adds interactivity or small widgets.","CSR":"The server HTML is an application shell (mount point, scripts, loading placeholder, or only boilerplate such as a noscript notice or cookie banner); the main content in `rendered_text` is produced by JavaScript in the browser.","HYBRID":"The server HTML contains part of the main content, but whole sections of `rendered_text` (not just small widgets) are missing from it and are filled in by JavaScript."}},"content_in_initial_html":{"type":"noul","instructions":"Does `initial_html_text` already contain the main content that a visitor reads in `rendered_text`?","criteria":{"true":"The main text of the page (articles, listings, headings and body copy) is present in the server HTML.","false":"The main text is missing from the server HTML and only appears after JavaScript runs."}},"empty_shell":{"type":"noul","instructions":"Is `initial_body_markup` an empty application shell whose visible content is produced later by JavaScript?"}}}'
    );
  });
});

describe('buildQuestions', () => {
  it('asks the content noul, the shell noul and the rendering choice', () => {
    const q = buildQuestions();
    expect(q.content_in_initial_html.type).toBe('noul');
    expect(q.empty_shell.type).toBe('noul');
    expect(Object.keys(q.rendering.criteria)).toEqual(['SSR', 'CSR', 'HYBRID']);
  });
});

describe('readJev / compare', () => {
  it('derives the bucket from the content noul in code, not from the choice', () => {
    const jev = readJev(response(0.84, 'CSR'));
    expect(jev).toMatchObject({ bucket: 'SSR', choice: 'CSR', emptyShell: 0.95, inputTokens: 1200 });
    expect(jev.confidence).toBeCloseTo(0.68);
  });

  it('flags a confident disagreement for review', () => {
    const jev = readJev(response(0.05));
    expect(jev.bucket).toBe('CSR');
    expect(compare('SSR', jev)).toBe('review');
    expect(compare('CSR', jev)).toBe('agree');
  });

  it('marks low-confidence disagreements as unsure and accepts HYBRID vs SSR', () => {
    expect(compare('CSR', readJev(response(0.64)))).toBe('unsure');
    expect(compare('HYBRID', readJev(response(0.9)))).toBe('agree');
  });
});

describe('grade', () => {
  it('returns null without ground truth', () => {
    expect(grade('SSR', [])).toBeNull();
    expect(grade('SSR', ['SSR', 'HYBRID'])).toBe(true);
    expect(grade('CSR', ['SSR'])).toBe(false);
  });
});

describe('parseUrlList', () => {
  it('reads urls, optional expected buckets and skips comments', () => {
    expect(parseUrlList('# list\nhttps://a.test ssr|hybrid\n\nhttps://b.test  # no label\n')).toEqual([
      { url: 'https://a.test', expected: ['SSR', 'HYBRID'] },
      { url: 'https://b.test', expected: [] },
    ]);
  });
});

describe('askJev', () => {
  const ok = (body) => ({ ok: true, status: 200, json: async () => body });

  it('posts state and questions with the bearer key', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(ok(response('SSR')));
    await askJev({ url: 'x' }, { apiKey: 'k', fetchImpl });
    const [url, init] = fetchImpl.mock.calls[0];
    expect(url).toBe(API_URL);
    expect(init.headers.Authorization).toBe('Bearer k');
    const body = JSON.parse(init.body);
    expect(body.model).toBe('jev-latest');
    expect(Object.keys(body.questions)).toContain('rendering');
  });

  it('retries 429 using retry-after, then succeeds', async () => {
    const sleep = vi.fn().mockResolvedValue();
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce({ ok: false, status: 429, headers: { get: () => '2' }, text: async () => '' })
      .mockResolvedValueOnce(ok(response('SSR')));
    await askJev({}, { apiKey: 'k', fetchImpl, sleep });
    expect(sleep).toHaveBeenCalledWith(2000);
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  it('fails fast on 4xx and without a key', async () => {
    const fetchImpl = vi.fn().mockResolvedValue({ ok: false, status: 401, headers: { get: () => null }, text: async () => 'bad key' });
    await expect(askJev({}, { apiKey: 'k', fetchImpl })).rejects.toThrow('TypeSafe API 401: bad key');
    await expect(askJev({}, { apiKey: '' })).rejects.toThrow('TYPESAFE_API_KEY');
  });
});
