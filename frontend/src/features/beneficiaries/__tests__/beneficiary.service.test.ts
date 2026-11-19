import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import MockAdapter from 'axios-mock-adapter';
import { apiClient } from '../../../services/api-client';
import { beneficiaryService } from '../services/beneficiary.service';

const mock = new MockAdapter(apiClient);
const envelope = <T,>(data: T) => ({ success: true, message: 'OK', errorCode: null, data, fieldErrors: null, timestamp: new Date().toISOString(), correlationId: null });
describe('beneficiaryService', () => {
  beforeEach(() => mock.reset());
  afterEach(() => mock.reset());
  it('lists paginated beneficiaries with page parameters', async () => {
    const page = { content: [], currentPage: 0, pageSize: 20, totalElements: 0, totalPages: 0, last: true };
    mock.onGet('/beneficiaries').reply(200, envelope(page));
    await expect(beneficiaryService.list(0, 20)).resolves.toEqual(page);
    expect(mock.history.get[0].params).toEqual({ page: 0, size: 20 });
  });
  it('creates a beneficiary and normalizes unauthorized responses', async () => {
    const payload = { beneficiaryType: 'INDIVIDUAL' as const, fullName: 'A. Applicant', identityReference: 'REF-1', email: 'a@example.test', phone: '', address: '', regionCode: '' };
    mock.onPost('/beneficiaries').reply(201, envelope({ id: 'ben-1', ...payload }));
    await expect(beneficiaryService.create(payload)).resolves.toMatchObject({ id: 'ben-1' });
    mock.onGet('/beneficiaries').reply(403, { success: false, errorCode: 'ACCESS_DENIED', message: 'Forbidden' });
    await expect(beneficiaryService.list()).rejects.toMatchObject({ errorCode: 'ACCESS_DENIED', httpStatus: 403 });
  });
});