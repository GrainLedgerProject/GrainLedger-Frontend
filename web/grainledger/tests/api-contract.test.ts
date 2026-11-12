import { readFileSync } from 'node:fs';
import { describe, expect, it, vi } from 'vitest';
import { apiManifest } from '@/api/generated/manifest';
import { buildApiRequest, requestApi, type ApiOperation } from '@/api/openapi';
import { apiFetch } from '@/api/client';
import { exportEndpoints } from '@/api/exports';
import { planningEndpoints } from '@/api/planning';
import { authApi } from '@/features/auth/api/authApi';

vi.mock('@/api/client', () => ({ apiFetch: vi.fn() }));

interface SpecOperation {
  parameters?: Array<{ name: string; in: string; required?: boolean; schema?: { type?: string } }>;
  requestBody?: { required?: boolean };
}
const spec = JSON.parse(readFileSync('openapi/v1.json', 'utf8')) as {
  paths: Record<string, Record<string, SpecOperation>>;
  components: { schemas: Record<string, unknown> };
};

describe('OpenAPI coverage and request serialization', () => {
  it('covers every documented operation, with no invented endpoints', () => {
    const expected: string[] = [];
    for (const [path, item] of Object.entries(spec.paths)) {
      for (const method of Object.keys(item)) {
        if (['get', 'post', 'put', 'patch', 'delete', 'head', 'options'].includes(method)) expected.push(`${method.toUpperCase()} ${path}`);
      }
    }
    expect(Object.keys(apiManifest).sort()).toEqual(expected.sort());
    expect(expected).toHaveLength(212);
    expect(Object.keys(spec.components.schemas)).toHaveLength(96);
  });

  it('builds the method, path, required headers and body for every operation', () => {
    const build = buildApiRequest as (key: ApiOperation, options: {
      path: Record<string, string>;
      query: Record<string, string | string[]>;
      headers: Record<string, string>;
      body?: object;
    }) => ReturnType<typeof buildApiRequest>;
    for (const [path, item] of Object.entries(spec.paths)) {
      for (const [method, operation] of Object.entries(item)) {
        const key = `${method.toUpperCase()} ${path}` as ApiOperation;
        if (!(key in apiManifest)) continue;
        const options: Parameters<typeof build>[1] = { path: {}, query: {}, headers: {} };
        for (const parameter of operation.parameters ?? []) {
          if (!parameter.required) continue;
          if (parameter.in === 'path') options.path[parameter.name] = 'id/with space';
          if (parameter.in === 'header') options.headers[parameter.name] = '"version-1"';
          if (parameter.in === 'query') options.query[parameter.name] = parameter.schema?.type === 'array' ? ['one', 'two'] : 'value';
        }
        if (operation.requestBody) options.body = {};
        const result = build(key, options);
        expect(result.init.method, key).toBe(method.toUpperCase());
        expect(result.url.split('?')[0], key).toBe(path.replace(/\{[^}]+\}/g, 'id%2Fwith%20space'));
        expect(result.init.body, key).toBe(operation.requestBody ? '{}' : undefined);
        expect(result.url, key).not.toContain('{');
      }
    }
  });

  it('preserves query casing and omits undefined without losing zero', () => {
    const { url } = buildApiRequest('GET /api/ledger/trace/starts', { query: { Mode: 'pools', Search: 'rice & grain', Page: 0, PageSize: undefined } });
    expect(url).toBe('/api/ledger/trace/starts?Mode=pools&Search=rice+%26+grain&Page=0');
  });

  it('repeats array query values according to OpenAPI form/explode', () => {
    const { url } = buildApiRequest('GET /api/ledger/planning-quality-observations', { query: { ownerId: 'owner', facilityId: 'mill', lotIds: ['a/b', 'c d'] } });
    expect(url).toBe('/api/ledger/planning-quality-observations?ownerId=owner&facilityId=mill&lotIds=a%2Fb&lotIds=c+d');
  });

  it('enforces If-Match and preserves nullable required properties', () => {
    const body = { role: null, organizationId: null, isActive: false };
    const { init } = buildApiRequest('PUT /api/admin/users/{id}/access', { path: { id: 'user' }, headers: { 'If-Match': '"etag-1"' }, body });
    expect(new Headers(init.headers).get('If-Match')).toBe('"etag-1"');
    expect(JSON.parse(String(init.body))).toEqual(body);
    expect(() => buildApiRequest('PUT /api/admin/users/{id}/access', { path: { id: 'user' }, headers: { 'If-Match': '' }, body })).toThrow('If-Match');
  });

  it('passes AbortSignal and delegates new domain endpoints to the shared transport', async () => {
    vi.mocked(apiFetch).mockResolvedValue({ id: 'order' });
    const controller = new AbortController();
    await requestApi('GET /api/export-orders/{id}', { path: { id: 'a/b' }, signal: controller.signal });
    expect(apiFetch).toHaveBeenLastCalledWith('/api/export-orders/a%2Fb', expect.objectContaining({ method: 'GET', signal: controller.signal }));
    await exportEndpoints.getCandidates('container');
    expect(apiFetch).toHaveBeenLastCalledWith('/api/export-containers/container/candidates', expect.any(Object));
    await planningEndpoints.cancelDraft('plan', { operationId: 'operation' });
    expect(apiFetch).toHaveBeenLastCalledWith('/api/blend-plans/plan/cancel', expect.objectContaining({ method: 'POST', body: '{"operationId":"operation"}' }));
  });

  it('keeps browser redirect operations out of JSON fetch', () => {
    expect(buildApiRequest('GET /api/auth/google', { query: { returnUrl: '/home?a=b' } }).url).toBe('/api/auth/google?returnUrl=%2Fhome%3Fa%3Db');
    expect(() => requestApi('GET /api/auth/google')).toThrow('browser redirects');
  });

  it('does not report a successful profile update when the backend rejects it', async () => {
    const failure = new Error('Profile update rejected');
    vi.mocked(apiFetch).mockRejectedValueOnce(failure);
    await expect(authApi.updateProfile({ displayName: 'User' })).rejects.toBe(failure);
  });
});
