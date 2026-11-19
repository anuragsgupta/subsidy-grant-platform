import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import MockAdapter from 'axios-mock-adapter';
import { apiClient } from '../../../services/api-client';
import { applicationService } from '../services/application.service';

const mock = new MockAdapter(apiClient);
const envelope = <T,>(data: T) => ({ success: true, message: 'OK', errorCode: null, data, fieldErrors: null, timestamp: new Date().toISOString(), correlationId: null });
const application = { id: 'app-1', referenceNo: 'GSDTS-1', beneficiaryId: 'ben-1', beneficiaryFullName: 'A. Applicant', schemeId: 'scheme-1', schemeName: 'Farm grant', schemeCode: 'FARM', requestedAmount: 1200, status: 'SUBMITTED' as const, submittedAt: null, createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z' };

describe('applicationService', () => {
  beforeEach(() => mock.reset());
  afterEach(() => mock.reset());
  it('posts the application payload and unwraps the API envelope', async () => {
    mock.onPost('/applications').reply(201, envelope(application));
    await expect(applicationService.create({ beneficiaryId: 'ben-1', schemeId: 'scheme-1', referenceNo: 'GSDTS-1', requestedAmount: 1200 })).resolves.toEqual(application);
    expect(mock.history.post[0].data).toContain('"requestedAmount":1200');
  });
  it('updates workflow status via the backend status endpoint', async () => {
    mock.onPatch('/applications/app-1/status').reply(200, envelope({ ...application, status: 'FIELD_VERIFIED' }));
    await expect(applicationService.setStatus('app-1', 'FIELD_VERIFIED')).resolves.toMatchObject({ status: 'FIELD_VERIFIED' });
    expect(mock.history.patch[0].data).toBe('{"status":"FIELD_VERIFIED"}');
  });
  it('normalizes validation failures as ApiError', async () => {
    mock.onPost('/applications').reply(400, { success: false, errorCode: 'VALIDATION_FAILED', message: 'Invalid amount', fieldErrors: [{ field: 'requestedAmount', message: 'must be positive' }] });
    await expect(applicationService.create({ beneficiaryId: 'b', schemeId: 's', referenceNo: 'r', requestedAmount: 0 })).rejects.toMatchObject({ errorCode: 'VALIDATION_FAILED', httpStatus: 400 });
  });
});