// Web BlendPlanDecisionsPage and api/exports.ts / planning.ts. No draft creation/proposal generation in group 5.
import { z } from 'zod';
import type { AuthUser } from '../auth/contracts';
import type { ApiClient } from '../../services/api/http-client';
import { ApiError } from '../../services/api/errors';
import { contract, dateTime, decimalText as dec, endpointId, nullableText as n, pageNumber, permission, scopedApi, uniqueBy } from './api-common';
const id = z.string().min(1);
const version = z.number().int().nonnegative();
export const orderSchema = z.object({ id, code: z.string(), marketId: id, commodityId: id, requiredMassKg: dec, shippingFrom: z.string(), shippingTo: z.string(), createdAt: dateTime, version });
export const containerSchema = z.object({ id, orderId: id, internalCode: z.string(), targetMassKg: dec, originalMass: dec, originalUnit: z.string(), status: z.string(), version });
export const planSchema = z.object({ id, orderId: id, containerId: id, specificationId: id, versionNo: version, version, status: z.string(), targetMassKg: dec,
  targetProductIdentity: n, demandSnapshot: z.string(), createdAt: dateTime, cancelledAt: z.string().nullable(), demandCurrent: z.boolean(), canCancel: z.boolean(), hasProposal: z.boolean() });
export const proposalSchema = z.object({ id, planId: id, previewId: id, proposedAt: dateTime, assessment: z.unknown(), demandCurrent: z.boolean(),
  stockAndEvidenceCurrent: z.boolean().nullable(), freshness: z.enum(['CURRENT', 'STALE', 'NOT_RECHECKED']), freshnessReasons: z.array(z.string()), stockReserved: z.boolean() });
const amounts = { reservedKg: dec, releasedKg: dec, consumedKg: dec, remainingKg: dec };
export const decisionSchema = z.object({ planId: id, proposalId: id, status: z.enum(['PENDING', 'APPROVED', 'REJECTED', 'REVOKED']), decisionVersion: version,
  actorId: n, recordedAt: n, reason: n, activeApproval: z.boolean(), reservation: z.object({ ...amounts, status: z.enum(['NOT_RESERVED', 'HELD', 'CONSUMED', 'RELEASED', 'SETTLED']),
    lines: z.array(z.object({ ...amounts, lotId: id, locationId: n })) }) });
export const assessmentSchema = z.object({ assessmentStatus: z.string(), predictedOutputKg: dec.nullish(),
  selection: z.object({ allocations: z.array(z.object({ lotId: id, locationId: id, lotCode: z.string(), quantityKg: dec })) }).nullish() });
export type Plan = z.infer<typeof planSchema>;
export type Proposal = z.infer<typeof proposalSchema>;
export type Decision = z.infer<typeof decisionSchema>;
export const mayReadDecisions = (user: AuthUser) => user.isActive && ['CUSTOMER_MANAGER', 'CUSTOMER_EXPORT_OFFICER', 'MILL_ADMIN'].includes(user.normalizedRole);
export const mayDecide = (user: AuthUser) => mayReadDecisions(user) && permission(user, 'blend.approve');
export function canApprove(proposal: Proposal, decision: Decision) {
  const assessment = assessmentSchema.safeParse(proposal.assessment);
  return decision.status === 'PENDING' && proposal.freshness === 'CURRENT' && decision.proposalId === proposal.id && proposal.demandCurrent &&
    proposal.stockAndEvidenceCurrent === true && assessment.success && assessment.data.assessmentStatus === 'PASS';
}
export type DecisionAction = 'approve' | 'reject' | 'revoke';
export type DecisionCommand = { action: DecisionAction; planId: string; proposal: Proposal; decision: Decision;
  data: { operationId: string; proposalId: string; expectedDecisionVersion: number; reason?: string } };
