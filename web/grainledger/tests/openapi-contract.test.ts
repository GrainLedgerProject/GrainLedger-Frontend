import { beforeEach, describe, expect, it, vi } from 'vitest';
import spec from '../openapi/v1.json';
import { apiManifest } from '@/api/generated/manifest';
import { buildApiRequest, requestApi } from '@/api/openapi';
import { apiFetch } from '@/api/client';
import { planningEndpoints } from '@/api/planning';
import { residueEndpoints } from '@/api/residue';
import { exportEndpoints } from '@/api/exports';

vi.mock('@/api/client', () => ({ apiFetch: vi.fn() }));
beforeEach(() => vi.mocked(apiFetch).mockResolvedValue({}));

describe('Checked-in OpenAPI contract', () => {
  it('covers every documented method/path and removes obsolete operations', () => {
    const methods = ['get', 'post', 'put', 'patch', 'delete', 'head', 'options', 'trace'];
    const operations = Object.entries(spec.paths).flatMap(([path, item]) => Object.keys(item).filter(method => methods.includes(method)).map(method => `${method.toUpperCase()} ${path}`));
    expect(Object.keys(apiManifest).sort()).toEqual(operations.sort());
    expect(apiManifest).not.toHaveProperty('POST /api/residue-matrix/publish');
  });

  it('encodes path segments, repeats array query parameters, and preserves cancellation', () => {
    const controller = new AbortController();
    const { url, init } = buildApiRequest('GET /api/ledger/planning-quality-observations', { query: { ownerId: 'owner', facilityId: 'facility', lotIds: ['one', 'two'] }, signal: controller.signal });
    expect(new URLSearchParams(url.split('?')[1]).getAll('lotIds')).toEqual(['one', 'two']);
    expect(init.signal).toBe(controller.signal);
    expect(buildApiRequest('GET /api/blend-plans/{id}/decision', { path: { id: 'part/with?query' } }).url).toBe('/api/blend-plans/part%2Fwith%3Fquery/decision');
  });

  it('requires concurrency headers and bodies and keeps OAuth as browser navigation', () => {
    expect(() => buildApiRequest('PUT /api/admin/users/{id}/access', { path: { id: 'user' }, headers: { 'If-Match': '' }, body: { role: null, organizationId: null, isActive: true } })).toThrow('If-Match');
    // Exercise the runtime guard for JavaScript callers that bypass TypeScript.
    expect(() => Reflect.apply(buildApiRequest, null, ['POST /api/blend-plans/{id}/approve', { path: { id: 'plan' } }])).toThrow('body');
    expect(() => requestApi('GET /api/auth/google')).toThrow('browser redirects');
  });

  it.each(['approvePlan', 'rejectPlan', 'revokePlan'] as const)('sends exact proposal and decision version through %s', async method => {
    const request = { operationId: 'operation', proposalId: 'proposal', expectedDecisionVersion: 7, reason: 'Reviewed reason' };
    await planningEndpoints[method]('plan/1', request);
    const [url, init] = vi.mocked(apiFetch).mock.calls.at(-1)!;
    expect(url).toBe(`/api/blend-plans/plan%2F1/${method.replace('Plan', '')}`);
    expect(init?.method).toBe('POST');
    expect(JSON.parse(String(init?.body))).toEqual(request);
  });

  it('uses the replacement profile retirement route with a reason', async () => {
    await residueEndpoints.retireRule('rule/1', { reason: 'Replaced by reviewed profile' });
    expect(apiFetch).toHaveBeenCalledWith('/api/residue-rules/rule%2F1/retire', expect.objectContaining({ method: 'POST', body: JSON.stringify({ reason: 'Replaced by reviewed profile' }) }));
  });

  it('passes backend-required candidate scope and paginates export lists', async () => {
    await exportEndpoints.getCandidateResiduePreview('container', 'lot', { facilityId: 'facility', locationId: 'location', candidateRevision: 'rev +1', substanceIds: 'a,b' });
    const [url] = vi.mocked(apiFetch).mock.calls.at(-1)!;
    expect(new URLSearchParams(url.split('?')[1]).get('candidateRevision')).toBe('rev +1');
    expect(new URLSearchParams(url.split('?')[1]).get('facilityId')).toBe('facility');
    await planningEndpoints.getBlendPlans('container', { page: 2, pageSize: 20 });
    expect(apiFetch).toHaveBeenLastCalledWith('/api/export-containers/container/blend-plans?page=2&pageSize=20');
  });
});
