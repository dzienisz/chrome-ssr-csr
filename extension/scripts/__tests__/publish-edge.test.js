import { describe, it, expect, vi } from 'vitest';
import { API_ROOT, operationIdFrom, publishToEdge } from '../publish-edge.mjs';

const PRODUCT = 'd34f98f5-f9b7-42b1-bebb-98707202b21d';
const product = `${API_ROOT}/v1/products/${PRODUCT}`;

const accepted = (operationId) => ({
  status: 202,
  ok: true,
  headers: { get: (name) => (name.toLowerCase() === 'location' ? operationId : null) },
  text: async () => '',
});
const status = (body) => ({ status: 200, ok: true, json: async () => body });

function fakeApi(routes) {
  const calls = [];
  const fetchImpl = vi.fn(async (url, init = {}) => {
    calls.push({ url, ...init });
    const queue = routes[`${init.method || 'GET'} ${url}`];
    if (!queue || queue.length === 0) throw new Error(`unexpected ${init.method || 'GET'} ${url}`);
    return queue.shift();
  });
  return { fetchImpl, calls };
}

const run = (fetchImpl, extra = {}) =>
  publishToEdge({
    productId: PRODUCT,
    clientId: 'client-id',
    apiKey: 'api-key',
    zip: Buffer.from('zip'),
    notes: 'v4.3.0',
    fetchImpl,
    sleep: async () => {},
    log: () => {},
    ...extra,
  });

describe('operationIdFrom', () => {
  it('accepts a bare id or a URL path', () => {
    expect(operationIdFrom('abc-123')).toBe('abc-123');
    expect(operationIdFrom(`${product}/submissions/operations/abc-123/`)).toBe('abc-123');
  });

  it('rejects a missing Location header', () => {
    expect(() => operationIdFrom(null)).toThrow(/no operation id/);
  });
});

describe('publishToEdge', () => {
  it('uploads, waits for validation, then publishes with v1.1 API-key headers', async () => {
    const { fetchImpl, calls } = fakeApi({
      [`POST ${product}/submissions/draft/package`]: [accepted('up-1')],
      [`GET ${product}/submissions/draft/package/operations/up-1`]: [
        status({ status: 'InProgress' }),
        status({ status: 'Succeeded', message: 'Successfully updated package' }),
      ],
      [`POST ${product}/submissions`]: [accepted('pub-1')],
      [`GET ${product}/submissions/operations/pub-1`]: [
        status({ status: 'Succeeded', message: 'Successfully created submission with ID 42' }),
      ],
    });

    const result = await run(fetchImpl);

    expect(result).toEqual({
      uploadOperation: 'up-1',
      publishOperation: 'pub-1',
      message: 'Successfully created submission with ID 42',
    });
    expect(calls).toHaveLength(5);
    for (const call of calls) {
      expect(call.headers.Authorization).toBe('ApiKey api-key');
      expect(call.headers['X-ClientID']).toBe('client-id');
    }
    for (const call of calls) expect(call.signal).toBeInstanceOf(AbortSignal);
    expect(calls[0].headers['Content-Type']).toBe('application/zip');
    expect(JSON.parse(calls[3].body)).toEqual({ notes: 'v4.3.0' });
  });

  it('does not publish when package validation fails', async () => {
    const { fetchImpl, calls } = fakeApi({
      [`POST ${product}/submissions/draft/package`]: [accepted('up-1')],
      [`GET ${product}/submissions/draft/package/operations/up-1`]: [
        status({
          status: 'Failed',
          errorCode: 'InvalidPackage',
          message: 'Package validation failed',
          errors: [{ message: 'manifest.json: version must increase' }],
        }),
      ],
    });

    await expect(run(fetchImpl)).rejects.toThrow(
      /upload failed \[InvalidPackage\]: Package validation failed\n {2}manifest.json: version must increase/,
    );
    expect(calls.some((c) => c.url === `${product}/submissions`)).toBe(false);
  });

  it('surfaces a submission that is still in review', async () => {
    const { fetchImpl } = fakeApi({
      [`POST ${product}/submissions/draft/package`]: [accepted('up-1')],
      [`GET ${product}/submissions/draft/package/operations/up-1`]: [status({ status: 'Succeeded' })],
      [`POST ${product}/submissions`]: [accepted('pub-1')],
      [`GET ${product}/submissions/operations/pub-1`]: [
        status({
          status: 'Failed',
          errorCode: 'InProgressSubmission',
          message: "Can't publish extension as your extension submission is in progress.",
        }),
      ],
    });

    await expect(run(fetchImpl)).rejects.toThrow(/publish failed \[InProgressSubmission\]/);
  });

  it('reports a non-202 upload response', async () => {
    const fetchImpl = vi.fn(async () => ({ status: 401, ok: false, text: async () => 'Unauthorized' }));
    await expect(run(fetchImpl)).rejects.toThrow('Edge upload request returned HTTP 401: Unauthorized');
  });

  it('gives up after maxPolls', async () => {
    const { fetchImpl } = fakeApi({
      [`POST ${product}/submissions/draft/package`]: [accepted('up-1')],
      [`GET ${product}/submissions/draft/package/operations/up-1`]: [
        status({ status: 'InProgress' }),
        status({ status: 'InProgress' }),
      ],
    });
    await expect(run(fetchImpl, { maxPolls: 2 })).rejects.toThrow(/still in progress after 2 checks/);
  });

  it('times out a request that never answers', async () => {
    const fetchImpl = vi.fn(
      (url, { signal }) =>
        new Promise((resolve, reject) => {
          signal.addEventListener('abort', () => reject(signal.reason));
        }),
    );
    await expect(run(fetchImpl, { timeoutMs: 20 })).rejects.toThrow('Edge upload request timed out after 0.02s');
  });

  it('requires all three credentials', async () => {
    await expect(run(vi.fn(), { apiKey: '' })).rejects.toThrow(/EDGE_API_KEY/);
  });
});