export function makeDecision(action: DecisionAction, plan: Plan, proposal: Proposal, decision: Decision, reason: string, uuid: () => string): DecisionCommand {
  const allowed = action === 'approve' ? canApprove(proposal, decision) : action === 'reject' ? decision.status === 'PENDING' : decision.status === 'APPROVED' && decision.activeApproval;
  if (!allowed || !plan.hasProposal || plan.id !== proposal.planId || plan.id !== decision.planId || decision.proposalId !== proposal.id || (action !== 'approve' && !reason.trim())) throw new ApiError('Decision requires current matching proposal and reason.', 409, 'http');
  if (reason.length > 1000) throw new ApiError('Reason exceeds 1000 characters.', 0, 'contract');
  return { action, planId: plan.id, proposal, decision, data: { operationId: uuid(), proposalId: decision.proposalId, expectedDecisionVersion: decision.decisionVersion,
    ...(action === 'approve' ? {} : { reason: reason.trim() }) } };
}
function parsePage<T extends { id: string }>(schema: z.ZodType<T>, value: unknown, page: number) {
  const result = contract(z.object({ items: z.array(schema), page: z.number().int().positive(), pageSize: z.number().int().positive(), totalCount: z.number().int().nonnegative(), hasMore: z.boolean() }), value);
  if (result.page !== page) throw new ApiError('Mismatched decision list page.', 0, 'contract'); uniqueBy(result.items, (row) => row.id); return result;
}
export function createDecisionService(api: ApiClient, user: AuthUser, current: () => boolean) {
  const transport = scopedApi(api, user, current);
  return {
    async orders(page: number, signal: AbortSignal) { return parsePage(orderSchema, await transport.request('/api/export-orders', { query: { page: pageNumber(page), pageSize: 20 }, signal }, mayReadDecisions(user)), page); },
    async containers(orderId: string, page: number, signal: AbortSignal) {
      const result = parsePage(containerSchema, await transport.request(`/api/export-orders/${endpointId(orderId)}/containers`, { query: { page: pageNumber(page), pageSize: 20 }, signal }, mayReadDecisions(user)), page);
      if (result.items.some((row) => row.orderId !== orderId)) throw new ApiError('Mismatched container scope.', 0, 'contract'); return result;
    },
    async plans(containerId: string, page: number, signal: AbortSignal) {
      const result = parsePage(planSchema, await transport.request(`/api/export-containers/${endpointId(containerId)}/blend-plans`, { query: { page: pageNumber(page), pageSize: 20 }, signal }, mayReadDecisions(user)), page);
      if (result.items.some((row) => row.containerId !== containerId)) throw new ApiError('Mismatched plan scope.', 0, 'contract'); return result;
    },
    async detail(planId: string, signal: AbortSignal) {
      const path = `/api/blend-plans/${endpointId(planId)}`;
      const plan = contract(planSchema, await transport.request(path, { signal }, mayReadDecisions(user)));
      if (plan.id !== planId) throw new ApiError('Mismatched plan.', 0, 'contract');
      if (!plan.hasProposal) return { plan, proposal: null, decision: null };
      const [proposalValue, decisionValue] = await Promise.all([
        transport.request(`${path}/proposal`, { signal }, mayReadDecisions(user)), transport.request(`${path}/decision`, { signal }, mayReadDecisions(user))]);
      const proposal = contract(proposalSchema, proposalValue); const decision = contract(decisionSchema, decisionValue);
      if (proposal.planId !== planId || decision.planId !== planId || decision.proposalId !== proposal.id) throw new ApiError('Proposal and decision changed. Reload.', 409, 'http');
      return { plan, proposal, decision };
    },
    async execute(command: DecisionCommand, signal: AbortSignal) {
      transport.check(signal, mayDecide(user));
      contract(proposalSchema, command.proposal); contract(decisionSchema, command.decision);
      if (!['approve', 'reject', 'revoke'].includes(command.action)) throw new ApiError('Invalid action.', 0, 'contract');
      const allowed = command.action === 'approve' ? canApprove(command.proposal, command.decision) : command.action === 'reject' ? command.decision.status === 'PENDING' : command.decision.status === 'APPROVED' && command.decision.activeApproval;
      if (!allowed || command.planId !== command.proposal.planId || command.planId !== command.decision.planId || command.decision.proposalId !== command.proposal.id || command.data.proposalId !== command.proposal.id || command.data.expectedDecisionVersion !== command.decision.decisionVersion ||
        (command.action !== 'approve' && !command.data.reason?.trim())) throw new ApiError('Stale decision context.', 409, 'http');
      const data = contract(z.object({ operationId: z.uuid(), proposalId: id, expectedDecisionVersion: version, reason: z.string().trim().min(1).max(1000).optional() }), command.data);
      await transport.request(`/api/blend-plans/${endpointId(command.planId)}/${command.action}`, { method: 'POST', data, signal }, mayDecide(user));
    },
  };
}
