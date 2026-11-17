// Web HoldManagementPage + focused InitialSchema ledger_read/hold/hold_response contracts.
import { z } from 'zod';
import type { AuthUser } from '../auth/contracts';
import type { ApiClient } from '../../services/api/http-client';
import { ApiError } from '../../services/api/errors';
import { contract, dateTime, endpointId, idSchema, nullableText as n, pageNumber, permission, scopedApi, uniqueBy } from './api-common';

export const holdSchema = z.object({ id: idSchema, lotId: idSchema, lotCode: z.string(), reason: z.string(), status: z.string(), ownerId: idSchema,
  ownerName: z.string(), evidenceId: idSchema.nullable(), response: n, createdAt: dateTime });
export type Hold = z.infer<typeof holdSchema>;
export const mayReadHolds = (user: AuthUser) => user.isActive && ['MILL_MANAGER', 'CUSTOMER_MANAGER', 'CUSTOMER_EXPORT_OFFICER', 'MILL_ADMIN'].includes(user.normalizedRole);
export const mayCreateHold = (user: AuthUser) => user.normalizedRole === 'CUSTOMER_MANAGER' && permission(user, 'holds.manage');
export const mayRespondHold = (user: AuthUser) => user.normalizedRole === 'MILL_MANAGER' && permission(user, 'holds.process');
export const holdCreateInput = z.object({ lotId: idSchema, lotCode: z.string().optional(), reasonCode: z.string().trim().min(1), notes: z.string().trim().min(1) });
export const holdRespondInput = z.object({ evidenceId: idSchema, status: z.enum(['ACKNOWLEDGED', 'ISOLATED', 'RESPONDED']), response: z.string().trim().min(1), notes: z.string().trim().min(1) });
export type HoldCommand = { kind: 'create'; data: z.infer<typeof holdCreateInput> & { operationId: string; reason: string; issuedAt: string } }
  | { kind: 'respond'; id: string; data: z.infer<typeof holdRespondInput> & { operationId: string; responseKind: 'TRANSFER_QUARANTINE'; respondedAt: string } };
export function createHoldCommand(input: unknown, uuid: () => string, now: () => string): HoldCommand {
  const data = contract(holdCreateInput, input);
  return { kind: 'create', data: { ...data, operationId: uuid(), reason: data.notes, issuedAt: now() } };
}
export function respondHoldCommand(id: string, input: unknown, uuid: () => string, now: () => string): HoldCommand {
  return { kind: 'respond', id, data: { ...contract(holdRespondInput, input), operationId: uuid(), responseKind: 'TRANSFER_QUARANTINE', respondedAt: now() } };
}
export function createHoldsService(api: ApiClient, user: AuthUser, current: () => boolean) {
  const transport = scopedApi(api, user, current);
  return {
    async list(page: number, signal: AbortSignal) {
      transport.check(signal, mayReadHolds(user));
      const result = contract(z.object({ items: z.array(holdSchema), page: z.number().int().positive(), pageSize: z.number().int().positive(), totalCount: z.number().int().nonnegative(), hasMore: z.boolean() }),
        await transport.request('/api/ledger/holds', { query: { page: pageNumber(page), pageSize: 50 }, signal }, mayReadHolds(user)));
      if (result.page !== page) throw new ApiError('Mismatched hold page.', 0, 'contract'); uniqueBy(result.items, (item) => item.id); return result;
    },
    async execute(command: HoldCommand, signal: AbortSignal) {
      transport.check(signal, mayReadHolds(user));
      contract(idSchema, command.data.operationId);
      if (command.kind === 'create') { contract(holdCreateInput, command.data); contract(dateTime, command.data.issuedAt);
        if (command.data.reason !== command.data.notes) throw new ApiError('Inconsistent hold reason.', 0, 'contract');
        await transport.request('/api/ledger/holds', { method: 'POST', data: command.data, signal }, mayCreateHold(user));
      } else { contract(holdRespondInput, command.data); contract(dateTime, command.data.respondedAt);
        if (command.data.responseKind !== 'TRANSFER_QUARANTINE') throw new ApiError('Unsupported hold response.', 0, 'contract');
        await transport.request(`/api/ledger/holds/${endpointId(command.id)}/respond`, { method: 'POST', data: command.data, signal }, mayRespondHold(user)); }
    },
  };
}
