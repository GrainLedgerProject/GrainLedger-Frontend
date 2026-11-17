// Source: LabSampleRegistrationPage capture v2 and LAB_DISPATCH handover v1.
import { z } from 'zod';
import type { AuthUser } from '../auth/contracts';
import type { ApiClient } from '../../services/api/http-client';
import { ApiError } from '../../services/api/errors';
import { canViewLabSamples } from './lab-samples-api';

export type SampleForm = { sealCode: string; sourceLotId: string; materialDescription: string };
export type HandoverForm = { fromParty: string; toParty: string; laboratoryName: string; sealCondition: string; evidenceRef: string; laboratorySampleReference?: string; laboratoryReference?: string };
const envelope = { deviceId: z.literal('grainledger-mobile'), clientOperationId: z.string().min(1), capturedAt: z.iso.datetime() };
const commandSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('capture'), data: z.object({ ...envelope, payloadSchemaVersion: z.literal(2), payload: z.object({
    entityId: z.string().min(1), code: z.null(), sealCode: z.string().trim().min(1), sourceLotId: z.string().trim().min(1),
    collectedAt: z.iso.datetime(), materialDescription: z.string().nullable(),
  }) }) }),
  z.object({ kind: z.literal('handover'), id: z.string().min(1), data: z.object({ ...envelope, payloadSchemaVersion: z.literal(1), payload: z.object({
    entityId: z.string().min(1), fromParty: z.string().trim().min(1), toParty: z.string().trim().min(1), handedOverAt: z.iso.datetime(),
    laboratoryName: z.string().trim().min(1), sealCondition: z.string().min(1), evidenceRef: z.string().nullable(), handoverKind: z.literal('LAB_DISPATCH'),
    laboratorySampleReference: z.string().nullable().optional(), laboratoryReference: z.string().nullable().optional(),
  }) }) }),
]);
export type SampleCommand = z.infer<typeof commandSchema>;
export function validComplianceId(id: string) {
  return typeof id === 'string' && Boolean(id.trim()) && id !== '.' && !id.includes('..') && !/[/\\%\u0000-\u001f\u007f]/.test(id);
}
export function sampleFormErrors(form: SampleForm) { return { sealCode: !form.sealCode.trim(), sourceLotId: !form.sourceLotId.trim() }; }
export function handoverFormErrors(form: HandoverForm) {
  return { fromParty: !form.fromParty.trim(), toParty: !form.toParty.trim(), laboratoryName: !form.laboratoryName.trim() };
}
export function captureSample(form: SampleForm, uuid: () => string, now: () => string): SampleCommand {
  const capturedAt = now();
  return commandSchema.parse({ kind: 'capture', data: { deviceId: 'grainledger-mobile', clientOperationId: uuid(), capturedAt, payloadSchemaVersion: 2,
    payload: { entityId: uuid(), code: null, sealCode: form.sealCode.trim(), sourceLotId: form.sourceLotId.trim(), collectedAt: capturedAt,
      materialDescription: form.materialDescription.trim() || null } } });
}
export function recordHandover(id: string, form: HandoverForm, uuid: () => string, now: () => string): SampleCommand {
  const capturedAt = now();
  return commandSchema.parse({ kind: 'handover', id, data: { deviceId: 'grainledger-mobile', clientOperationId: uuid(), capturedAt, payloadSchemaVersion: 1,
    payload: { entityId: uuid(), fromParty: form.fromParty.trim(), toParty: form.toParty.trim(), handedOverAt: capturedAt,
      laboratoryName: form.laboratoryName.trim(), sealCondition: form.sealCondition.trim() || 'Nguyên vẹn', evidenceRef: form.evidenceRef.trim() || null,
      handoverKind: 'LAB_DISPATCH', laboratorySampleReference: form.laboratorySampleReference?.trim() || null, laboratoryReference: form.laboratoryReference?.trim() || null } } });
}
export function createSampleCommands(api: ApiClient, user: AuthUser, current: () => boolean) {
  return async (command: SampleCommand, signal: AbortSignal) => {
    const check = () => {
      if (!canViewLabSamples(user)) throw new ApiError('Sample action denied.', 403, 'http');
      if (!current() || signal.aborted) throw new ApiError('Cancelled.', 0, 'cancelled');
    };
    check();
    const parsed = commandSchema.safeParse(command);
    if (!parsed.success) throw new ApiError('Invalid sample command.', 0, 'contract');
    const value = parsed.data;
    if (value.kind === 'handover' && !validComplianceId(value.id)) throw new ApiError('Invalid sample ID.', 0, 'contract');
    await api.request(value.kind === 'capture' ? '/api/samples' : `/api/samples/${encodeURIComponent(value.id)}/handovers`,
      { method: 'POST', data: value.data, signal });
    check();
  };
}
